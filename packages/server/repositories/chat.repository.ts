import type { Content } from '@google/generative-ai';

/**
 * This is our in-memory "database" for storing chat histories.
 * We define the types explicitly: the key is a string (conversationId),
 * and the value is an array of Content objects (the history).
 */
const chatHistories = new Map<string, Content[]>();

/**
 * The repository object encapsulates all data access logic.
 * Any other part of our app that needs to interact with chat history
 * will go through this object.
 */
export const chatRepository = {
   /**
    * Retrieves the history for a given conversation ID.
    * @param conversationId The unique ID of the conversation.
    * @returns The history array, or undefined if not found.
    */
   getHistory(conversationId: string): Content[] | undefined {
      return chatHistories.get(conversationId);
   },

   /**
    * Sets or updates the history for a given conversation ID.
    * @param conversationId The unique ID of the conversation.
    * @param history The full history array to save.
    */
   setHistory(conversationId: string, history: Content[]): void {
      chatHistories.set(conversationId, history);
   },
};
