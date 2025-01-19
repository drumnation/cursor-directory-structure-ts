import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { GeminiService } from '../src/services/gemini.service';
import { RulesGenerator } from '../src/rules-generator';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

describe('GeminiService', () => {
  let geminiService: GeminiService;
  let hasValidApiKey: boolean;

  beforeEach(() => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      hasValidApiKey = false;
      return;
    }

    try {
      geminiService = new GeminiService();
      hasValidApiKey = true;
    } catch (error) {
      hasValidApiKey = false;
    }
  });

  it('should be properly initialized when API key is available', () => {
    if (!hasValidApiKey) {
      console.warn('Skipping test: No valid Gemini API key available');
      return;
    }
    assert.ok(geminiService);
  });

  it('should generate rules from a prompt when API key is available', async () => {
    if (!hasValidApiKey) {
      console.warn('Skipping test: No valid Gemini API key available');
      return;
    }
    const prompt = 'Generate rules for a TypeScript project';
    try {
      const response = await geminiService.generateRules(prompt);
      assert.ok(response);
      assert.ok(response.includes('{'));
      assert.ok(response.includes('}'));
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('API_KEY_INVALID') ||
        error.message.includes('API key not valid')
      )) {
        console.warn('Skipping test: Invalid Gemini API key');
        return;
      }
      throw error;
    }
  });
});

describe('RulesGenerator with Gemini Integration', () => {
  let rulesGenerator: RulesGenerator;
  const testProjectPath = path.join(__dirname, 'test-project');

  beforeEach(() => {
    // Clean up any existing test project
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }

    // Create test project directory and files
    fs.mkdirSync(testProjectPath, { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
    
    // Create package.json
    fs.writeFileSync(
      path.join(testProjectPath, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project for cursor-focus-ts',
        dependencies: {
          express: '^4.18.2'
        }
      }, null, 2)
    );

    // Create tsconfig.json
    fs.writeFileSync(
      path.join(testProjectPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'es2020',
          module: 'commonjs',
          strict: true
        }
      }, null, 2)
    );

    // Create src/index.ts
    fs.writeFileSync(
      path.join(testProjectPath, 'src', 'index.ts'),
      `import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('Hello World!'));
app.listen(3000);`
    );

    rulesGenerator = new RulesGenerator(testProjectPath);
  });

  afterEach(() => {
    // Clean up test project
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  it('should generate rules using Gemini or fallback to defaults', async () => {
    const rules = await rulesGenerator.generateRules();
    assert.ok(rules);
    assert.ok(rules.version);
    assert.ok(rules.last_updated);
    assert.ok(rules.project);
    assert.ok(rules.ai_behavior);
    assert.ok(rules.communication);
    assert.ok(rules.response_format);
  });

  it('should fallback to default rules if Gemini fails', async () => {
    // Mock the GeminiService to throw an error
    const originalGeminiService = rulesGenerator['geminiService'];
    const mockGeminiService = new GeminiService();
    Object.defineProperty(mockGeminiService, 'generateRules', {
      value: async () => {
        throw new Error('Gemini API error');
      },
    });
    rulesGenerator['geminiService'] = mockGeminiService;

    const rules = await rulesGenerator.generateRules();
    assert.ok(rules);
    assert.ok(rules.version);
    assert.ok(rules.last_updated);
    assert.ok(rules.project);
    assert.ok(rules.ai_behavior);
    assert.ok(rules.communication);
    assert.ok(rules.response_format);

    // Restore the original service
    rulesGenerator['geminiService'] = originalGeminiService;
  });
}); 