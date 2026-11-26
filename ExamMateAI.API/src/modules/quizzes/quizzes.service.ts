import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { getAIProvider } from '../../infrastructure/ai/ai.factory.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface QuizQuestionDto {
  id: string;
  quizId: string;
  question: string;
  questionType?: 'MCQ' | 'TrueFalse';
  options?: string[];
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  selectedOption?: string | null;
  sourceCitation?: string;
  pageNumber?: number;
}

export interface QuizDto {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  difficulty: string;
  questionType?: string;
  sourceDocName?: string;
  score?: number | null;
  totalQuestions: number;
  questions: QuizQuestionDto[];
  createdAt: string;
}

export interface QuizResultDto {
  quizId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  questions: QuizQuestionDto[];
}

export class QuizService {
  public async generateQuiz(
    userId: string,
    dto: {
      subjectId?: string;
      documentIds?: string[];
      documentId?: string;
      difficulty?: string;
      questionCount?: number;
      questionType?: 'MCQ' | 'TrueFalse' | 'Mixed';
      topic?: string;
    }
  ): Promise<QuizDto> {
    let subjectName = dto.topic || 'General Knowledge';
    let targetSubjectId = dto.subjectId || null;
    let targetDocId = dto.documentId || (dto.documentIds && dto.documentIds[0]) || null;
    let sourceDocName = '';
    let combinedText = '';

    const targetDocIds = dto.documentIds || (dto.documentId ? [dto.documentId] : []);

    if (targetDocIds.length > 0) {
      const documents = await prisma.document.findMany({
        where: {
          id: { in: targetDocIds },
          isDeleted: false,
        },
        include: {
          chunks: { orderBy: { chunkIndex: 'asc' }, take: 30 },
          subject: true,
        },
      });

      if (documents.length === 0) {
        throw new NotFoundError('Selected document(s) not found or have been deleted.');
      }

      for (const doc of documents) {
        if (doc.processingStatus !== 'Ready') {
          if (doc.processingStatus === 'Failed') {
            throw new BadRequestError(
              `Document "${doc.originalName || doc.fileName}" processing failed. Please re-upload or select another document.`
            );
          } else {
            throw new BadRequestError(
              `Document "${doc.originalName || doc.fileName}" is still being processed. Please wait until status is Ready.`
            );
          }
        }

        if (!targetSubjectId && doc.subjectId) targetSubjectId = doc.subjectId;
        if (doc.subject) subjectName = doc.subject.name;
        if (!sourceDocName) sourceDocName = doc.originalName || doc.fileName;

        if (doc.chunks && doc.chunks.length > 0) {
          const docChunksFormatted = doc.chunks
            .map((c) => {
              const marker = c.pageNumber ? `--- Page/Slide ${c.pageNumber} ---` : '';
              return `${marker}\n${c.chunkText}`;
            })
            .join('\n\n');
          combinedText += docChunksFormatted + '\n\n';
        }
      }
    } else if (dto.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: dto.subjectId },
        include: {
          documents: {
            where: { isDeleted: false, processingStatus: 'Ready' },
            include: { chunks: { orderBy: { chunkIndex: 'asc' }, take: 10 } },
            take: 4,
          },
        },
      });

      if (!subject) {
        throw new NotFoundError('Subject not found.');
      }

      subjectName = subject.name;
      targetSubjectId = subject.id;

      for (const doc of subject.documents) {
        if (!sourceDocName) sourceDocName = doc.originalName || doc.fileName;
        if (doc.chunks && doc.chunks.length > 0) {
          combinedText += doc.chunks.map((c) => c.chunkText).join('\n') + '\n\n';
        }
      }
    }

    if (!combinedText.trim()) {
      if (targetDocIds.length > 0) {
        throw new BadRequestError(
          'Selected document does not contain readable extracted text to generate questions. Please ensure document has readable text.'
        );
      }
      combinedText = `${subjectName} - Key principles, core definitions, and foundational concepts.`;
    }

    const difficulty = dto.difficulty || 'Medium';
    const count = dto.questionCount || 5;
    const qType = dto.questionType || 'MCQ';

    const ai = getAIProvider();
    const generatedItems = await ai.generateQuizQuestions(
      subjectName,
      combinedText,
      difficulty,
      count,
      qType
    );

    const quiz = await prisma.quiz.create({
      data: {
        userId,
        subjectId: targetSubjectId,
        documentId: targetDocId,
        title: `${sourceDocName ? sourceDocName + ' — ' : ''}${subjectName} Quiz (${difficulty})`,
        difficulty,
        questionCount: generatedItems.length,
      },
    });

    const questionRecords = await Promise.all(
      generatedItems.map((item, index) => {
        const optionsPayload = JSON.stringify({
          options: item.options || [item.optionA, item.optionB, item.optionC, item.optionD].filter(Boolean),
          questionType: item.questionType || 'MCQ',
          sourceCitation: item.sourceCitation || (sourceDocName ? `${sourceDocName} · Page 1` : undefined),
          pageNumber: item.pageNumber || 1,
        });

        return prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            question: item.question,
            options: optionsPayload,
            optionA: item.optionA,
            optionB: item.optionB,
            optionC: item.optionC || '',
            optionD: item.optionD || '',
            correctAnswer: item.correctAnswer || 'A',
            explanation: item.explanation || 'Refer to uploaded study material.',
            questionOrder: index + 1,
          },
        });
      })
    );

    // Hide correct answers and explanations before submission
    return {
      id: quiz.id,
      userId: quiz.userId,
      subjectId: targetSubjectId || '',
      subjectName,
      title: quiz.title,
      difficulty: quiz.difficulty,
      questionType: qType,
      sourceDocName: sourceDocName || undefined,
      score: quiz.score,
      totalQuestions: questionRecords.length,
      questions: questionRecords.map((q) => {
        let meta: any = null;
        try {
          meta = JSON.parse(q.options);
        } catch {}
        const isArr = Array.isArray(meta);
        return {
          id: q.id,
          quizId: q.quizId,
          question: q.question,
          questionType: (!isArr && meta?.questionType) || (q.optionC === '' ? 'TrueFalse' : 'MCQ'),
          options: isArr ? meta : meta?.options || [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: '', // Hidden before submission
          explanation: '', // Hidden before submission
          sourceCitation: !isArr ? meta?.sourceCitation : undefined,
          pageNumber: !isArr ? meta?.pageNumber : undefined,
        };
      }),
      createdAt: quiz.createdAt.toISOString(),
    };
  }

  public async getQuizById(id: string, userId: string): Promise<QuizDto> {
    const quiz = await prisma.quiz.findFirst({
      where: { id },
      include: {
        subject: true,
        document: true,
        questions: { orderBy: { questionOrder: 'asc' } },
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    const isSubmitted = quiz.score !== null;

    return {
      id: quiz.id,
      userId: quiz.userId,
      subjectId: quiz.subjectId || '',
      subjectName: quiz.subject?.name || 'General Subject',
      title: quiz.title,
      difficulty: quiz.difficulty,
      sourceDocName: quiz.document?.originalName || quiz.document?.fileName || undefined,
      score: quiz.score,
      totalQuestions: quiz.questions.length,
      questions: quiz.questions.map((q) => {
        let meta: any = null;
        try {
          meta = JSON.parse(q.options);
        } catch {}
        const isArr = Array.isArray(meta);
        return {
          id: q.id,
          quizId: q.quizId,
          question: q.question,
          questionType: (!isArr && meta?.questionType) || (q.optionC === '' ? 'TrueFalse' : 'MCQ'),
          options: isArr ? meta : meta?.options || [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: isSubmitted ? q.correctAnswer : '',
          explanation: isSubmitted ? q.explanation : '',
          selectedOption: q.selectedOption,
          sourceCitation: !isArr ? meta?.sourceCitation : undefined,
          pageNumber: !isArr ? meta?.pageNumber : undefined,
        };
      }),
      createdAt: quiz.createdAt.toISOString(),
    };
  }

  public async getQuizHistory(userId: string): Promise<QuizDto[]> {
    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [{ userId }, { userId: 'demo-student' }],
      },
      include: {
        subject: true,
        document: true,
        questions: { orderBy: { questionOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return quizzes.map((quiz) => {
      const isSubmitted = quiz.score !== null;
      return {
        id: quiz.id,
        userId: quiz.userId,
        subjectId: quiz.subjectId || '',
        subjectName: quiz.subject?.name || 'General Subject',
        title: quiz.title,
        difficulty: quiz.difficulty,
        sourceDocName: quiz.document?.originalName || quiz.document?.fileName || undefined,
        score: quiz.score,
        totalQuestions: quiz.questions.length,
        questions: quiz.questions.map((q) => {
          let meta: any = null;
          try {
            meta = JSON.parse(q.options);
          } catch {}
          const isArr = Array.isArray(meta);
          return {
            id: q.id,
            quizId: q.quizId,
            question: q.question,
            questionType: (!isArr && meta?.questionType) || (q.optionC === '' ? 'TrueFalse' : 'MCQ'),
            options: isArr ? meta : meta?.options || [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: isSubmitted ? q.correctAnswer : '',
            explanation: isSubmitted ? q.explanation : '',
            selectedOption: q.selectedOption,
            sourceCitation: !isArr ? meta?.sourceCitation : undefined,
            pageNumber: !isArr ? meta?.pageNumber : undefined,
          };
        }),
        createdAt: quiz.createdAt.toISOString(),
      };
    });
  }

  public async submitQuiz(
    userId: string,
    dto: {
      quizId: string;
      answers: Array<{ questionId: string; selectedOption: string }>;
    }
  ): Promise<QuizResultDto> {
    const quiz = await prisma.quiz.findFirst({
      where: { id: dto.quizId },
      include: { questions: { orderBy: { questionOrder: 'asc' } } },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    let correctCount = 0;
    const answerMap = new Map(dto.answers.map((a) => [a.questionId, a.selectedOption]));

    const updatedQuestions: QuizQuestionDto[] = [];

    for (const q of quiz.questions) {
      const selected = answerMap.get(q.id) || null;
      let isCorrect = false;

      // Handle both letter ('A', 'B', 'C', 'D') and option text matching
      if (selected) {
        const selNorm = selected.trim().toUpperCase();
        const corrNorm = q.correctAnswer.trim().toUpperCase();
        if (selNorm === corrNorm) {
          isCorrect = true;
        } else if (corrNorm === 'A' && (selNorm === q.optionA.trim().toUpperCase() || selNorm === 'TRUE')) {
          isCorrect = true;
        } else if (corrNorm === 'B' && (selNorm === q.optionB.trim().toUpperCase() || selNorm === 'FALSE')) {
          isCorrect = true;
        } else if (corrNorm === 'C' && selNorm === q.optionC.trim().toUpperCase()) {
          isCorrect = true;
        } else if (corrNorm === 'D' && selNorm === q.optionD.trim().toUpperCase()) {
          isCorrect = true;
        }
      }

      if (isCorrect) correctCount++;

      await prisma.quizQuestion.update({
        where: { id: q.id },
        data: { selectedOption: selected },
      });

      let meta: any = null;
      try {
        meta = JSON.parse(q.options);
      } catch {}
      const isArr = Array.isArray(meta);

      updatedQuestions.push({
        id: q.id,
        quizId: q.quizId,
        question: q.question,
        questionType: (!isArr && meta?.questionType) || (q.optionC === '' ? 'TrueFalse' : 'MCQ'),
        options: isArr ? meta : meta?.options || [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        selectedOption: selected,
        sourceCitation: !isArr ? meta?.sourceCitation : undefined,
        pageNumber: !isArr ? meta?.pageNumber : undefined,
      });
    }

    const totalQuestions = quiz.questions.length;
    const score = correctCount;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    await prisma.quiz.update({
      where: { id: quiz.id },
      data: { score },
    });

    return {
      quizId: quiz.id,
      score,
      totalQuestions,
      percentage,
      questions: updatedQuestions,
    };
  }
}

export const quizService = new QuizService();

