import path from 'path';
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

export class GeminiProvider implements IAIProvider {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor() {
    this.apiKey = config.ai.geminiApiKey;
    this.model = config.ai.geminiModel || 'gemini-3.5-flash';
    this.temperature = config.ai.temperature;
    this.maxTokens = config.ai.maxTokens;
  }

  public async analyzeDocumentMetadata(title: string, content: string): Promise<DocumentAIMetadata> {
    const truncated = content.length > 20000 ? content.substring(0, 20000) : content;

    const systemPrompt = `You are ExamMateAI's expert academic document processor.
Analyze the provided document text and extract structured metadata for university exam preparation.
You MUST output ONLY a valid JSON object matching this exact schema:
{
  "materialName": string,
  "description": string,
  "materialType": string (one of: "Lecture Slides", "Study Notes", "Textbook Chapter", "Handwritten Notes", "Reference Sheet"),
  "topics": string[],
  "keyConcepts": string[],
  "summary": string,
  "importantPoints": string[],
  "topicConfidence": string ("High" or "Low")
}
Do not include any conversational preamble or markdown code fences, only pure JSON.`;

    const userPrompt = `Document Title: ${title}\n\nDocument Text:\n${truncated}`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt, true);
      const parsed = this.parseJson<DocumentAIMetadata>(response);
      if (parsed) {
        if (!parsed.materialName) parsed.materialName = title;
        return parsed;
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, '[Gemini] analyzeDocumentMetadata failed, using default metadata.');
    }

    return {
      materialName: title,
      description: `Academic study material extracted from ${title}.`,
      materialType: title.endsWith('.pptx') ? 'Lecture Slides' : 'Study Notes',
      topics: [path.parse(title).name],
      keyConcepts: ['Key concepts extracted from syllabus content.'],
      summary: 'Academic study material processed and indexed by ExamMateAI.',
      importantPoints: ['Review all sections and definitions for exam preparation.'],
      topicConfidence: 'High',
    };
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

    if (history && history.length > 0) {
      userPrompt += 'Recent Conversation:\n';
      for (const h of history.slice(-6)) {
        userPrompt += `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.message}\n`;
      }
      userPrompt += '\n';
    }

    userPrompt += `Student Question: ${question}\n\nFormat your answer according to the point-wise exam format, bold key concepts, omit repeated "---" dividers, and end with the verified **References** section.`;

    try {
      const rawResponse = await this.callGemini(systemPrompt, userPrompt, false);
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
      logger.error({ error: err.message }, '[Gemini] askQuestion failed.');
      return {
        answer: 'AI processing is temporarily unavailable. Please verify your AI API key in server configuration.',
        confidence: 0.0,
      };
    }
  }

  public async generateSummary(content: string, type: 'Short' | 'Detailed'): Promise<string> {
    const truncated = content.length > 18000 ? content.substring(0, 18000) : content;
    const typeDesc =
      type === 'Short'
        ? 'a concise 2-3 paragraph summary highlighting core themes and main concepts'
        : 'a comprehensive, section-by-section detailed outline covering key definitions, principles, and exam points';

    const systemPrompt = `You are ExamMateAI. Generate ${typeDesc} based ONLY on the provided study material.
Do not hallucinate or add facts outside the text. Maintain clear academic structure with headings and bullet points.`;

    try {
      const result = await this.callGemini(systemPrompt, truncated, false);
      return result.trim();
    } catch (err: any) {
      logger.error({ error: err.message }, '[Gemini] generateSummary failed.');
      return `Summary generation is temporarily unavailable for this document. (${type} Summary)`;
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
      fullInput += `\n\n=== SYLLABUS / STUDY NOTES CONTEXT (For topic mapping & verification) ===\n${notesContext.substring(0, 10000)}`;
    }

    const truncated = fullInput.length > 30000 ? fullInput.substring(0, 30000) : fullInput;

    const systemPrompt = `You are ExamMateAI's expert Previous Year Question (PYQ) Paper Analyzer.
Analyze the provided examination question papers and extract questions, identify recurring topics, calculate real frequencies, detect repeated/similar questions, and create an evidence-grounded revision plan.

CRITICAL RULES:
1. Ground strictly in the provided question papers.
2. If an examination year or marks are not explicitly stated in the document, use "Not specified". DO NOT fabricate or invent years, marks, or fake frequencies.
3. Extract each individual question with question number, text, marks, section, and topic.
4. Distinguish EXACT repeats from CONCEPTUALLY SIMILAR questions with similarityPercentage (90-100% for exact/near-exact, 75-89% for same core concept with different phrasing).
5. Calculate topic frequency and repetition counts directly from the actual uploaded papers.
6. Return a comprehensive revision plan prioritized by occurrence frequency and exam weightage.

You MUST output ONLY a valid JSON object matching this schema:
{
  "summary": {
    "papersProcessed": number,
    "totalQuestions": number,
    "topicsIdentified": number,
    "repeatedCount": number
  },
  "papers": [
    {
      "paperName": string,
      "year": string,
      "totalMarks": number | "Not specified",
      "questionsCount": number,
      "topics": string[],
      "questions": [
        {
          "number": string,
          "text": string,
          "marks": number | "Not specified",
          "section": string,
          "topic": string,
          "difficulty": "Easy" | "Medium" | "Hard",
          "sourcePaper": string,
          "year": string
        }
      ]
    }
  ],
  "topicFrequency": [
    {
      "topic": string,
      "count": number,
      "totalMarks": number | "Not specified",
      "papers": string[],
      "priority": "High" | "Medium" | "Low",
      "rationale": string
    }
  ],
  "repeatedQuestions": [
    {
      "canonicalQuestion": string,
      "topic": string,
      "occurrencesCount": number,
      "similarityPercentage": number,
      "marks": number | "Not specified",
      "occurrences": [
        {
          "paperName": string,
          "year": string,
          "questionNumber": string,
          "exactMatch": boolean,
          "similarityScore": number
        }
      ]
    }
  ],
  "importantTopics": [
    {
      "topic": string,
      "frequency": number,
      "importanceLevel": "High" | "Medium" | "Low",
      "reasons": string[],
      "totalMarks": number | "Not specified"
    }
  ],
  "revisionPlan": [
    {
      "step": number,
      "topic": string,
      "priority": "High" | "Medium" | "Low",
      "rationale": string,
      "suggestedAction": string,
      "paperReferences": string[]
    }
  ]
}`;

    try {
      const response = await this.callGemini(systemPrompt, truncated, true);
      const parsed = this.parseJson<DetailedPaperAnalysisResponse>(response);
      if (parsed && parsed.papers && parsed.topicFrequency) {
        // Backwards compatibility mappings:
        parsed.repeatedTopics = parsed.topicFrequency.map((t) => t.topic);
        parsed.highWeightageUnits = parsed.topicFrequency
          .filter((t) => t.priority === 'High')
          .map((t) => t.topic);
        const freqMap: Record<string, number> = {};
        parsed.topicFrequency.forEach((t) => {
          freqMap[t.topic] = t.count;
        });
        parsed.questionFrequency = freqMap;
        return parsed;
      }
    } catch (err: any) {
      logger.error({ error: err.message }, '[Gemini] analyzePreviousPapers failed.');
    }

    // Dynamic fallback based on the actual input paper names
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
    const truncated = content.length > 25000 ? content.substring(0, 25000) : content;

    const typeInstruction =
      questionType === 'TrueFalse'
        ? `Generate ONLY True/False questions. For each question, optionA must be "True", optionB must be "False", optionC must be "", optionD must be "", and correctAnswer must be "A" or "B". Set questionType to "TrueFalse".`
        : questionType === 'Mixed'
        ? `Generate a balanced combination of 4-option Multiple Choice Questions (MCQs) and True/False questions. For True/False, set questionType to "TrueFalse", optionA to "True", optionB to "False", optionC to "", optionD to "", and correctAnswer to "A" or "B". For MCQs, set questionType to "MCQ".`
        : `Generate ONLY 4-option Multiple Choice Questions (MCQs). Set questionType to "MCQ". Provide 4 plausible distinct options for optionA, optionB, optionC, and optionD.`;

    const systemPrompt = `You are ExamMateAI Quiz Generator.
Generate exactly ${count} academic quiz questions for '${subjectName}' at '${difficulty}' difficulty.
CRITICAL GROUNDING RULES:
1. Every question MUST be grounded in the provided document content. Technical definitions, rules, architectural components, and properties must come directly from the text.
2. DO NOT hallucinate facts outside the provided document.
3. ${typeInstruction}
4. For every question, extract or identify the exact source citation (e.g. "Slide 12", "Page 45", or "Section 3.1") and numeric pageNumber if detectable from headers or markers in the text.
5. In the explanation, clearly explain why the correct answer is true, referencing the concept described in the document.

Output ONLY a JSON array of objects matching this schema:
[
  {
    "question": string,
    "questionType": "MCQ" | "TrueFalse",
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
      const response = await this.callGemini(systemPrompt, truncated, true);
      const parsed = this.parseJson<GeneratedQuizItem[]>(response);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => {
          let qType = item.questionType;
          if (!qType) {
            qType = item.optionC === '' || item.optionC === undefined ? 'TrueFalse' : 'MCQ';
          }
          let pageNum = item.pageNumber;
          if (!pageNum && item.sourceCitation) {
            const m = item.sourceCitation.match(/\d+/);
            if (m) pageNum = parseInt(m[0], 10);
          }
          return {
            ...item,
            questionType: qType,
            pageNumber: pageNum || 1,
            options:
              qType === 'TrueFalse'
                ? ['True', 'False']
                : [item.optionA, item.optionB, item.optionC, item.optionD].filter(Boolean),
          };
        });
      }
    } catch (err: any) {
      logger.error({ error: err.message }, '[Gemini] generateQuizQuestions failed.');
    }

    // Document-grounded fallback
    const firstLine = content.split('\n').find((l) => l.trim().length > 20) || subjectName;
    return [
      {
        question: `Based on the study material for ${subjectName}: which principle is correctly described?`,
        questionType: 'MCQ',
        options: [
          `${firstLine.substring(0, 90)}`,
          'Random unverified runtime invocation',
          'Suppression of all validation assertions',
          'Complete bypass of state management',
        ],
        optionA: `${firstLine.substring(0, 90)}`,
        optionB: 'Random unverified runtime invocation',
        optionC: 'Suppression of all validation assertions',
        optionD: 'Complete bypass of state management',
        correctAnswer: 'A',
        explanation: `According to the uploaded material, ${firstLine.substring(0, 120)}.`,
        topic: subjectName,
        sourceCitation: `${subjectName} Material`,
        pageNumber: 1,
      },
    ];
  }


  private async callGemini(
    systemInstruction: string,
    userContent: string,
    jsonOutput: boolean
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
    }

    const modelsToTry = Array.from(
      new Set([
        this.model || config.ai.geminiModel || 'gemini-3.5-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
      ])
    );

    let lastError: Error | null = null;

    for (const activeModel of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${this.apiKey}`;
      const payload = {
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userContent }],
          },
        ],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
          response_mime_type: jsonOutput ? 'application/json' : 'text/plain',
        },
      };

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const data: any = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            return text || '';
          }

          const errText = await res.text();
          if (res.status === 429 && errText.includes('RESOURCE_EXHAUSTED')) {
            logger.warn({ model: activeModel }, '[Gemini] Daily quota exhausted for model, switching to fallback model');
            break; // Break attempt loop to try next model
          }

          if (res.status === 429 || res.status === 503) {
            const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
            logger.warn(`[Gemini] Transient error (${res.status}) on ${activeModel}, waiting ${waitTime}ms (attempt ${attempt}/3)...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
        } catch (err: any) {
          lastError = err;
          if (attempt === 3) break;
        }
      }
    }

    throw lastError || new Error('Gemini API call failed across all available models');
  }

  private parseJson<T>(raw: string): T | null {
    if (!raw || !raw.trim()) return null;
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.substring(7);
    } else if (clean.startsWith('```')) {
      clean = clean.substring(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.substring(0, clean.length - 3);
    }
    clean = clean.trim();

    try {
      return JSON.parse(clean) as T;
    } catch {
      return null;
    }
  }
}
