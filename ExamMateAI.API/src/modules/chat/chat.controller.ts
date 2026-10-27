import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { chatService } from './chat.service.js';

async function resolveUserId(req: Request): Promise<string> {
  if (req.user?.id) return req.user.id;
  const student = await prisma.user.findFirst({ where: { role: 'Student' } });
  if (student) return student.id;
  const firstUser = await prisma.user.findFirst();
  return firstUser ? firstUser.id : 'demo-student';
}

export class ChatController {
  public async askQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await resolveUserId(req);
      const result = await chatService.sendMessage(userId, req.body);
      res.status(200).json(ApiResponseHelper.success(result, 'AI chat response generated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await resolveUserId(req);
      const history = await chatService.getConversationHistory(String(req.params.conversationId), userId);
      res.status(200).json(ApiResponseHelper.success(history, 'Conversation history retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const chatController = new ChatController();
