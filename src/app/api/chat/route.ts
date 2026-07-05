import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system:
      '你是 GriverWorld 站长的 AI 助手。你的职责是帮助访问者了解本站内容、回答技术问题、提供友好的交流。' +
      '请使用中文回复，语气亲切、专业。如果被问到你不了解的问题，诚实说明并尝试提供有用的建议。',
    messages,
  });

  return result.toTextStreamResponse();
}
