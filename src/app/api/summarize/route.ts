import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return Response.json(
        { error: '请提供文章内容' },
        { status: 400 }
      );
    }

    // 截取内容防止超长（取前 4000 字符）
    const truncatedContent = content.slice(0, 4000);

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system:
        '你是一个文章摘要生成助手。请根据提供的文章内容生成一段简洁的中文摘要，100字以内，' +
        '直接返回摘要文本，不要加任何前缀、说明或格式标记。',
      prompt: `请为以下文章生成摘要：\n\n${truncatedContent}`,
    });

    return Response.json({ summary: text.trim() });
  } catch {
    return Response.json(
      { error: '生成摘要失败，请稍后重试' },
      { status: 500 }
    );
  }
}
