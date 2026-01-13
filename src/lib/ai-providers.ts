import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

type AIProvider = 'openai' | 'gemini' | 'claude';

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  responseFormat?: { type: 'json_object' } | { type: 'text' };
}

interface ChatCompletionResult {
  content: string;
  provider: AIProvider;
}

// プロバイダーの優先順位（環境変数から設定可能）
function getProviderPriority(): AIProvider[] {
  const priority = process.env.AI_PROVIDER_PRIORITY || 'openai,gemini,claude';
  return priority.split(',').map(p => p.trim()) as AIProvider[];
}

// OpenAIクライアントの取得
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Geminiクライアントの取得
function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// Claudeクライアントの取得
function getClaudeClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// OpenAIモデル名の取得
function getOpenAIModel(): string {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
  if (!validModels.includes(model)) {
    return 'gpt-4o-mini';
  }
  return model;
}

// Geminiモデル名の取得
function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

// Claudeモデル名の取得
function getClaudeModel(): string {
  return process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
}

// OpenAIでチャット完了
async function chatWithOpenAI(
  messages: ChatCompletionMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI API key is not set');
  }

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await client.chat.completions.create({
    model: options.model || getOpenAIModel(),
    messages: openaiMessages,
    temperature: options.temperature ?? 0.7,
    response_format: options.responseFormat as any,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    provider: 'openai',
  };
}

// Geminiでチャット完了
async function chatWithGemini(
  messages: ChatCompletionMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API key is not set');
  }

  const model = client.getGenerativeModel({
    model: options.model || getGeminiModel(),
  });

  // Gemini用にメッセージを変換
  // Geminiはsystemメッセージを直接サポートしていないので、最初のuserメッセージに統合
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  // 会話履歴を構築
  const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  
  // systemメッセージがある場合は、最初のuserメッセージに統合
  let systemContent = systemMessages.map(m => m.content).join('\n\n');
  
  for (let i = 0; i < nonSystemMessages.length; i++) {
    const msg = nonSystemMessages[i];
    if (msg.role === 'user') {
      // 最初のuserメッセージにsystemメッセージを統合
      const content = i === 0 && systemContent 
        ? `${systemContent}\n\n${msg.content}`
        : msg.content;
      history.push({ role: 'user', parts: [{ text: content }] });
    } else if (msg.role === 'assistant') {
      history.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }

  // 最後のメッセージを取得
  if (history.length === 0) {
    throw new Error('No messages to send');
  }

  const lastMessage = history.pop()!;
  const conversationHistory = history;

  // チャットセッションを開始
  const chat = model.startChat({
    history: conversationHistory,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      responseMimeType: options.responseFormat?.type === 'json_object' ? 'application/json' : 'text/plain',
    },
  });

  const result = await chat.sendMessage(lastMessage.parts[0].text);
  const response = await result.response;
  const text = response.text();

  return {
    content: text,
    provider: 'gemini',
  };
}

// Claudeでチャット完了
async function chatWithClaude(
  messages: ChatCompletionMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const client = getClaudeClient();
  if (!client) {
    throw new Error('Anthropic API key is not set');
  }

  // Claude用にメッセージを変換
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const claudeMessages: Anthropic.MessageParam[] = nonSystemMessages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const systemContent = systemMessages.map(m => m.content).join('\n\n');

  const response = await client.messages.create({
    model: options.model || getClaudeModel(),
    max_tokens: 4096,
    system: systemContent || undefined,
    messages: claudeMessages,
    temperature: options.temperature ?? 0.7,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return {
    content: content.text,
    provider: 'claude',
  };
}

// レート制限エラーかどうかを判定
function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message || '';
  return (
    error?.status === 429 ||
    errorMessage.includes('Rate limit') ||
    errorMessage.includes('requests per min (RPM)') ||
    errorMessage.includes('tokens per min (TPM)') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('429')
  );
}

// 複数プロバイダーでチャット完了（フォールバック付き）
export async function chatCompletion(
  messages: ChatCompletionMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const providers = getProviderPriority();
  const errors: Array<{ provider: AIProvider; error: Error }> = [];
  const availableProviders: AIProvider[] = [];

  // 利用可能なプロバイダーを確認
  for (const provider of providers) {
    switch (provider) {
      case 'openai':
        if (getOpenAIClient()) {
          availableProviders.push('openai');
        }
        break;
      case 'gemini':
        if (getGeminiClient()) {
          availableProviders.push('gemini');
        }
        break;
      case 'claude':
        if (getClaudeClient()) {
          availableProviders.push('claude');
        }
        break;
    }
  }

  // 利用可能なプロバイダーがない場合
  if (availableProviders.length === 0) {
    const missingKeys: string[] = [];
    if (!process.env.OPENAI_API_KEY) missingKeys.push('OPENAI_API_KEY');
    if (!process.env.GEMINI_API_KEY) missingKeys.push('GEMINI_API_KEY');
    if (!process.env.ANTHROPIC_API_KEY) missingKeys.push('ANTHROPIC_API_KEY');
    
    throw new Error(
      `No AI providers available. Please set at least one of the following environment variables: ${missingKeys.join(', ')}`
    );
  }

  // 利用可能なプロバイダーで試行
  for (const provider of availableProviders) {
    try {
      switch (provider) {
        case 'openai':
          return await chatWithOpenAI(messages, options);
        case 'gemini':
          return await chatWithGemini(messages, options);
        case 'claude':
          return await chatWithClaude(messages, options);
      }
    } catch (error: any) {
      errors.push({ provider, error });
      
      // レート制限エラーの場合は次のプロバイダーを試す
      if (isRateLimitError(error)) {
        console.warn(`Rate limit reached for ${provider}, trying next provider...`);
        continue;
      }
      
      // レート制限以外のエラーも次のプロバイダーを試す（より堅牢に）
      console.warn(`Error with ${provider}: ${error.message}, trying next provider...`);
      continue;
    }
  }

  // すべてのプロバイダーが失敗した場合
  if (errors.length > 0) {
    const errorMessages = errors.map(e => `${e.provider}: ${e.error.message}`).join('; ');
    throw new Error(`All AI providers failed. Errors: ${errorMessages}`);
  }
  
  // このケースは通常発生しないが、念のため
  throw new Error('No AI providers available or all providers failed');
}

// 利用可能なプロバイダーを取得
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (getOpenAIClient()) providers.push('openai');
  if (getGeminiClient()) providers.push('gemini');
  if (getClaudeClient()) providers.push('claude');
  return providers;
}
