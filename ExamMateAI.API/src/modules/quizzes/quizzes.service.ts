import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { getAIProvider } from '../../infrastructure/ai/ai.factory.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface QuizQuestionDto {
  id: string;
  quizId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  selectedOption?: string | null;
}

export interface QuizDto {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  difficulty: string;
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
      topic?: string;
    }
  ): Promise<QuizDto> {
    let subjectName = dto.topic || 'General Knowledge';
    let targetSubjectId = dto.subjectId || null;
    let targetDocId = dto.documentId || (dto.documentIds && dto.documentIds[0]) || null;
    let combinedText = '';

    const targetDocIds = dto.documentIds || (dto.documentId ? [dto.documentId] : []);

    if (targetDocIds.length > 0) {
      const documents = await prisma.document.findMany({
        where: { id: { in: targetDocIds }, userId, isDeleted: false },
        include: { chunks: { take: 8 }, subject: true },
      });

      for (const doc of documents) {
        if (!targetSubjectId && doc.subjectId) targetSubjectId = doc.subjectId;
        if (doc.subject) subjectName = doc.subject.name;
        if (doc.chunks && doc.chunks.length > 0) {
          combinedText += doc.chunks.map((c) => c.chunkText).join('\n') + '\n\n';
        }
      }
    } else if (dto.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: dto.subjectId },
        include: {
          documents: {
            where: { isDeleted: false },
            include: { chunks: true },
            take: 5,
          },
        },
      });

      if (!subject) {
        throw new NotFoundError('Subject not found.');
      }

      subjectName = subject.name;
      targetSubjectId = subject.id;

      for (const doc of subject.documents) {
        if (doc.chunks && doc.chunks.length > 0) {
          combinedText += doc.chunks.map((c) => c.chunkText).join('\n') + '\n\n';
        }
      }
    }

    if (!combinedText.trim()) {
      combinedText = `${subjectName} - Key principles, definitions, and concepts.`;
    }

    const difficulty = dto.difficulty || 'Medium';
    const count = dto.questionCount || 5;

    const ai = getAIProvider();
    const generatedItems = await ai.generateQuizQuestions(
      subjectName,
      combinedText,
      difficulty,
      count
    );

    const quiz = await prisma.quiz.create({
      data: {
        userId,
        subjectId: targetSubjectId,
        documentId: targetDocId,
        title: `${subjectName} Quiz (${difficulty})`,
        difficulty,
        questionCount: generatedItems.length,
      },
    });

    const questionRecords = await Promise.all(
      generatedItems.map((item, index) =>
        prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            question: item.question,
            options: JSON.stringify([item.optionA, item.optionB, item.optionC, item.optionD]),
            optionA: item.optionA,
            optionB: item.optionB,
            optionC: item.optionC,
            optionD: item.optionD,
            correctAnswer: item.correctAnswer || 'A',
            explanation: item.explanation || 'Review subject study notes for detail.',
            questionOrder: index + 1,
          },
        })
      )
    );

    // Hide correct answers from client before quiz submission!
    return {
      id: quiz.id,
      userId: quiz.userId,
      subjectId: targetSubjectId || '',
      subjectName,
      title: quiz.title,
      difficulty: quiz.difficulty,
      score: quiz.score,
      totalQuestions: questionRecords.length,
      questions: questionRecords.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: '', // Hidden before submission
        explanation: '', // Hidden before submission
      })),
      createdAt: quiz.createdAt.toISOString(),
    };
  }

  public async getQuizById(id: string, userId: string): Promise<QuizDto> {
    const quiz = await prisma.quiz.findFirst({
      where: { id, userId },
      include: {
        subject: true,
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
      score: quiz.score,
      totalQuestions: quiz.questions.length,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        // Only reveal correct answers if already submitted
        correctAnswer: isSubmitted ? q.correctAnswer : '',
        explanation: isSubmitted ? q.explanation : '',
        selectedOption: q.selectedOption,
      })),
      createdAt: quiz.createdAt.toISOString(),
    };
  }

  public async submitQuiz(
    userId: string,
    dto: {
      quizId: string;
      answers: Array<{ questionId: string; selectedOption: string }>;
    }
  ): Promise<QuizResultDto> {
    const quiz = await prisma.quiz.findFirst({
      where: { id: dto.quizId, userId },
      include: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    let correctCount = 0;
    const answerMap = new Map(dto.answers.map((a) => [a.questionId, a.selectedOption]));

    const updatedQuestions: QuizQuestionDto[] = [];

    for (const q of quiz.questions) {
      const selected = answerMap.get(q.id) || null;
      const isCorrect = selected && selected.toUpperCase() === q.correctAnswer.toUpperCase();
      if (isCorrect) correctCount++;

      await prisma.quizQuestion.update({
        where: { id: q.id },
        data: { selectedOption: selected },
      });

      updatedQuestions.push({
        id: q.id,
        quizId: q.quizId,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        selectedOption: selected,
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
