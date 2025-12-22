import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getModel = () => process.env.OPENAI_MODEL || 'gpt-4';

export async function streamChat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: getModel(),
    messages,
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullResponse += content;
      onChunk(content);
    }
  }
  return fullResponse;
}

export async function generateCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: getModel(),
    messages,
  });
  return response.choices[0]?.message?.content || '';
}

export default openai;
