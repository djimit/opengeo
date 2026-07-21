export type LLMLevel = 0 | 1 | 2 | 3

export interface LLMProvider {
  level: LLMLevel
  name: string
  analyze(prompt: string): Promise<string>
}

export interface LLMConfig {
  level: LLMLevel
  ollamaUrl?: string
  ollamaModel?: string
  apiKey?: string
  apiBaseUrl?: string
  apiModel?: string
}

// Level 0: No AI — deterministic rules only
export class NoLLMProvider implements LLMProvider {
  level = 0 as const
  name = "none"
  async analyze(): Promise<string> {
    return ""
  }
}

// Level 1: Local embedding model via Ollama
export class OllamaEmbeddingProvider implements LLMProvider {
  level = 1 as const
  name = "ollama-embedding"
  private url: string
  private model: string

  constructor(url: string, model: string) {
    this.url = url.replace(/\/$/, "")
    this.model = model
  }

  async analyze(prompt: string): Promise<string> {
    const res = await fetch(`${this.url}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt }),
    })
    if (!res.ok) return ""
    const data = (await res.json()) as { embedding?: number[] }
    return JSON.stringify(data.embedding ?? [])
  }
}

// Level 2: Local LLM via Ollama
export class OllamaLLMProvider implements LLMProvider {
  level = 2 as const
  name = "ollama-llm"
  private url: string
  private model: string

  constructor(url: string, model: string) {
    this.url = url.replace(/\/$/, "")
    this.model = model
  }

  async analyze(prompt: string): Promise<string> {
    const res = await fetch(`${this.url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt, stream: false }),
    })
    if (!res.ok) return ""
    const data = (await res.json()) as { response?: string }
    return data.response ?? ""
  }
}

// Level 3: External API (OpenAI-compatible)
export class ExternalAPIProvider implements LLMProvider {
  level = 3 as const
  name = "external-api"
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/$/, "")
    this.model = model
  }

  async analyze(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      }),
    })
    if (!res.ok) return ""
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content ?? ""
  }
}

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.level) {
    case 0:
      return new NoLLMProvider()
    case 1:
      return new OllamaEmbeddingProvider(
        config.ollamaUrl ?? "http://localhost:11434",
        config.ollamaModel ?? "nomic-embed-text",
      )
    case 2:
      return new OllamaLLMProvider(
        config.ollamaUrl ?? "http://localhost:11434",
        config.ollamaModel ?? "qwen2.5:14b-instruct-q4_K_M",
      )
    case 3:
      if (!config.apiKey) throw new Error("API key required for Level 3 LLM provider")
      return new ExternalAPIProvider(
        config.apiKey,
        config.apiBaseUrl ?? "https://api.openai.com/v1",
        config.apiModel ?? "gpt-4o-mini",
      )
  }
}
