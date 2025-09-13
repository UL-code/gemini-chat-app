import fs from 'fs';
import path from 'path';
import {
   GoogleGenerativeAI,
   HarmCategory,
   HarmBlockThreshold,
} from '@google/generative-ai';
import type { Content } from '@google/generative-ai';
import { chatRepository } from '../repositories/chat.repository';
import template from '../prompts/chatbot.txt';

if (!process.env.GEMINI_API_KEY) {
   throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const storeInfo = fs.readFileSync(
   path.join(__dirname, '../prompts/store-info.md'),
   'utf-8'
);
const systemInstruction = template.replace('{{storeInfo}}', storeInfo);

// Define a threshold for when to summarize. Let's use 20 messages.
const SUMMARY_THRESHOLD = 20;

async function summarizeHistoryIfNeeded(
   history: Content[]
): Promise<Content[]> {
   if (history.length > SUMMARY_THRESHOLD) {
      console.log(
         `[Service] History length (${history.length}) exceeded threshold. Summarizing...`
      );
      try {
         const summaryModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-pro',
         });
         const conversationText = history
            .map(
               (item) =>
                  `${item.role}: ${item.parts.map((part) => part.text).join(' ')}`
            )
            .join('\n');
         const summaryPrompt = `Please summarize the following conversation concisely. Capture the key points, user intent, and important information exchanged. This summary will be used as context for a continuing conversation.\n\n---\n\n${conversationText}`; // Your full prompt
         const result = await summaryModel.generateContent(summaryPrompt);
         const summaryText = result.response.text();
         console.log(`[Service] Generated summary: ${summaryText}`);
         return [
            {
               role: 'user',
               parts: [
                  { text: `Summary of conversation so far: ${summaryText}` },
               ],
            },
         ];
      } catch (error) {
         console.error('[Service] Error during summarization:', error);
         return history.slice(-10);
      }
   }
   return history;
}

// This is the public interface
export const chatService = {
   /**
    * Handles the core logic of processing a chat message.
    * @param prompt The user's message.
    * @param conversationId The ID of the current conversation.
    * @returns The AI's response message.
    */
   async sendMessage(prompt: string, conversationId: string): Promise<string> {
      const model = genAI.getGenerativeModel({
         model: 'gemini-2.5-flash',
         systemInstruction,
         safetySettings: [
            {
               category: HarmCategory.HARM_CATEGORY_HARASSMENT,
               threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
               category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
               threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
               category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
               threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
               category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
               threshold: HarmBlockThreshold.BLOCK_NONE,
            },
         ],
         generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
         },
      });

      let history = chatRepository.getHistory(conversationId) || [];
      history = await summarizeHistoryIfNeeded(history);

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();

      const updatedHistory = await chat.getHistory();
      chatRepository.setHistory(conversationId, updatedHistory);

      return text;
   },
};
