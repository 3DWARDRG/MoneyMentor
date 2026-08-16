// services/ai/presets.ts
import type { AiProviderPreset } from "./types";

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "gpt-4o-mini, gpt-4o, o3-mini…",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    needsApiKey: true,
    isLocal: false,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Acceso a cientos de modelos con una sola key",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    needsApiKey: true,
    isLocal: false,
  },
  {
    id: "groq",
    label: "Groq",
    description: "Modelos rápidos y gratuitos (llama, qwen…)",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-8b-instant",
    needsApiKey: true,
    isLocal: false,
  },
  {
    id: "ollama",
    label: "Ollama (app local)",
    description: "Ejecuta modelos en tu computador o dispositivo",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    needsApiKey: false,
    isLocal: true,
  },
  {
    id: "lmstudio",
    label: "LM Studio (app local)",
    description: "Servidor OpenAI-compatible de LM Studio",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    needsApiKey: false,
    isLocal: true,
  },
  {
    id: "custom",
    label: "Endpoint personalizado",
    description: "Cualquier API compatible con OpenAI",
    baseUrl: "",
    defaultModel: "",
    needsApiKey: false,
    isLocal: false,
  },
];

export const getPresetById = (id: string): AiProviderPreset | undefined =>
  AI_PROVIDER_PRESETS.find((p) => p.id === id);
