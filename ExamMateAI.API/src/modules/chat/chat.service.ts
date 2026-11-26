import crypto from 'crypto';
import { NotFoundError } from '../../common/errors.js';
import { ragService, RAGSourceCitation } from '../../infrastructure/ai/rag.service.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  userId: string;
  documentId?: string | null;
  role: string;
  message: string;
  answer?: string;
  sources?: RAGSourceCitation[];
  citations?: any[];
  sourceDocument?: string | null;
  sourceCitation?: string | null;
  pageNumber?: number | null;
  confidence: number;
  provider?: string;
  isGrounded?: boolean;
  groundingStatus?: string;
  unverifiedContextUsed?: boolean;
  createdAt: string;
}

export class ChatService {
  public async sendMessage(
    userId: string,
    dto: {
      question: string;
      documentId?: string | null;
      documentIds?: string[];
      conversationId?: string | null;
      subjectId?: string | null;
      context?: string | null;
    }
  ): Promise<ChatMessageDto> {
    const primaryDocId = dto.documentId || (dto.documentIds && dto.documentIds[0]) || null;
    let conversationId = dto.conversationId || crypto.randomUUID();
    let recentMessages: Array<{ role: string; message: string }> = [];

    // Safely attempt DB conversation tracking
    try {
      let conversation;
      if (dto.conversationId) {
        conversation = await prisma.aIConversation.findFirst({
          where: { id: dto.conversationId, userId },
        });
      }

      if (!conversation) {
        conversation = await prisma.aIConversation.create({
          data: {
            userId,
            title: dto.question.length > 35 ? dto.question.substring(0, 35) + '...' : dto.question,
          },
        });
      }
      conversationId = conversation.id;

      await prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          userId,
          documentId: primaryDocId,
          role: 'user',
          message: dto.question,
          confidence: 1.0,
        },
      });

      const history = await prisma.aIMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 6,
      });
      recentMessages = history.map((m) => ({ role: m.role, message: m.message }));
    } catch (dbError: any) {
      logger.warn({ error: dbError.message }, '[ChatService] DB persistence skipped (database offline or unreachable).');
    }

    // Collect target document IDs
    const targetDocumentIds: string[] = [];
    if (dto.documentIds && Array.isArray(dto.documentIds)) {
      targetDocumentIds.push(...dto.documentIds.filter(Boolean));
    } else if (dto.documentId) {
      targetDocumentIds.push(dto.documentId);
    }

    // Query RAG Service with AI
    const ragResult = await ragService.answerQuestion({
      userId,
      question: dto.question,
      documentIds: targetDocumentIds.length > 0 ? targetDocumentIds : undefined,
      conversationHistory: recentMessages,
      directContext: dto.context,
    });

    // Safely attempt to persist assistant response in DB
    let messageId = crypto.randomUUID();
    let createdAt = new Date().toISOString();
    try {
      const assistantMessage = await prisma.aIMessage.create({
        data: {
          conversationId,
          userId,
          documentId: primaryDocId,
          role: 'assistant',
          message: ragResult.answer,
          sourceCitation: ragResult.sourceCitation,
          citationsJson: JSON.stringify(ragResult.citations || ragResult.sources),
          pageNumber: ragResult.pageNumber || null,
          confidence: ragResult.confidence,
        },
      });
      messageId = assistantMessage.id;
      createdAt = assistantMessage.createdAt.toISOString();
    } catch (dbError: any) {
      logger.warn({ error: dbError.message }, '[ChatService] Could not persist assistant message in DB.');
    }

    return {
      id: messageId,
      conversationId,
      userId,
      documentId: primaryDocId,
      role: 'assistant',
      message: ragResult.answer,
      answer: ragResult.answer,
      sources: ragResult.sources,
      citations: ragResult.citations,
      sourceDocument: ragResult.sources[0]?.documentName || undefined,
      sourceCitation: ragResult.sourceCitation,
      pageNumber: ragResult.pageNumber,
      confidence: ragResult.confidence,
      provider: ragResult.provider,
      isGrounded: ragResult.isGrounded,
      groundingStatus: ragResult.groundingStatus,
      unverifiedContextUsed: ragResult.unverifiedContextUsed,
      createdAt,
    };
  }

  public async getConversationHistory(conversationId: string, userId: string): Promise<ChatMessageDto[]> {
    try {
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return [];
      }

      return conversation.messages.map((m: any) => {
      let sources: RAGSourceCitation[] = [];
      if (m.citationsJson) {
        try {
          sources = JSON.parse(m.citationsJson);
        } catch {
          sources = [];
        }
      }

      return {
        id: m.id,
        conversationId: m.conversationId,
        userId: m.userId,
        documentId: m.documentId,
        role: m.role,
        message: m.message,
        answer: m.message,
        sources,
        sourceCitation: m.sourceCitation,
        pageNumber: m.pageNumber,
        confidence: m.confidence,
        createdAt: m.createdAt.toISOString(),
      };
    });
    } catch {
      return [];
    }
  }
}

export const chatService = new ChatService();
