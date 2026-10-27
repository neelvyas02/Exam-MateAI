import { NotFoundError } from '../../common/errors.js';
import { ragService, RAGSourceCitation } from '../../infrastructure/ai/rag.service.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  userId: string;
  documentId?: string | null;
  role: string;
  message: string;
  answer?: string;
  sources?: RAGSourceCitation[];
  sourceDocument?: string | null;
  sourceCitation?: string | null;
  pageNumber?: number | null;
  confidence: number;
  provider?: string;
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
    }
  ): Promise<ChatMessageDto> {
    // 1. Get or create conversation
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

    // 2. Save user message
    const primaryDocId = dto.documentId || (dto.documentIds && dto.documentIds[0]) || null;
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

    // 3. Collect target document IDs
    const targetDocumentIds: string[] = [];
    if (dto.documentIds && Array.isArray(dto.documentIds)) {
      targetDocumentIds.push(...dto.documentIds.filter(Boolean));
    } else if (dto.documentId) {
      targetDocumentIds.push(dto.documentId);
    }

    // 4. Retrieve recent message history
    const recentMessages = await prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 6,
    });

    // 5. Query RAG Service with vector semantic retrieval
    const ragResult = await ragService.answerQuestion({
      userId,
      question: dto.question,
      documentIds: targetDocumentIds.length > 0 ? targetDocumentIds : undefined,
      conversationHistory: recentMessages.map((m) => ({ role: m.role, message: m.message })),
    });

    // 6. Save assistant message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        documentId: primaryDocId,
        role: 'assistant',
        message: ragResult.answer,
        sourceCitation: ragResult.sourceCitation,
        citationsJson: JSON.stringify(ragResult.sources),
        pageNumber: ragResult.pageNumber || null,
        confidence: ragResult.confidence,
      },
    });

    return {
      id: assistantMessage.id,
      conversationId: assistantMessage.conversationId,
      userId: assistantMessage.userId,
      documentId: assistantMessage.documentId,
      role: assistantMessage.role,
      message: assistantMessage.message,
      answer: assistantMessage.message,
      sources: ragResult.sources,
      sourceDocument: ragResult.sources[0]?.documentName || undefined,
      sourceCitation: assistantMessage.sourceCitation,
      pageNumber: assistantMessage.pageNumber,
      confidence: assistantMessage.confidence,
      provider: ragResult.provider,
      createdAt: assistantMessage.createdAt.toISOString(),
    };
  }

  public async getConversationHistory(conversationId: string, userId: string): Promise<ChatMessageDto[]> {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found.');
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
  }
}

export const chatService = new ChatService();
