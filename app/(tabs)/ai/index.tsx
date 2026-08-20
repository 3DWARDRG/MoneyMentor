import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import ImportVerificationModal from "@/components/ImportVerificationModal";
import PdfRasterizerBridge from "@/components/PdfRasterizerBridge";
import { useAiChatStore } from "@/store/useAiChatStore";
import { useImportStore } from "@/store/useImportStore";
import { useAuthStore } from "@/store/useAuthStore";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles } from "lucide-react-native";

const SUGGESTIONS = [
  "¿Cuál es mi balance total?",
  "¿Cuánto gasté este mes?",
  "Resumen de mis gastos por categoría",
  "¿Cómo va mi meta de ahorro?",
];

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);

export default function AiChatScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const bottomTabOffset = Platform.OS === "android" ? insets.bottom + 64 : 49;
  const {
    messages,
    isSending,
    error,
    config,
    hydrated,
    hydrate,
    sendMessage,
    appendMessage,
    clearChat,
    clearError,
  } = useAiChatStore();

  const {
    active: importActive,
    processing: importProcessing,
    error: importError,
    startImport,
    cancel: cancelImport,
    clearError: clearImportError,
  } = useImportStore();

  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);
  const listRef = useRef<ScrollView>(null);

  const userId = useAuthStore.getState().userId ?? "";

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Detecta el teclado: cuando está abierto la navbar se oculta, así que el
  // input ya no necesita margen extra y queda pegado al teclado.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Cronómetro del procesamiento: los PDFs escaneados pueden tardar, así que
  // se muestra el tiempo transcurrido para que no parezca que se colgó.
  useEffect(() => {
    if (!importProcessing) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [importProcessing]);

  useEffect(() => {
    if (messages.length > 0 || isSending) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isSending]);

  const canChat = !!config?.baseUrl && !!config.model;

  const handleSend = () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    sendMessage(text);
  };

  const openSettings = () => router.push("/ai/settings");

  const pickImage = async (source: "camera" | "library") => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.85,
          allowsEditing: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.85,
          allowsEditing: false,
        });
      }

      const uri = result?.assets?.[0]?.uri;
      if (result.canceled || !uri) return;
      await startImport(uri, "image", userId);
    } catch (error: any) {
      console.error("❌ Error adjuntando extracto:", error);
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      const uri = result?.assets?.[0]?.uri;
      if (result.canceled || !uri) return;
      await startImport(uri, "pdf", userId);
    } catch (error: any) {
      console.error("❌ Error adjuntando PDF:", error);
    }
  };

  const handleAttach = () => {
    setAttachMenuVisible(true);
  };

  const runPick = (fn: () => Promise<void>) => async () => {
    setAttachMenuVisible(false);
    await fn();
  };

  const handleImported = (result: { count: number; total: number }) => {
    appendMessage(
      `Se importaron ${result.count} movimientos por un total de ${formatCOP(
        result.total,
      )} COP. Puedes preguntarme sobre tus gastos o ingresos de este período.`,
    );
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
  };

  if (!hydrated) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ScreenBackdrop />
        <ActivityIndicator size="large" color="#4b9aff" />
      </SafeAreaView>
    );
  }

  const renderMessage = (item: (typeof messages)[number]) => {
    const isUser = item.role === "user";
    return (
      <View
        key={item.id}
        className={`mb-3 max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "self-end bg-accent dark:bg-accent-dark"
            : "self-start border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark"
        }`}
      >
        <Text
          className={`text-[15px] leading-snug ${
            isUser ? "text-white" : "text-ink dark:text-ink-dark"
          }`}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1">
      <ScreenBackdrop />
      <KeyboardAvoidingView
      className="flex-1"
        
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={listRef}
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View className="flex-row items-center">
            <Sparkles size={22} color={isDark ? "#58a5ff" : "#2563eb"} />
            <Text className="ml-2 text-2xl font-bold text-ink dark:text-ink-dark">
              Asistente IA
            </Text>
          </View>
          <Pressable
            onPress={openSettings}
            className="rounded-full border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-2"
          >
            <Text className="text-sm font-medium text-ink dark:text-ink-dark">
              Configurar
            </Text>
          </Pressable>
        </View>

        {/* Cuerpo */}
        {!canChat ? (
          <View className="flex-1 items-center justify-center px-6">
            <Sparkles size={48} color="#4b9aff" />
            <Text className="mt-4 text-lg font-semibold text-ink dark:text-ink-dark">
              Configura tu asistente
            </Text>
            <Text className="mt-2 text-center text-sm leading-relaxed text-muted dark:text-muted-dark">
              Conecta una API key (OpenAI, OpenRouter, Groq…) o una app de IA
              instalada en tu dispositivo (Ollama, LM Studio) para chatear con
              tus finanzas de forma privada.
            </Text>
            <Pressable
              onPress={openSettings}
              className="mt-6 rounded-xl bg-accent dark:bg-accent-dark px-6 py-3"
            >
              <Text className="font-semibold text-white">Configurar ahora</Text>
            </Pressable>
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 justify-center px-5">
            <View className="mb-8">
              <Text className="text-center text-lg font-semibold text-ink dark:text-ink-dark">
                Hola, soy tu asistente financiero
              </Text>
              <Text className="mt-1 text-center text-sm text-muted dark:text-muted-dark">
                Pregúntame sobre tu balance, gastos, metas o recordatorios.
              </Text>
            </View>
            <View className="flex-wrap flex-row justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => sendMessage(suggestion)}
                  disabled={isSending}
                  className="mb-2 rounded-full border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-2"
                >
                  <Text className="text-sm text-ink dark:text-ink-dark">
                    {suggestion}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="flex-1 px-5 pb-2">
            {messages.map(renderMessage)}
            {isSending ? (
              <View className="flex-row items-center self-start rounded-2xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-3">
                <ActivityIndicator size="small" color="#4b9aff" />
                <Text className="ml-2 text-sm text-muted dark:text-muted-dark">
                  Pensando…
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Error */}
        {error ? (
          <View className="mx-5 mb-2 flex-row items-center justify-between rounded-xl border border-expense/30 bg-expense/10 px-4 py-2">
            <Text className="flex-1 pr-2 text-xs text-expense dark:text-expense-dark">
              {error}
            </Text>
            <Pressable onPress={clearError}>
              <Text className="text-xs font-semibold text-expense dark:text-expense-dark">
                OK
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Error de importación */}
        {importError ? (
          <View className="mx-5 mb-2 flex-row items-center justify-between rounded-xl border border-expense/30 bg-expense/10 px-4 py-2">
            <Text className="flex-1 pr-2 text-xs text-expense dark:text-expense-dark">
              {importError}
            </Text>
            <Pressable onPress={clearImportError}>
              <Text className="text-xs font-semibold text-expense dark:text-expense-dark">
                OK
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Procesando imagen */}
        {importProcessing ? (
          <View className="mx-5 mb-2 flex-row items-center self-start rounded-2xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-3">
            <ActivityIndicator size="small" color="#4b9aff" />
            <Text className="ml-2 text-sm text-muted dark:text-muted-dark">
              Leyendo extracto en tu dispositivo… ({elapsed}s)
            </Text>
            <Pressable
              onPress={() => cancelImport()}
              className="ml-3 rounded-full border border-expense/30 bg-expense/10 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-expense dark:text-expense-dark">
                Cancelar
              </Text>
            </Pressable>
          </View>
        ) : null}

        </ScrollView>

        {/* Input */}
        <View
          className="flex-row items-end p-2"
          style={{
            paddingBottom: keyboardVisible ? 2 : 2 + bottomTabOffset,
          }}
        >
          {messages.length > 0 && !isSending && (
            <Pressable
              onPress={clearChat}
              className="mr-2 mb-1 h-10 w-10 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark"
            >
              <Text className="text-lg text-muted dark:text-muted-dark">🗑</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleAttach}
            disabled={importProcessing || isSending}
            className="mr-2 mb-1 h-10 w-10 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark"
          >
            <Text className="text-lg text-muted dark:text-muted-dark">📎</Text>
          </Pressable>
          <TextInput
            className="flex-1 max-h-32 rounded-2xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-3 text-ink dark:text-ink-dark"
            placeholder={
              canChat ? "Escribe tu pregunta…" : "Configura tu proveedor de IA"
            }
            placeholderTextColor="#9ca3af"
            multiline
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            editable={canChat}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canChat || isSending || !input.trim()}
            className={`ml-2 mb-1 h-11 w-11 items-center justify-center rounded-full ${
              canChat && input.trim() && !isSending
                ? "bg-accent dark:bg-accent-dark"
                : "bg-black/10 dark:bg-white/10"
            }`}
          >
            <Text className="text-xl text-white">➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ImportVerificationModal
        visible={importActive}
        userId={userId}
        onClose={() => cancelImport()}
        onImported={handleImported}
      />
      <PdfRasterizerBridge />

      {/* Menú de adjuntar extracto */}
      <Modal
        visible={attachMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachMenuVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setAttachMenuVisible(false)}
        >
          <Pressable
            className="rounded-t-3xl border-t border-black/10 bg-panel dark:bg-panel-dark p-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            onPress={() => {}}
          >
            <Text className="text-center text-lg font-bold text-ink dark:text-ink-dark">
              Adjuntar extracto
            </Text>
            <Text className="mt-1 text-center text-sm leading-snug text-muted dark:text-muted-dark">
              Foto, imagen o PDF. Se procesa en tu dispositivo y los datos
              sensibles se redactan antes de cualquier uso.
            </Text>

            <View className="mt-4 gap-2">
              {(
                [
                  {
                    icon: "📷",
                    label: "Cámara",
                    hint: "Toma una foto del extracto",
                    onPress: runPick(() => pickImage("camera")),
                  },
                  {
                    icon: "🖼️",
                    label: "Galería",
                    hint: "Elige una imagen del extracto",
                    onPress: runPick(() => pickImage("library")),
                  },
                  {
                    icon: "📄",
                    label: "PDF",
                    hint: "Selecciona el archivo del extracto",
                    onPress: runPick(pickPdf),
                  },
                ] as const
              ).map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={opt.onPress}
                  className="flex-row items-center rounded-2xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3.5 active:opacity-70"
                >
                  <Text className="text-2xl">{opt.icon}</Text>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-ink dark:text-ink-dark">
                      {opt.label}
                    </Text>
                    <Text className="text-[13px] text-muted dark:text-muted-dark">
                      {opt.hint}
                    </Text>
                  </View>
                  <Text className="text-lg text-muted dark:text-muted-dark">
                    ›
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setAttachMenuVisible(false)}
              className="mt-4 h-12 items-center justify-center rounded-2xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark"
            >
              <Text className="text-base font-semibold text-ink dark:text-ink-dark">
                Cancelar
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
