import { config } from '../../config/index.js';
import { IAIProvider } from './ai.interface.js';
import { GeminiProvider } from './gemini.provider.js';
import { OpenAIProvider } from './openai.provider.js';

let activeProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (activeProvider) return activeProvider;

  if (config.ai.provider === 'openai') {
    activeProvider = new OpenAIProvider();
  } else {
    activeProvider = new GeminiProvider();
  }

  return activeProvider;
}
