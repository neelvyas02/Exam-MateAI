import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { chaptersRoutes } from '../modules/chapters/chapters.routes.js';
import { chatRoutes } from '../modules/chat/chat.routes.js';
import { documentsRoutes } from '../modules/documents/documents.routes.js';
import { healthRoutes } from '../modules/health/health.routes.js';
import { importantTopicsRoutes } from '../modules/important-topics/important-topics.routes.js';
import { questionAnalysisRoutes } from '../modules/question-analysis/question-analysis.routes.js';
import { quizRoutes } from '../modules/quizzes/quizzes.routes.js';
import { searchRoutes } from '../modules/search/search.routes.js';
import { subjectsRoutes } from '../modules/subjects/subjects.routes.js';
import { summaryRoutes } from '../modules/summaries/summaries.routes.js';
import { usersRoutes } from '../modules/users/users.routes.js';

export const apiV1Routes = Router();

apiV1Routes.use('/auth', authRoutes);
apiV1Routes.use('/users', usersRoutes);
apiV1Routes.use('/subjects', subjectsRoutes);
apiV1Routes.use('/chapters', chaptersRoutes);
apiV1Routes.use('/documents', documentsRoutes);
apiV1Routes.use('/chat', chatRoutes);
apiV1Routes.use('/summary', summaryRoutes);
apiV1Routes.use('/summarize', summaryRoutes);
apiV1Routes.use('/analysis', questionAnalysisRoutes);
apiV1Routes.use('/quiz', quizRoutes);
apiV1Routes.use('/important-topics', importantTopicsRoutes);
apiV1Routes.use('/search', searchRoutes);
apiV1Routes.use('/health', healthRoutes);
