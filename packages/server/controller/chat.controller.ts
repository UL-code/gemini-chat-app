import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import z from 'zod';

//implementaion details
// Define the schema for input validation using zod
const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt cannot be empty')
      .max(3500, 'Prompt is too long(max 3500 characters)'),

   conversationId: z.string().uuid(),
});

//public interface
export const chatController = {
   async sendMessage(req: Request, res: Response) {
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
   },
};
