# AI Chatbot Project

This project is an AI-powered chatbot that uses Google's Generative AI to provide intelligent and context-aware responses. It features a client-server architecture, with a React-based frontend and a Node.js backend.

## Project Structure

The project is a monorepo with the following structure:

-   `packages/client`: Contains the frontend React application.
-   `packages/server`: Contains the backend Node.js application, including the AI logic.

## Project Setup

To get the project up and running, follow these steps:

### 1. Install Dependencies

This project uses `bun` as the package manager. To install the dependencies for both the client and server, run the following command from the root directory:

```bash
bun install
```

### 2. Set Up Environment Variables

The server requires a Gemini API key to connect to the Google Generative AI service.

1.  Navigate to the `packages/server` directory.
2.  Rename the `.env example` file to `.env`.
3.  Open the `.env` file and replace `your_gemini_api_key_here` with your actual Gemini API key.

**File:** `packages/server/.env`

```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Configuration

You can customize the chatbot's behavior by modifying the following files in the `packages/server` directory.

### Changing the Answer Model

To change the AI model used for generating answers, edit the `model` property in the `sendMessage` function.

**File:** `packages/server/services/chat.service.ts`

```typescript
// packages/server/services/chat.service.ts

// ...

export const chatService = {
  async sendMessage(prompt: string, conversationId: string): Promise<string> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // <-- Change this value
      // ...
    });
    // ...
  },
};
```

### Changing the Summary Threshold

The conversation history is summarized when the number of messages exceeds a certain threshold. To change this threshold, modify the `SUMMARY_THRESHOLD` constant.

**File:** `packages/server/services/chat.service.ts`

```typescript
// packages/server/services/chat.service.ts

// ...

// Define a threshold for when to summarize. Let's use 20 messages.
const SUMMARY_THRESHOLD = 20; // <-- Change this value

// ...
```

### Changing the Summary Model

To change the AI model used for summarizing the conversation, edit the `model` property in the `summarizeHistoryIfNeeded` function.

**File:** `packages/server/services/chat.service.ts`

```typescript
// packages/server/services/chat.service.ts

// ...

async function summarizeHistoryIfNeeded(
  history: Content[]
): Promise<Content[]> {
  if (history.length > SUMMARY_THRESHOLD) {
    // ...
    const summaryModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro', // <-- Change this value
    });
    // ...
  }
  return history;
}

// ...
```

### Changing the Custom Instructions

You can provide custom instructions to the chatbot by editing the `chatbot.txt` file. This file contains the base prompt for the AI.

**File:** `packages/server/prompts/chatbot.txt`

### Changing the Store Information

The `store-info.md` file contains the system information that is injected into the `chatbot.txt` prompt. You can edit this file to provide the chatbot with specific knowledge about your store or business.

**File:** `packages/server/prompts/store-info.md`

## Running the Project


**In the root directory type:**

```bash
bun run dev
```

