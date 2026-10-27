import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { chatService } from './chat.service.js';

export class ChatController {
  public async askQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.sendMessage(req.user!.id, req.body);
      res.status(200).json(ApiResponseHelper.success(result, 'AI chat response generated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await chatService.getConversationHistory(String(req.params.conversationId), req.user!.id);
      res.status(200).json(ApiResponseHelper.success(history, 'Conversation history retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const chatController = new ChatController();
