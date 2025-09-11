import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import {
   GoogleGenerativeAI,
   HarmCategory,
   HarmBlockThreshold,
} from '@google/generative-ai';
import type { Content } from '@google/generative-ai';
import z from 'zod';
import { chatRepository } from './repositories/chat.repository';

// Load environment variables from .env file
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
   throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

// Now you can safely initialize the client, knowing the key exists.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

app.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello from the API!' });
});

// Define a threshold for when to summarize. Let's use 20 messages.
const SUMMARY_THRESHOLD = 20;

/**
 * Checks if a conversation history is long enough to be summarized,
 * and if so, generates and returns a new, summarized history.
 * @param {Content[]} history The conversation history.
 * @returns {Promise<Content[]>} The (potentially summarized) history.
 */
async function summarizeHistoryIfNeeded(
   history: Content[]
): Promise<Content[]> {
   // 1. Check if the history has reached our trigger length.
   if (history.length > SUMMARY_THRESHOLD) {
      console.log(
         `[Server] History length (${history.length}) exceeded threshold. Summarizing...`
      );

      try {
         // 2. Create a dedicated model instance for the summarization task.
         const summaryModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-pro',
         });

         // 3. Combine the history into a single string for the prompt.
         const conversationText = history
            .map(
               (item) =>
                  `${item.role}: ${item.parts.map((part) => part.text).join(' ')}`
            )
            .join('\n');

         // 4. Create a specific prompt to instruct the model.
         const summaryPrompt = `Please summarize the following conversation concisely. Capture the key points, user intent, and important information exchanged. This summary will be used as context for a continuing conversation.\n\n---\n\n${conversationText}`;

         // 5. Make the dedicated AI call to generate the summary.
         const result = await summaryModel.generateContent(summaryPrompt);
         const summaryText = result.response.text();

         console.log(`[Server] Generated summary: ${summaryText}`);

         // 6. Return a new, compact history array containing only the summary.
         // We frame it as a "user" message to provide context for the model.
         return [
            {
               role: 'user',
               parts: [
                  {
                     text: `This is a summary of our conversation so far: ${summaryText}`,
                  },
               ],
            },
         ];
      } catch (error) {
         console.error('[Server] Error during summarization:', error);
         // If summarization fails, just return the original (but truncated) history.
         return history.slice(-10);
      }
   }
   // If the threshold isn't met, return the original history.
   return history;
}

// Define the schema for input validation using zod
const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt cannot be empty')
      .max(3500, 'Prompt is too long(max 3500 characters)'),

   conversationId: z.string().uuid(),
});

app.post('/api/chat', async (req: Request, res: Response) => {
   // Validate the incoming request body
   const validation = chatSchema.safeParse(req.body);
   if (!validation.success) {
      res.status(400).json(validation.error.format());
      return;
   }

   try {
      // 1. Get the prompt AND a conversationId from the client
      const { prompt, conversationId } = req.body;
      const model = genAI.getGenerativeModel({
         model: 'gemini-2.5-flash',
         systemInstruction:
            'You are a friendly and helpful chatbot. Your goal is to be concise. Keep all answers under 750 tokens to ensure they are complete.',
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

      // 2. Retrieve the history for this conversationId, or start a new one
      let history = chatRepository.getHistory(conversationId) || [];

      //Call our new function to summarize if needed.
      history = await summarizeHistoryIfNeeded(history);

      // 3. Start a new chat session with the model, providing the past history
      const chat = model.startChat({
         history: history, // Use the potentially summarized history
      });

      // 4. Send the user's new prompt to the chat session
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();

      // 5. Save the updated history back to our Map
      const updatedHistory = await chat.getHistory();
      chatRepository.setHistory(conversationId, updatedHistory);

      res.json({ prompt: text });
   } catch (error) {
      console.error('Error in /api/chat:', error);
      res.status(500).json({ error: 'Failed to generate chat response.' });
   }
});

app.listen(port, () => {
   console.log(`Server is running at http://localhost:${port}`);
});
