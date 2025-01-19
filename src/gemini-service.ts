import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    let apiKey = process.env.GEMINI_API_KEY;
    
    // If no API key in env, try to read from .env file directly
    if (!apiKey) {
      try {
        const envPath = path.join(process.cwd(), '.env');
        console.log('Looking for .env file at:', envPath);
        
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          console.log('Found .env file with content length:', envContent.length);
          
          const match = envContent.match(/GEMINI_API_KEY=(.+)/);
          if (match) {
            apiKey = match[1].trim();
            console.log('Found API key in .env file');
          }
        }
      } catch (error) {
        console.error('Error reading .env file:', error);
      }
    }

    if (!apiKey) {
      throw new Error('API_KEY_INVALID: GEMINI_API_KEY environment variable is not set');
    }
    
    console.log('Initializing GeminiService with API key:', apiKey ? 'Key exists' : 'No key found');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      console.log('Sending prompt to Gemini:', prompt.substring(0, 100) + '...');
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Received response from Gemini:', text.substring(0, 100) + '...');
      return text;
    } catch (error) {
      console.error('Error generating content:', error);
      return ''; // Return empty string on error
    }
  }
} 