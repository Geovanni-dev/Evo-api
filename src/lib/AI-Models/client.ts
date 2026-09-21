import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { env } from '../Configs/envs.js';

export const genAI = new GoogleGenAI({ apiKey: env.GOOGLE_GENAI_API_KEY });

export const DeepSeek = new OpenAI({
  apiKey: env.DEEPSEEK_KEY,
  baseURL: 'https://api.deepseek.com',
});
