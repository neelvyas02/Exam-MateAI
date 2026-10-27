import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { searchService } from './search.service.js';

export class SearchController {
  public async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const keyword = (req.query.keyword as string) || '';
      const result = await searchService.searchDocuments(keyword, req.user?.id);
      res.status(200).json(ApiResponseHelper.success(result, 'Search completed successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
