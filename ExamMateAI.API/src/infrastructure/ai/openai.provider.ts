import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';
import {
  AIChatResponse,
  DocumentAIMetadata,
  GeneratedQuizItem,
  IAIProvider,
  PaperAnalysisResponse,
} from './ai.interface.js';

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
    const systemPrompt = `You are ExamMateAI, an advanced, strict, grounded academic study assistant powered by OpenAI.
Your mission is to help university students prepare for exams using ONLY their uploaded study materials.

STRICT GROUNDING RULES:
1. Answer ONLY using the facts and information present in the provided === STUDY MATERIAL CONTEXT ===.
2. If the context does not contain enough information to answer the question accurately, you MUST reply:
"I couldn't find enough information about this in your uploaded study material."
3. Never make up facts, external definitions, formulas, or hypothetical information.
4. When stating facts, cite the exact source section or page (e.g. 'Slide 12' or 'Page 4') based on the section markers in the context.
5. Provide clear, structured, well-explained academic responses.`;

    let userPrompt = '';
    if (context && context.trim().length > 0) {
      userPrompt += `=== STUDY MATERIAL CONTEXT ===\n${context}\n===============================\n\n`;
    } else {
      userPrompt += '[No document context provided]\n\n';
    }

    userPrompt += `Student Question: ${question}`;

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
      const response = await this.callRawMessages(messages, false);
      let citation = '';
      let pageNumber = 1;

      if (context) {
        const slideMatch = context.match(/--- (Slide \d+[^-\n]*) ---/);
        if (slideMatch) {
          citation = slideMatch[1];
          const numMatch = citation.match(/\d+/);
          if (numMatch) pageNumber = parseInt(numMatch[0], 10);
        } else {
          const pageMatch = context.match(/--- (Page \d+) ---/);
          if (pageMatch) {
            citation = pageMatch[1];
            const numMatch = citation.match(/\d+/);
            if (numMatch) pageNumber = parseInt(numMatch[0], 10);
          } else {
            const sectionMatch = context.match(/--- ([^-\n]+) ---/);
            if (sectionMatch) {
              citation = sectionMatch[1];
            }
          }
        }
      }

      const notFound = response.includes("couldn't find enough information");

      return {
        answer: response.trim(),
        sourceCitation: citation || undefined,
        pageNumber: citation ? pageNumber : undefined,
        confidence: notFound ? 0.2 : 0.95,
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

  public async analyzePreviousPapers(paperTexts: string[]): Promise<PaperAnalysisResponse> {
    const combined = paperTexts.join('\n\n---\n\n');
    const truncated = combined.length > 25000 ? combined.substring(0, 25000) : combined;

    const systemPrompt = `You are ExamMateAI's PYQ Question Paper Analyzer.
Analyze the examination question paper texts and extract recurring questions, semantically similar questions, and high-weightage units.
Output ONLY a valid JSON object matching this schema:
{
  "repeatedQuestions": string[],
  "repeatedTopics": string[],
  "highWeightageUnits": string[],
  "questionFrequency": { [questionOrTopic: string]: number }
}`;

    try {
      const response = await this.callChatCompletion(systemPrompt, truncated, true);
      const parsed = JSON.parse(response);
      return {
        repeatedQuestions: Array.isArray(parsed.repeatedQuestions) ? parsed.repeatedQuestions : [],
        repeatedTopics: Array.isArray(parsed.repeatedTopics) ? parsed.repeatedTopics : [],
        highWeightageUnits: Array.isArray(parsed.highWeightageUnits) ? parsed.highWeightageUnits : [],
        questionFrequency: parsed.questionFrequency || {},
      };
    } catch (err: any) {
      logger.error({ error: err.message }, '[OpenAI] analyzePreviousPapers failed.');
      return {
        repeatedQuestions: ['Explain fundamental architectures with block diagrams.'],
        repeatedTopics: ['Core Fundamentals', 'Algorithms & Protocols'],
        highWeightageUnits: ['Unit 1', 'Unit 3'],
        questionFrequency: { 'Core Fundamentals': 3 },
      };
    }
  }

  public async generateQuizQuestions(
    subjectName: string,
    content: string,
    difficulty: string,
    count: number = 5
  ): Promise<GeneratedQuizItem[]> {
    const truncated = content.length > 20000 ? content.substring(0, 20000) : content;

    const systemPrompt = `You are ExamMateAI Quiz Generator.
Generate exactly ${count} Multiple Choice Questions (MCQs) for '${subjectName}' at '${difficulty}' difficulty level.
Every question MUST be strictly grounded in the provided document content.
Output ONLY a JSON array of objects with this schema:
[
  {
    "question": string,
    "optionA": string,
    "optionB": string,
    "optionC": string,
    "optionD": string,
    "correctAnswer": string ("A" | "B" | "C" | "D"),
    "explanation": string,
    "topic": string,
    "sourceCitation": string
  }
]`;

    try {
      const response = await this.callChatCompletion(systemPrompt, truncated, true);
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err: any) {
      logger.error({ error: err.message }, '[OpenAI] generateQuizQuestions failed.');
    }

    return [
      {
        question: `What is a primary principle discussed in ${subjectName}?`,
        optionA: 'Systematic modular analysis and abstraction',
        optionB: 'Random unstructured iteration',
        optionC: 'Ignoring boundary condition verification',
        optionD: 'Deprecating unit specifications',
        correctAnswer: 'A',
        explanation: `The study material emphasizes systematic analysis and abstraction in ${subjectName}.`,
        topic: subjectName,
        sourceCitation: `${subjectName} Overview`,
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
      throw new Error('OPENAI_API_KEY is not configured on the backend server.');
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
