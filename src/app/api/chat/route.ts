import { createOpenAI } from '@ai-sdk/openai';
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';

export const maxDuration = 30;

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 将 AI SDK UI 的 parts 格式转换为 streamText 的 content 格式
  const convertedMessages = messages.map(
    (msg: {
      role: string;
      content?: string;
      parts?: Array<{ type: string; text: string }>;
    }) => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      const text =
        msg.parts
          ?.filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('') || '';
      return { role: msg.role, content: text };
    },
  );

  const result = streamText({
    model: openai('qwen-plus'),
    system:
      '你是 GriverWorld 站长的 AI 助手。你的职责是帮助访问者了解本站内容、回答技术问题、提供友好的交流。' +
      '请使用中文回复，语气亲切、专业。如果被问到你不了解的问题，诚实说明并尝试提供有用的建议。',
    messages: convertedMessages,
  });

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        writer.merge(toUIMessageStream({ stream: result.stream }));
      },
    }),
  });
}
