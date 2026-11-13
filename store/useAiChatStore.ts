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

// Cada usuario tiene SU propia config y SU propia API key: las claves de
// SecureStore se sufijan con el userId para no compartir datos entre perfiles.
const secureAiKey = (userId: string) => `moneymentor_ai_api_key_${userId}`;
const secureAiConfig = (userId: string) => `moneymentor_ai_config_${userId}`;

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

interface AiChatState {
  /** Historial por usuario: nunca se mezclan chats entre perfiles. */
  messagesByUser: Record<string, AiChatMessage[]>;
  isSending: boolean;
  error: string | null;

  config: AiConfig | null;
  /** Usuario al que pertenece la `config` cargada. */
  configUserId: string | null;

  updateConfig: (newConfig: AiConfig | null, newId: string | null) => void;
  saveConfig: (partial: {
    providerId: string;
    baseUrl: string;
    model: string;
    apiKey?: string | null;
    systemPrompt?: string;
  }) => Promise<void>;
  clearConfig: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  appendMessage: (content: string, id:string, role?: "user" | "assistant") => void;
  clearChat: (id:string) => void;
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
    (set, get) => {
      // El usuario activo: SIEMPRE el de auth (evita escribir en el perfil
      // anterior si el nuevo aún no termina de hidratar). `configUserId` solo
      // sirve de respaldo si auth aún está vacío pero ya hay config cargada.
      return {
        messagesByUser: {},
        isSending: false,
        error: null,
        config: null,
        configUserId: null,

        updateConfig: (newConfig, newId) =>
          set({ config: newConfig, configUserId: newId }),

        saveConfig: async ({
          providerId,
          baseUrl,
          model,
          apiKey,
          systemPrompt,
        }) => {
          const uid = useAuthStore.getState().userId ?? "";
          // Nunca reutilizamos la config de OTRO usuario.
          const currentConfig =
            get().configUserId === uid ? get().config : null;
          const preset = getPresetById(providerId);
          const nextConfig: AiConfig = {
            providerId,
            baseUrl: baseUrl || preset?.baseUrl || "",
            model: model || preset?.defaultModel || "",
            apiKey: apiKey ?? currentConfig?.apiKey ?? null,
            systemPrompt: systemPrompt ?? currentConfig?.systemPrompt,
          };

          if (apiKey === "" || apiKey === null) {
            nextConfig.apiKey = null;
            await SecureStore.deleteItemAsync(secureAiKey(uid));
          } else if (apiKey && apiKey !== "•••") {
            nextConfig.apiKey = apiKey;
            await SecureStore.setItemAsync(secureAiKey(uid), apiKey);
          }

          await SecureStore.setItemAsync(
            secureAiConfig(uid),
            JSON.stringify(nextConfig),
          );
          set({ config: nextConfig, configUserId: uid });
        },

        clearConfig: async (id: string) => {
          
          if (id) {
            await SecureStore.deleteItemAsync(secureAiKey(id));
            await SecureStore.deleteItemAsync(secureAiConfig(id));
          }
          set({ config: null, configUserId: null });
        },

        clearChat: (id) => {

          if (!id) return;
          set((state) => ({
            messagesByUser: { ...state.messagesByUser, [id]: [] },
          }));
        },

        appendMessage: (content, id:string, role = "assistant" ) => {
          if (!content?.trim()) return;

          if (!id) return;
          const message: AiChatMessage = {
            id: `${role === "user" ? "u" : "a"}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,
            role,
            content: content.trim(),
            createdAt: Date.now(),
          };
          set((state) => ({
            messagesByUser: {
              ...state.messagesByUser,
              [id]: [...(state.messagesByUser[id] ?? []), message].slice(
                -200,
              ),
            },
          }));
        },

        removeMessage: (id) => {
          set((state) => ({
            messagesByUser: {
              ...state.messagesByUser,
              [id]: (state.messagesByUser[id] ?? []).filter(
                (m) => m.id !== id,
              ),
            },
          }));
        },

        clearError: () => set({ error: null }),

        sendMessage: async (text) => {
          const { config, isSending } = get();
          const trimmed = text.trim();
          if (!trimmed || isSending) return;

          if (!config?.baseUrl || !config.model) {
            set({ error: "Configura tu proveedor de IA primero." });
            return;
          }

          const userId = useAuthStore.getState().userId ?? "";
          const messages = get().messagesByUser[userId] ?? [];

          const userMessage: AiChatMessage = {
            id: `u-${Date.now()}`,
            role: "user",
            content: trimmed,
            createdAt: Date.now(),
          };

          set({
            messagesByUser: {
              ...get().messagesByUser,
              [userId]: [...messages, userMessage],
            },
            isSending: true,
            error: null,
          });

          const history: AiMessage[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          try {
            const reply = await chatCompletions(
              config,
              {
                messages: [
                  {
                    role: "system",
                    content: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
                  },
                  ...history,
                  { role: "user", content: trimmed },
                ],
                tools: AI_TOOLS,
              },
              (name, args) => executeAiTool(name, args, userId),
            );

            const assistantMessage: AiChatMessage = {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: reply,
              createdAt: Date.now(),
            };

            set((state) => ({
              messagesByUser: {
                ...state.messagesByUser,
                [userId]: [
                  ...(state.messagesByUser[userId] ?? []),
                  assistantMessage,
                ],
              },
              isSending: false,
            }));
          } catch (error: any) {
            console.error("❌ Error enviando mensaje IA:", error);
            set({
              isSending: false,
              error:
                error?.message ?? "No se pudo conectar con el proveedor de IA",
            });
          }
        },
      };
    },
    {
      // v2: antes se persistía un `messages` global compartido entre usuarios;
      // ahora cada perfil tiene su propio slice en `messagesByUser`.
      name: "money-mentor-ai-chat",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // Clonamos el estado que viene del teléfono
        let state = { ...persistedState };

        if (version === 0) {
          if (state.messages !== undefined) {
            state.messagesByUser = state.messages;
            delete state.messages;
          }
        }

        if (version < 2) {
          // Borramos la variable fantasma del disco duro
          delete persistedState.hydrated;
        }


        // Retornamos el objeto limpio para que Zustand lo use
        return state;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ messagesByUser: state.messagesByUser }),
    },
  ),
);
