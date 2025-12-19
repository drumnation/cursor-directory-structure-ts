/**
 * AI Service Tests - TDD London School
 * Tests for OpenRouter-based AI content generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService, AIServiceConfig } from './ai-service.js';

// Mock the OpenAI module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

// Mock child_process to control brain-creds behavior
vi.mock('child_process', () => ({
  execSync: vi.fn(() => {
    throw new Error('brain-creds not available');
  }),
}));

describe('AIService', () => {
  const mockApiKey = 'test-openrouter-key';

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up env for tests
    process.env.OPENROUTER_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize with OpenRouter API key from environment', () => {
      const service = new AIService();
      expect(service).toBeDefined();
    });

    it('should throw error when no API key is provided', () => {
      delete process.env.OPENROUTER_API_KEY;
      expect(() => new AIService()).toThrow('OPENROUTER_API_KEY');
    });

    it('should accept custom configuration', () => {
      const config: AIServiceConfig = {
        apiKey: 'custom-key',
        model: 'google/gemini-2.0-flash-exp:free',
      };
      const service = new AIService(config);
      expect(service).toBeDefined();
    });
  });

  describe('generateContent', () => {
    it('should generate content using OpenRouter API', async () => {
      const service = new AIService();
      const mockResponse = 'Generated description for the file';

      // Access the mocked OpenAI instance
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: mockResponse } }],
      });
      (OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const newService = new AIService();
      const result = await newService.generateContent('Describe this file');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Describe this file',
            }),
          ]),
        })
      );
    });

    it('should return empty string on API error', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
      (OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const service = new AIService();
      const result = await service.generateContent('Test prompt');

      expect(result).toBe('');
    });

    it('should handle empty response gracefully', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [],
      });
      (OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const service = new AIService();
      const result = await service.generateContent('Test prompt');

      expect(result).toBe('');
    });
  });

  describe('model selection', () => {
    it('should use free model by default', () => {
      const service = new AIService();
      expect(service.getModel()).toMatch(/free|flash/i);
    });

    it('should allow custom model selection', () => {
      const service = new AIService({ model: 'anthropic/claude-3-haiku' });
      expect(service.getModel()).toBe('anthropic/claude-3-haiku');
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limiting between requests', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
      });
      (OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const service = new AIService({ rateLimitMs: 100 });

      const start = Date.now();
      await service.generateContent('First request');
      await service.generateContent('Second request');
      const elapsed = Date.now() - start;

      // Should have waited at least 100ms between requests
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});

describe('AIService Integration', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it('should be compatible with GeminiService interface', () => {
    // The AIService should be a drop-in replacement for GeminiService
    const service = new AIService();

    // Must have generateContent method
    expect(typeof service.generateContent).toBe('function');
    expect(typeof service.getModel).toBe('function');
  });
});
