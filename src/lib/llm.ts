import OpenAI from "openai"

/**
 * Klien LLM via endpoint OpenAI-compatible Alibaba DashScope — pola yang sama
 * dengan ai-tools-api. Model default glm-5.2, bisa diganti lewat LLM_MODEL.
 */
export const LLM_MODEL = process.env.LLM_MODEL ?? "glm-5.2"

export function isLlmConfigured(): boolean {
  return !!process.env.DASHSCOPE_API_KEY
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  client ??= new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY ?? "",
    baseURL:
      process.env.DASHSCOPE_BASE_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
  })
  return client
}

export interface LlmUsage {
  tokensIn: number
  tokensOut: number
}

/**
 * Completion JSON. glm-5.2 adalah reasoning model; tanpa enable_thinking:false
 * seluruh budget habis untuk reasoning dan content kosong.
 * Caller wajib memvalidasi object hasil parse.
 */
export async function generateObject(args: {
  system: string
  prompt: string
  maxTokens?: number
}): Promise<{ object: unknown; usage: LlmUsage }> {
  const res = await getClient().chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: args.maxTokens,
    enable_thinking: false,
  } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming)
  const content = res.choices[0]?.message?.content ?? ""
  return {
    object: JSON.parse(content),
    usage: {
      tokensIn: res.usage?.prompt_tokens ?? 0,
      tokensOut: res.usage?.completion_tokens ?? 0,
    },
  }
}
