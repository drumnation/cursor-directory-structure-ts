/**
 * AI Service - OpenRouter-based content generation
 *
 * Replaces the deprecated GeminiService with OpenRouter API access.
 * Uses free models by default for cost efficiency.
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config();

/**
 * Try to get a credential from brain-creds vault
 */
function getBrainCred(credName: string): string | null {
  try {
    const result = execSync(`brain-creds get ${credName} 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    if (result && !result.includes('not found')) {
      console.log(`Found ${credName} via brain-creds`);
      return result;
    }
  } catch {
    // brain-creds not available or credential not found
  }
  return null;
}

export interface AIServiceConfig {
  apiKey?: string;
  model?: string;
  rateLimitMs?: number;
  maxTokens?: number;
}

// Free models available via OpenRouter
export const FREE_MODELS = {
  GEMINI_FLASH: 'google/gemini-2.0-flash-exp:free',
  DEEPSEEK_R1: 'deepseek/deepseek-r1:free',
  QWEN_32B: 'qwen/qwen3-32b:free',
} as const;

const DEFAULT_MODEL = FREE_MODELS.GEMINI_FLASH;
const DEFAULT_RATE_LIMIT_MS = 500;
const DEFAULT_MAX_TOKENS = 500;

export class AIService {
  private client: OpenAI;
  private model: string;
  private rateLimitMs: number;
  private maxTokens: number;
  private lastRequestTime: number = 0;

  constructor(config: AIServiceConfig = {}) {
    // Priority: 1) config, 2) env var, 3) brain-creds, 4) .env file
    let apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;

    // Try brain-creds vault (1Password integration)
    if (!apiKey) {
      apiKey = getBrainCred('openrouter_key') ?? undefined;
    }

    // Try to read from .env file as last resort
    if (!apiKey) {
      try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const match = envContent.match(/OPENROUTER_API_KEY=(.+)/);
          if (match) {
            apiKey = match[1].trim();
            console.log('Found OPENROUTER_API_KEY in .env file');
          }
        }
      } catch (error) {
        console.error('Error reading .env file:', error);
      }
    }

    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY not found. Checked: env var, brain-creds vault, .env file. ' +
          'Add via: brain-creds add openrouter_key <key>'
      );
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/drumnation/brain-garden',
        'X-Title': 'Brain Garden Directory Structure',
      },
    });

    this.model = config.model || DEFAULT_MODEL;
    this.rateLimitMs = config.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

    console.log(`AIService initialized with model: ${this.model}`);
  }

  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Rate limit helper - waits if needed
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.rateLimitMs && this.lastRequestTime > 0) {
      const waitTime = this.rateLimitMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Generate content using OpenRouter API
   * Compatible with GeminiService.generateContent interface
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      await this.enforceRateLimit();

      console.log(
        'Sending prompt to OpenRouter:',
        prompt.substring(0, 100) + '...'
      );

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that provides concise descriptions for code files and directories. Keep responses brief and technical.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.choices?.[0]?.message?.content || '';

      if (content) {
        console.log(
          'Received response from OpenRouter:',
          content.substring(0, 100) + '...'
        );
      } else {
        console.log('Empty response from OpenRouter');
      }

      return content;
    } catch (error) {
      console.error('Error generating content:', error);
      return ''; // Return empty string on error for graceful degradation
    }
  }
}

// Export a factory function for easy service creation
export function createAIService(config?: AIServiceConfig): AIService {
  return new AIService(config);
}

// For backwards compatibility with GeminiService usage
export { AIService as GeminiService };
