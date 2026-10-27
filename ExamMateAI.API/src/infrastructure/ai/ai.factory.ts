import { config } from '../../config/index.js';
import { IAIProvider } from './ai.interface.js';
import { GeminiProvider } from './gemini.provider.js';
import { OpenAIProvider } from './openai.provider.js';

let activeProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (activeProvider) return activeProvider;

  // 1. Explicit Gemini provider requested
  if (config.ai.provider === 'gemini') {
    activeProvider = new GeminiProvider();
    return activeProvider;
  }

  // 2. OpenAI provider requested with API key supplied
  if (config.ai.openaiApiKey) {
    activeProvider = new OpenAIProvider();
    return activeProvider;
  }

  // 3. Fallback to Gemini if Gemini API key is configured
  if (config.ai.geminiApiKey) {
    activeProvider = new GeminiProvider();
    return activeProvider;
  }

  // 4. Default to OpenAI (will produce clear configuration guidance)
  activeProvider = new OpenAIProvider();
  return activeProvider;
}

export function getActiveProviderName(): 'openai' | 'gemini' {
  const provider = getAIProvider();
  return provider instanceof GeminiProvider ? 'gemini' : 'openai';
}

