// store/useAiChatStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { chatCompletions } from "@/services/ai/client";
import { AI_TOOLS, executeAiTool } from "@/services/ai/tools";
import { getPresetById } from "@/services/ai/presets";
import type { AiConfig, AiMessage } from "@/services/ai/types";
import { useAuthStore } from "./useAuthStore";

const SECURE_AI_KEY = "moneymentor_ai_api_key";
const SECURE_AI_CONFIG = "moneymentor_ai_config";

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

interface AiChatState {
  messages: AiChatMessage[];
  isSending: boolean;
  error: string | null;
  config: AiConfig | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  saveConfig: (partial: {
    providerId: string;
    baseUrl: string;
    model: string;
    apiKey?: string | null;
    systemPrompt?: string;
  }) => Promise<void>;
  clearConfig: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  appendMessage: (content: string, role?: "user" | "assistant") => void;
  clearChat: () => void;
  removeMessage: (id: string) => void;
  clearError: () => void;
}

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente financiero personal integrado en MoneyMentor, una app de finanzas personales.

PRINCIPIOS DE PRIVACIDAD:
- Nunca pidas ni adivines datos personales (nombres, correos, tarjetas, números de cuenta).
- Solo usa las herramientas disponibles para consultar datos del usuario. Nunca inventes cifras.
- Si el usuario pide algo para lo que no hay herramienta, responde que no tienes acceso a ese dato.
- Responde SIEMPRE en español, de forma clara y breve.
- Los montos vienen formateados en pesos colombianos (COP).

Las herramientas disponibles te dan: balance total, resumen mensual de ingresos/gastos, gastos por categoría, transacciones recientes (sin descripción), metas, próximos recordatorios y el resumen de una importación de extracto bancario que el usuario tenga pendiente por confirmar.

Consejos de comportamiento:
- Sé proactivo sugiriendo formas de ahorrar, detectar gastos excesivos o mejorar metas, pero solo con datos reales de las herramientas.
- Si no hay datos suficientes, dilo con honestidad.`;

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isSending: false,
      error: null,
      config: null,
      hydrated: false,

      hydrate: async () => {
        try {
          const rawConfig = await SecureStore.getItemAsync(SECURE_AI_CONFIG);
          if (rawConfig) {
            set({ config: JSON.parse(rawConfig) });
          }
        } catch (error) {
          console.error("❌ Error hidratando configuración IA:", error);
        } finally {
          set({ hydrated: true });
        }
      },

      saveConfig: async ({ providerId, baseUrl, model, apiKey, systemPrompt }) => {
        const preset = getPresetById(providerId);
        const nextConfig: AiConfig = {
          providerId,
          baseUrl: baseUrl || preset?.baseUrl || "",
          model: model || preset?.defaultModel || "",
          apiKey: apiKey ?? get().config?.apiKey ?? null,
          systemPrompt: systemPrompt ?? get().config?.systemPrompt,
        };

        if (apiKey === "" || apiKey === null) {
          nextConfig.apiKey = null;
          await SecureStore.deleteItemAsync(SECURE_AI_KEY);
        } else if (apiKey && apiKey !== "•••") {
          nextConfig.apiKey = apiKey;
          await SecureStore.setItemAsync(SECURE_AI_KEY, apiKey);
        }

        await SecureStore.setItemAsync(SECURE_AI_CONFIG, JSON.stringify(nextConfig));
        set({ config: nextConfig });
      },

      clearConfig: async () => {
        await SecureStore.deleteItemAsync(SECURE_AI_KEY);
        await SecureStore.deleteItemAsync(SECURE_AI_CONFIG);
        set({ config: null });
      },

      clearChat: () => set({ messages: [] }),

      appendMessage: (content, role = "assistant") => {
        if (!content?.trim()) return;
        const message: AiChatMessage = {
          id: `${role === "user" ? "u" : "a"}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          role,
          content: content.trim(),
          createdAt: Date.now(),
        };
        set((state) => ({ messages: [...state.messages, message] }));
      },

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        })),

      clearError: () => set({ error: null }),

      sendMessage: async (text) => {
        const { config, messages, isSending } = get();
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        if (!config?.baseUrl || !config.model) {
          set({ error: "Configura tu proveedor de IA primero." });
          return;
        }

        const userId = useAuthStore.getState().userId;

        const userMessage: AiChatMessage = {
          id: `u-${Date.now()}`,
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        };

        set({ messages: [...messages, userMessage], isSending: true, error: null });

        const history: AiMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        try {
          const reply = await chatCompletions(
            config,
            {
              messages: [
                { role: "system", content: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
                ...history,
                { role: "user", content: trimmed },
              ],
              tools: AI_TOOLS,
            },
            (name, args) => executeAiTool(name, args, userId ?? ""),
          );

          const assistantMessage: AiChatMessage = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: reply,
            createdAt: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isSending: false,
          }));
        } catch (error: any) {
          console.error("❌ Error enviando mensaje IA:", error);
          set({
            isSending: false,
            error: error?.message ?? "No se pudo conectar con el proveedor de IA",
          });
        }
      },
    }),
    {
      name: "money-mentor-ai-chat",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ messages: state.messages }),
    },
  ),
);
