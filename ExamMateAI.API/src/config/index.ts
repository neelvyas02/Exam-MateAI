import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string[];
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshTokenExpiryDays: number;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
    bucketName: string;
    useLocalStorageFallback: boolean;
  };
  ai: {
    provider: 'openai' | 'gemini';
    openaiApiKey: string;
    openaiModel: string;
    openaiEmbeddingModel: string;
    openaiEmbeddingDimension: number;
    geminiApiKey: string;
    geminiModel: string;
    temperature: number;
    maxTokens: number;
  };
  redis: {
    url: string;
  };
  processing: {
    chunkSize: number;
    chunkOverlap: number;
    maxUploadSizeMb: number;
  };
}

const getCorsOrigins = (originStr?: string): string[] => {
  if (!originStr) return ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5137', 'http://localhost:8080'];
  return originStr.split(',').map((o) => o.trim()).filter(Boolean);
};

const providerEnv = process.env.AI_PROVIDER?.toLowerCase();
const selectedProvider: 'openai' | 'gemini' = providerEnv === 'gemini' ? 'gemini' : 'openai';

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5137', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: getCorsOrigins(process.env.CORS_ORIGIN || process.env.FRONTEND_URL),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/exammate_db?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'ExamMateAI_Super_Secret_Key_For_JWT_Authentication_2026_Minimum_256_Bits!',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshTokenExpiryDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7', 10),
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucketName: process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET_NAME || 'study-materials',
    useLocalStorageFallback: process.env.USE_LOCAL_STORAGE_FALLBACK === 'true' || true,
  },
  ai: {
    provider: selectedProvider,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    openaiEmbeddingDimension: parseInt(process.env.OPENAI_EMBEDDING_DIMENSION || '1536', 10),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    temperature: 0.3, // Grounded precision temperature
    maxTokens: 2048,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  processing: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
    maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '25', 10),
  },
};

export function validateAIConfiguration(): { valid: boolean; message?: string } {
  if (config.ai.provider === 'openai') {
    if (!config.ai.openaiApiKey) {
      return {
        valid: false,
        message: 'OPENAI_API_KEY is not configured in backend environment variables. Set OPENAI_API_KEY in .env to enable OpenAI features.',
      };
    }
  }
  return { valid: true };
}
