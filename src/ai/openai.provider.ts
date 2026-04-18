import { Provider } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './ai.constants';

export const openAiProvider: Provider = {
  provide: OPENAI_CLIENT,
  useFactory: (): OpenAI | null => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_new_key_here') {
      return null;
    }

    return new OpenAI({ apiKey });
  },
};
