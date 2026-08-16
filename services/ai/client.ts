// services/ai/client.ts
import type {
  AiConfig,
  AiMessage,
  ChatRequest,
  ChatCompletionResponse,
} from "./types";

const MAX_TOOL_ITERATIONS = 8;

export class AiClientError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiClientError";
    this.status = status;
  }
}

export class AiNotConfiguredError extends AiClientError {
  constructor() {
    super("Asistente no configurado. Configura tu proveedor de IA primero.");
    this.name = "AiNotConfiguredError";
  }
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const buildHeaders = (config: AiConfig): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
};

/**
 * Llama al endpoint /chat/completions (compatible con OpenAI, OpenRouter,
 * Groq, Ollama y LM Studio). Devuelve el texto final del asistente.
 * Si el modelo responde con tool_calls, se ejecutan vía `executeTool`
 * hasta agotar MAX_TOOL_ITERATIONS o que el modelo devuelva texto.
 */
export async function chatCompletions(
  config: AiConfig,
  request: ChatRequest,
  executeTool: (name: string, args: any) => Promise<string>,
  onDelta?: (delta: string) => void,
): Promise<string> {
  if (!config.baseUrl || !config.model) {
    throw new AiNotConfiguredError();
  }

  const messages: AiMessage[] = [...request.messages];
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    const body: any = {
      model: config.model,
      messages,
    };
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice ?? "auto";
    }

    const response = await fetch(
      `${normalizeBaseUrl(config.baseUrl)}/chat/completions`,
      {
        method: "POST",
        headers: buildHeaders(config),
        body: JSON.stringify(body),
      },
    );

    const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

    if (!response.ok) {
      const message =
        data?.error?.message || `Error HTTP ${response.status} del proveedor de IA`;
      throw new AiClientError(message, response.status);
    }

    const choice = data.choices?.[0];
    if (!choice) {
      throw new AiClientError("Respuesta vacía del proveedor de IA");
    }

    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return assistantMessage.content ?? "";
    }

    // Ejecuta cada tool solicitada y devuelve los resultados al modelo
    for (const toolCall of toolCalls) {
      let result = "";
      try {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        result = await executeTool(toolCall.function.name, args);
      } catch (error: any) {
        result = JSON.stringify({ ok: false, error: error?.message ?? "Error" });
      }
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
        name: toolCall.function.name,
      });
    }

    iterations += 1;
  }

  throw new AiClientError("El asistente no terminó después de varias iteraciones");
}
