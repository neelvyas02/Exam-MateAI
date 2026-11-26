import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';
import {
  AIChatResponse,
  DetailedPaperAnalysisResponse,
  DocumentAIMetadata,
  GeneratedQuizItem,
  IAIProvider,
  PaperAnalysisResponse,
  PaperInputData,
} from './ai.interface.js';
import {
  STUDY_ASSISTANT_SYSTEM_PROMPT,
  cleanAssistantAnswer,
} from './study-assistant-prompt.js';

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI | null = null;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor() {
    this.model = config.ai.openaiModel || 'gpt-4o-mini';
    this.temperature = config.ai.temperature || 0.3;
    this.maxTokens = config.ai.maxTokens || 2048;

    if (config.ai.openaiApiKey) {
      this.client = new OpenAI({
        apiKey: config.ai.openaiApiKey,
      });
    }
  }

  public get isConfigured(): boolean {
    return this.client !== null && !!config.ai.openaiApiKey;
  }

  public async analyzeDocumentMetadata(title: string, content: string): Promise<DocumentAIMetadata> {
    const truncated = content.length > 25000 ? content.substring(0, 25000) : content;

    const systemPrompt = `You are ExamMateAI's expert academic document processor.
Analyze the provided document text and extract structured metadata for university exam preparation.
You MUST output ONLY a valid JSON object matching this schema:
{
  "materialName": string,
  "description": string,
  "materialType": string (one of: "Lecture Slides", "Study Notes", "Textbook Chapter", "Handwritten Notes", "Reference Sheet"),
  "topics": string[],
  "keyConcepts": string[],
  "summary": string,
  "importantPoints": string[],
  "topicConfidence": string ("High" or "Low")
}`;

    const userPrompt = `Document Title: ${title}\n\nDocument Text:\n${truncated}`;

    try {
      const response = await this.callChatCompletion(systemPrompt, userPrompt, true);
      const parsed = JSON.parse(response);
      return {
        materialName: parsed.materialName || title,
        description: parsed.description || `Study material extracted from ${title}.`,
        materialType: parsed.materialType || 'Study Notes',
        topics: Array.isArray(parsed.topics) ? parsed.topics : [title],
        keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
        summary: parsed.summary || 'Academic study material processed and indexed by ExamMateAI.',
        importantPoints: Array.isArray(parsed.importantPoints) ? parsed.importantPoints : ['Review all chapters for exams.'],
        topicConfidence: parsed.topicConfidence || 'High',
      };
    } catch (err: any) {
      logger.warn({ error: err.message }, '[OpenAI] analyzeDocumentMetadata failed, using default metadata.');
      return {
        materialName: title,
        description: `Academic study material extracted from ${title}.`,
        materialType: title.endsWith('.pptx') ? 'Lecture Slides' : 'Study Notes',
        topics: [title],
        keyConcepts: ['Key concepts extracted from syllabus content.'],
        summary: 'Academic study material processed and indexed by ExamMateAI.',
        importantPoints: ['Review all definitions, formulas, and sections.'],
        topicConfidence: 'High',
      };
    }
  }

  public async askQuestion(
    question: string,
    context?: string,
    history?: Array<{ role: string; message: string }>
  ): Promise<AIChatResponse> {
    const systemPrompt = STUDY_ASSISTANT_SYSTEM_PROMPT;

    let userPrompt = '';
    if (context && context.trim().length > 0) {
      userPrompt += `=== STUDY MATERIAL CONTEXT ===\n${context}\n===============================\n\n`;
    } else {
      userPrompt += '[No document context provided — no matching text was found in the uploaded documents]\n\n';
    }

    userPrompt += `Student Question: ${question}\n\nFormat your answer according to the point-wise exam format, bold key concepts, omit repeated "---" dividers, and end with the verified **References** section.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (history && history.length > 0) {
      for (const h of history.slice(-6)) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.message,
        });
      }
    }

    messages.push({ role: 'user', content: userPrompt });

    try {
      const rawResponse = await this.callRawMessages(messages, false);
      const response = cleanAssistantAnswer(rawResponse);
      let citation = '';
      let pageNumber = 1;

      if (context) {
        const slideMatch = context.match(/--- (Slide \d+[^-\n]*) ---/i) || context.match(/Slide (\d+)/i);
        if (slideMatch) {
          citation = slideMatch[0];
          const numMatch = citation.match(/\d+/);
          if (numMatch) pageNumber = parseInt(numMatch[0], 10);
        } else {
          const pageMatch = context.match(/Page (\d+)/i) || context.match(/--- (Page \d+) ---/i);
          if (pageMatch) {
            citation = `Page ${pageMatch[1]}`;
            pageNumber = parseInt(pageMatch[1], 10);
          } else {
            const sectionMatch = context.match(/--- ([^-\n]+) ---/);
            if (sectionMatch) {
              citation = sectionMatch[1];
            }
          }
        }
      }

      const usesGeneralContext =
        response.includes('General Academic Context') ||
        response.toLowerCase().includes('not verified in your uploaded notes') ||
        response.toLowerCase().includes('not covered in the uploaded');

      const notFound =
        response.includes("couldn't find enough information") ||
        response.toLowerCase().includes('could not find enough information');

      return {
        answer: response.trim(),
        sourceCitation: citation || undefined,
        pageNumber: citation ? pageNumber : undefined,
        confidence: notFound ? 0.3 : usesGeneralContext ? 0.6 : 0.95,
      };
    } catch (err: any) {
      logger.error({ error: err.message }, '[OpenAI] askQuestion failed.');
      return {
        answer: `OpenAI study assistant is temporarily unavailable: ${err.message}`,
        confidence: 0.0,
      };
    }
  }

  public async generateSummary(content: string, type: 'Short' | 'Detailed'): Promise<string> {
    const maxLength = 24000;
    const typeDesc =
      type === 'Short'
        ? 'a concise 2-3 paragraph summary highlighting core themes and main concepts'
        : 'a comprehensive section-by-section detailed outline covering key definitions, principles, and exam topics';

    // Long document sectioning if needed
    if (content.length > maxLength) {
      const part1 = content.substring(0, Math.floor(content.length / 2));
      const part2 = content.substring(Math.floor(content.length / 2));

      const sub1 = await this.generateSummary(part1, 'Short');
      const sub2 = await this.generateSummary(part2, 'Short');

      const synthesisPrompt = `Synthesize these two section summaries into a final coherent ${type} summary:\n\nSection 1:\n${sub1}\n\nSection 2:\n${sub2}`;
      return await this.callChatCompletion('You are ExamMateAI summary synthesizer.', synthesisPrompt, false);
    }

    const systemPrompt = `You are ExamMateAI. Generate ${typeDesc} based ONLY on the provided study material.
Do not hallucinate or add facts outside the text. Maintain clear academic structure with headings and bullet points.`;

    try {
      const result = await this.callChatCompletion(systemPrompt, content, false);
      return result.trim();
    } catch (err: any) {
      logger.error({ error: err.message }, '[OpenAI] generateSummary failed.');
      return `Summary generation temporarily unavailable (${type} Summary).`;
    }
  }

  public async analyzePreviousPapers(
    papers: PaperInputData[] | string[],
    notesContext?: string
  ): Promise<DetailedPaperAnalysisResponse> {
    const formattedPapers: PaperInputData[] = (papers as any[]).map((p, idx) => {
      if (typeof p === 'string') {
        return {
          paperName: `Question Paper ${idx + 1}`,
          year: 'Not specified',
          text: p,
        };
      }
      return {
        paperName: p.paperName || `Paper ${idx + 1}`,
        year: p.year || 'Not specified',
        text: p.text || '',
      };
    });

    const combinedPapersText = formattedPapers
      .map(
        (p) =>
          `=== QUESTION PAPER: ${p.paperName} (Exam Year: ${p.year || 'Not specified'}) ===\n${p.text}`
      )
      .join('\n\n----------------------------------------\n\n');

    let fullInput = combinedPapersText;
    if (notesContext && notesContext.trim()) {
      fullInput += `\n\n=== SYLLABUS / STUDY NOTES CONTEXT ===\n${notesContext.substring(0, 8000)}`;
    }

    const truncated = fullInput.length > 25000 ? fullInput.substring(0, 25000) : fullInput;

    const systemPrompt = `You are ExamMateAI's PYQ Question Paper Analyzer.
Analyze the provided examination question papers and extract questions, identify recurring topics, calculate real frequencies, detect repeated/similar questions, and create an evidence-grounded revision plan.
Output ONLY a valid JSON object matching the DetailedPaperAnalysisResponse schema.`;

    try {
      const response = await this.callChatCompletion(systemPrompt, truncated, true);
      const parsed = JSON.parse(response);
      if (parsed && parsed.papers && parsed.topicFrequency) {
        parsed.repeatedTopics = parsed.topicFrequency.map((t: any) => t.topic);
        parsed.highWeightageUnits = parsed.topicFrequency
          .filter((t: any) => t.priority === 'High')
          .map((t: any) => t.topic);
        const freqMap: Record<string, number> = {};
        parsed.topicFrequency.forEach((t: any) => {
          freqMap[t.topic] = t.count;
        });
        parsed.questionFrequency = freqMap;
        return parsed;
      }
    } catch (err: any) {
      logger.error({ error: err.message }, '[OpenAI] analyzePreviousPapers failed.');
    }

    const fallbackPaperItems = formattedPapers.map((p) => ({
      paperName: p.paperName,
      year: p.year || 'Not specified',
      totalMarks: 'Not specified' as const,
      questionsCount: 1,
      topics: ['Extracted Question Paper Topics'],
      questions: [
        {
          number: 'Q1',
          text: p.text.substring(0, 160) || 'Previous year examination question.',
          marks: 'Not specified' as const,
          section: 'Main',
          topic: 'General Topic',
          difficulty: 'Medium' as const,
          sourcePaper: p.paperName,
          year: p.year || 'Not specified',
        },
      ],
    }));

    return {
      summary: {
        papersProcessed: formattedPapers.length,
        totalQuestions: formattedPapers.length,
        topicsIdentified: 1,
        repeatedCount: 0,
      },
      papers: fallbackPaperItems,
      topicFrequency: [
        {
          topic: 'General Exam Topic',
          count: formattedPapers.length,
          totalMarks: 'Not specified',
          papers: formattedPapers.map((p) => p.paperName),
          priority: 'Medium',
          rationale: 'Extracted from uploaded examination papers.',
        },
      ],
      repeatedQuestions: [],
      importantTopics: [
        {
          topic: 'General Exam Topic',
          frequency: formattedPapers.length,
          importanceLevel: 'High',
          reasons: ['Appeared in uploaded previous papers'],
          totalMarks: 'Not specified',
        },
      ],
      revisionPlan: [
        {
          step: 1,
          topic: 'General Exam Topic',
          priority: 'High',
          rationale: 'Core material from uploaded papers.',
          suggestedAction: 'Review definitions and standard exam problems.',
          paperReferences: formattedPapers.map((p) => p.paperName),
        },
      ],
      repeatedTopics: ['General Exam Topic'],
      highWeightageUnits: ['General Exam Topic'],
      questionFrequency: { 'General Exam Topic': formattedPapers.length },
    };
  }

  public async generateQuizQuestions(
    subjectName: string,
    content: string,
    difficulty: string,
    count: number = 5,
    questionType: 'MCQ' | 'TrueFalse' | 'Mixed' = 'MCQ'
  ): Promise<GeneratedQuizItem[]> {
    const truncated = content.length > 20000 ? content.substring(0, 20000) : content;

    const systemPrompt = `You are ExamMateAI Quiz Generator.
Generate exactly ${count} academic quiz questions for '${subjectName}' at '${difficulty}' difficulty level.
Every question MUST be strictly grounded in the provided document content.
Output ONLY a JSON array of objects with schema:
[
  {
    "question": string,
    "questionType": "${questionType === 'TrueFalse' ? 'TrueFalse' : 'MCQ'}",
    "optionA": string,
    "optionB": string,
    "optionC": string,
    "optionD": string,
    "correctAnswer": "A" | "B" | "C" | "D",
    "explanation": string,
    "topic": string,
    "sourceCitation": string,
    "pageNumber": number
  }
]`;

    try {
      const response = await this.callChatCompletion(systemPrompt, truncated, true);
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          ...item,
          questionType: item.questionType || (item.optionC === '' ? 'TrueFalse' : 'MCQ'),
          options: [item.optionA, item.optionB, item.optionC, item.optionD].filter(Boolean),
        }));
      }
    } catch (err: any) {
      logger.error({ error: err.message }, '[OpenAI] generateQuizQuestions failed.');
    }

    return [
      {
        question: `Based on the provided notes for ${subjectName}, which statement represents a core concept?`,
        questionType: 'MCQ',
        options: ['Core foundational principle', 'Unrelated speculation', 'Undefined behavior', 'Arbitrary rule'],
        optionA: 'Core foundational principle',
        optionB: 'Unrelated speculation',
        optionC: 'Undefined behavior',
        optionD: 'Arbitrary rule',
        correctAnswer: 'A',
        explanation: `Document material explains core principles in ${subjectName}.`,
        topic: subjectName,
        sourceCitation: `${subjectName} Overview`,
        pageNumber: 1,
      },
    ];
  }

  private async callChatCompletion(systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string> {
    return this.callRawMessages(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      jsonMode
    );
  }

  private async callRawMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    jsonMode: boolean
  ): Promise<string> {
    if (!this.client || !config.ai.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured on the backend server. Please set OPENAI_API_KEY in ExamMateAI.API/.env or set AI_PROVIDER=gemini.');
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          response_format: jsonMode ? { type: 'json_object' } : undefined,
        });

        return completion.choices[0]?.message?.content || '';
      } catch (err: any) {
        if (err.status === 429 || err.status === 503) {
          logger.warn(`[OpenAI] Rate limit or transient error (${err.status}), retry ${attempt}/3...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          continue;
        }

        if (err.status === 401) {
          throw new Error('Invalid OpenAI API key. Please verify OPENAI_API_KEY in server environment.');
        }

        if (attempt === 3) throw err;
      }
    }

    throw new Error('OpenAI API request failed after 3 attempts.');
  }
}
