// services/ai/types.ts

export type AiRole = "system" | "user" | "assistant" | "tool";

export interface AiMessage {
  role: AiRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AiToolCall[];
}

export interface AiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AiToolParameterProperty {
  type?: string;
  description?: string;
  enum?: string[];
}

export interface AiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, AiToolParameterProperty>;
      required?: string[];
    };
  };
}

export interface AiProviderPreset {
  id: string;
  label: string;
  description: string;
  baseUrl: string;
  defaultModel: string;
  needsApiKey: boolean;
  isLocal: boolean;
}

export interface AiConfig {
  providerId: string;
  baseUrl: string;
  model: string;
  apiKey: string | null;
  systemPrompt?: string;
}

export interface ChatRequest {
  messages: AiMessage[];
  tools?: AiToolDefinition[];
  toolChoice?: "auto" | "none";
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: AiMessage;
    finish_reason: string;
  }[];
  error?: {
    message: string;
    type?: string;
  };
}

export interface ToolExecutionResult {
  ok: boolean;
  content: string;
}
