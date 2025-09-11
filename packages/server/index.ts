import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import z from 'zod';
import { chatService } from './services/chat.service';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

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
      const { prompt, conversationId } = validation.data;

      // Call the service to do all the heavy lifting.
      const responseText = await chatService.sendMessage(
         prompt,
         conversationId
      );

      // The controller's only job is to send the response.
      res.json({ prompt: responseText });
   } catch (error) {
      console.error('Error in /api/chat route:', error);
      res.status(500).json({ error: 'Failed to generate chat response.' });
   }
});

app.listen(port, () => {
   console.log(`Server is running at http://localhost:${port}`);
});
