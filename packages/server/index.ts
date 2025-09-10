import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import {
   GoogleGenerativeAI,
   HarmCategory,
   HarmBlockThreshold,
} from '@google/generative-ai';

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

// This Map will store the history of each conversation.
// Key: conversationId (string), Value: History array (Content[])
const chatHistories = new Map();

app.post('/api/chat', async (req: Request, res: Response) => {
   try {
      // 1. Get the prompt AND a conversationId from the client
      const { prompt, conversationId } = req.body;

      if (!prompt || !conversationId) {
         return res
            .status(400)
            .json({ error: 'A "prompt" and "conversationId" are required.' });
      }

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
      const history = chatHistories.get(conversationId) || [];

      // Only take the last 10 items to keep the context relevant and token count low
      const recentHistory = history.slice(-10);

      // 3. Start a new chat session with the model, providing the past history
      const chat = model.startChat({
         history: recentHistory,
      });

      // 4. Send the user's new prompt to the chat session
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();

      // 5. Save the updated history back to our Map
      const updatedHistory = await chat.getHistory();
      chatHistories.set(conversationId, updatedHistory);

      res.json({ prompt: text });
   } catch (error) {
      console.error('Error in /api/chat:', error);
      res.status(500).json({ error: 'Failed to generate chat response.' });
   }
});

app.listen(port, () => {
   console.log(`Server is running at http://localhost:${port}`);
});
