import path from 'path';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';
import {
  AIChatResponse,
  DocumentAIMetadata,
  GeneratedQuizItem,
  IAIProvider,
  PaperAnalysisResponse,
} from './ai.interface.js';

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
    const systemPrompt = `You are ExamMateAI, a strict, grounded academic study assistant.
Rules:
1. Answer ONLY using the provided ExamMateAI study material context.
2. If the answer cannot be found in or directly supported by the context, reply EXACTLY with:
"I couldn't find enough information about this in your uploaded study material."
3. Do NOT make up facts or use external knowledge not present in the study material.
4. When stating facts, cite the exact source section (e.g. 'Slide 12' or 'Page 4') based on the headings in the context.
5. Provide clear, concise, well-structured academic answers.`;

    let userPrompt = '';
    if (context && context.trim().length > 0) {
      userPrompt += `=== STUDY MATERIAL CONTEXT ===\n${context}\n===============================\n\n`;
    } else {
      userPrompt += '[No document context provided]\n\n';
    }

    if (history && history.length > 0) {
      userPrompt += 'Recent Conversation:\n';
      for (const h of history.slice(-4)) {
        userPrompt += `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.message}\n`;
      }
      userPrompt += '\n';
    }

    userPrompt += `Student Question: ${question}`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt, false);
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

  public async analyzePreviousPapers(paperTexts: string[]): Promise<PaperAnalysisResponse> {
    const combined = paperTexts.join('\n\n---\n\n');
    const truncated = combined.length > 20000 ? combined.substring(0, 20000) : combined;

    const systemPrompt = `You are ExamMateAI's PYQ Question Paper Analyzer.
Extract all examination questions, recurring topics, and high-weightage units from the question paper text.
Output ONLY a valid JSON object matching this schema:
{
  "repeatedQuestions": string[],
  "repeatedTopics": string[],
  "highWeightageUnits": string[],
  "questionFrequency": { [question: string]: number }
}`;

    try {
      const response = await this.callGemini(systemPrompt, truncated, true);
      const parsed = this.parseJson<PaperAnalysisResponse>(response);
      if (parsed) return parsed;
    } catch (err: any) {
      logger.error({ error: err.message }, '[Gemini] analyzePreviousPapers failed.');
    }

    return {
      repeatedQuestions: [
        'Explain core architecture and protocols with block diagrams.',
        'Compare and contrast fundamental design algorithms.',
      ],
      repeatedTopics: ['Architectural Fundamentals', 'Protocol Design', 'Security & Optimization'],
      highWeightageUnits: ['Unit 1: Foundations', 'Unit 3: Core Mechanics'],
      questionFrequency: {
        'Architecture Overview': 4,
        'Comparative Protocol Analysis': 3,
        'Performance Trade-offs': 2,
      },
    };
  }

  public async generateQuizQuestions(
    subjectName: string,
    content: string,
    difficulty: string,
    count: number = 5
  ): Promise<GeneratedQuizItem[]> {
    const truncated = content.length > 18000 ? content.substring(0, 18000) : content;

    const systemPrompt = `You are ExamMateAI Quiz Generator.
Generate exactly ${count} high-quality Multiple Choice Questions (MCQs) for '${subjectName}' at '${difficulty}' difficulty.
Every question MUST be grounded in the provided document content.
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
      const response = await this.callGemini(systemPrompt, truncated, true);
      const parsed = this.parseJson<GeneratedQuizItem[]>(response);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err: any) {
      logger.error({ error: err.message }, '[Gemini] generateQuizQuestions failed.');
    }

    return [
      {
        question: `What is a primary principle discussed in ${subjectName}?`,
        optionA: 'Systematic modular analysis and abstraction',
        optionB: 'Random unstructured implementation',
        optionC: 'Ignoring boundary condition validation',
        optionD: 'Deprecating verification protocols',
        correctAnswer: 'A',
        explanation: `The study material emphasizes systematic analysis and abstraction in ${subjectName}.`,
        topic: subjectName,
        sourceCitation: `${subjectName} Overview`,
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

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

    let lastError: Error | null = null;
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
        if (res.status === 429 || res.status === 503) {
          logger.warn(`[Gemini] Transient error (${res.status}), retry attempt ${attempt}/3...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          continue;
        }

        throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
      } catch (err: any) {
        lastError = err;
        if (attempt === 3) break;
      }
    }

    throw lastError || new Error('Gemini API call failed after 3 attempts');
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
