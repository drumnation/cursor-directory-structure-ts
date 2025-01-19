import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  GenerativeModel,
  ChatSession,
} from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export class GeminiService {
  private model: GenerativeModel;
  private chatSession: ChatSession;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    this.chatSession = this.model.startChat({});
  }

  public async generateRules(prompt: string): Promise<string> {
    try {
      const result = await this.chatSession.sendMessage(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating rules with Gemini:', error);
      throw error;
    }
  }
} 