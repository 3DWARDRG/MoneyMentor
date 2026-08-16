import InputBlock from "@/components/InputBlock";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import { AI_PROVIDER_PRESETS } from "@/services/ai/presets";
import { useAiChatStore } from "@/store/useAiChatStore";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shield } from "lucide-react-native";

export default function AiSettingsScreen() {
  const { config, hydrate, saveConfig, clearConfig } = useAiChatStore();

  const [providerId, setProviderId] = useState(config?.providerId ?? "openai");
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "");
  const [model, setModel] = useState(config?.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const preset = AI_PROVIDER_PRESETS.find((p) => p.id === providerId);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!config) return;
    setProviderId(config.providerId);
    setBaseUrl(config.baseUrl);
    setModel(config.model);
  }, [config]);

  const applyPreset = (id: string) => {
    const p = AI_PROVIDER_PRESETS.find((x) => x.id === id);
    setProviderId(id);
    setBaseUrl(p?.baseUrl ?? "");
    setModel(p?.defaultModel ?? "");
  };

  const handleSave = async () => {
    if (!baseUrl.trim() || !model.trim()) {
      Alert.alert("Error", "Completa la URL base y el modelo.");
      return;
    }

    setSaving(true);
    try {
      await saveConfig({
        providerId,
        baseUrl: baseUrl.trim().replace(/\/+$/, ""),
        model: model.trim(),
        apiKey: apiKey || null,
      });
      Alert.alert("Listo", "Asistente configurado correctamente.");
      router.back();
    } catch (error) {
      console.error("❌ Error guardando configuración IA:", error);
      Alert.alert("Error", "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!baseUrl.trim() || !model.trim()) {
      Alert.alert("Error", "Completa la URL base y el modelo.");
      return;
    }

    setTesting(true);
    try {
      await saveConfig({
        providerId,
        baseUrl: baseUrl.trim().replace(/\/+$/, ""),
        model: model.trim(),
        apiKey: apiKey || null,
      });
      const freshConfig = useAiChatStore.getState().config;
      if (!freshConfig?.baseUrl || !freshConfig.model) {
        throw new Error("Configuración no guardada");
      }

      // Usa el cliente real con un mensaje mínimo (sin tools)
      const { chatCompletions } = await import("@/services/ai/client");
      const reply = await chatCompletions(
        freshConfig,
        {
          messages: [
            { role: "user", content: "Responde solo con: ok" },
          ],
          tools: undefined,
        },
        async () => "",
      );
      Alert.alert("Conexión exitosa", `Respuesta del modelo: ${reply.slice(0, 120)}`);
    } catch (error: any) {
      console.error("❌ Error probando conexión IA:", error);
      Alert.alert(
        "Sin conexión",
        error?.message ?? "No se pudo conectar con el proveedor.",
      );
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      "Borrar configuración",
      "Se eliminará la API key y la configuración. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            await clearConfig();
            setProviderId("openai");
            setBaseUrl("");
            setModel("");
            setApiKey("");
          },
        },
      ],
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
          className="flex-1 px-5 py-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Proveedor */}
          <Text className="mb-2 text-sm font-medium text-ink dark:text-ink-dark">
            Proveedor
          </Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {AI_PROVIDER_PRESETS.map((p) => {
              const active = providerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => applyPreset(p.id)}
                  className={`rounded-xl border px-3 py-2 ${
                    active
                      ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                      : "border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active
                        ? "text-accent dark:text-accent-dark"
                        : "text-ink dark:text-ink-dark"
                    }`}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {preset ? (
            <Text className="mb-4 text-xs text-muted dark:text-muted-dark">
              {preset.description}
            </Text>
          ) : null}

          {/* URL base */}
          <View className="mb-4">
            <InputBlock
              label="URL base (API)"
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="https://api.openai.com/v1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Modelo */}
          <View className="mb-4">
            <InputBlock
              label="Modelo"
              value={model}
              onChangeText={setModel}
              placeholder="gpt-4o-mini"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* API Key */}
          <View className="mb-4">
            <InputBlock
              label="API key"
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={
                preset?.needsApiKey ? "sk-…" : "Opcional (apps locales)"
              }
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          {/* Privacidad */}
          <View className="mb-6 flex-row items-start rounded-2xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark p-4">
            <Shield size={20} color="#4be0a6" style={{ marginTop: 2 }} />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                Tu privacidad primero
              </Text>
              <Text className="mt-1 text-xs leading-relaxed text-muted dark:text-muted-dark">
                La API key se guarda en el almacenamiento seguro del
                dispositivo. El asistente solo consulta datos agregados y
                mínimos (sin descripciones ni cuentas) mediante herramientas
                controladas, y la conversación queda en tu dispositivo.
              </Text>
            </View>
          </View>

          {/* Acciones */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleTest}
              disabled={testing}
              className={`flex-1 items-center rounded-xl border border-black/10 dark:border-white/10 py-4 ${
                testing ? "opacity-50" : ""
              }`}
            >
              {testing ? (
                <ActivityIndicator color="#4b9aff" />
              ) : (
                <Text className="font-semibold text-ink dark:text-ink-dark">
                  Probar conexión
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className={`flex-1 items-center rounded-xl py-4 ${
                saving
                  ? "bg-accent/60 dark:bg-accent-dark/60"
                  : "bg-accent dark:bg-accent-dark"
              }`}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Guardar</Text>
              )}
            </Pressable>
          </View>

          {config ? (
            <Pressable onPress={handleClear} className="mt-6 items-center">
              <Text className="text-sm font-medium text-expense dark:text-expense-dark">
                Borrar configuración
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
