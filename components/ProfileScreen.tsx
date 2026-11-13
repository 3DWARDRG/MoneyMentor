import LogOutButton from "@/components/LogOut";
import CardBackdrop from "@/components/ui/CardBackdrop";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAccountSummary } from "@/hooks/useAccountSummary";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useUser } from "@/hooks/useUser";
import { updateUserProfile } from "@/services/userService";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { NotificationButton } from "./NotificactionButton";

const editIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5H6a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5"/>
    <path d="M16.586 6.586a2 2 0 112.828 2.828L11.828 15H9v-2.828l7.586-7.586z"/>
  </svg>`;

const arrowSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
`;

const privacySvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12l2 2 4-4" />
    <path d="M18.618 8.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04" />
    <path d="M3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622" />
    <path d="M20.618 5.016c-.249.964-.382 1.974-.382 3.016" />
  </svg>
`;

const paymentSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10h18" />
    <path d="M7 15h1" />
    <path d="M11 15h1" />
    <path d="M5 19h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
`;

const exportSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17h5l-5 5v-5z"/>
    <path d="M4 19h1a3 3 0 003-3V8a3 3 0 00-3-3H4"/>
    <path d="M4 5v3m0 0h18m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h7"/>
  </svg>
`;

const notificationSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17h5l-5 5v-5z"/>
    <path d="M4 19h1a3 3 0 003-3V8a3 3 0 00-3-3H4"/>
    <path d="M4 5v3m0 0h18m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h7"/>
  </svg>
`;

const settingsSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
`;

const memberSince = (creationDate: number | null | undefined) => {
  if (!creationDate) return "Miembro de MoneyMentor";
  const date = new Date(creationDate);
  const month = date.toLocaleDateString("es-ES", { month: "long" });
  const year = date.getFullYear();
  return `Miembro desde ${month} de ${year}`;
};

const ProfileScreen = () => {
  const userId = useAuthStore((s) => s.userId);
  const { user, loading } = useUser(userId ?? "");
  const { accounts } = useAccounts(userId ?? "");
  const accountsSummary = useAccountSummary(accounts);
  const { transactions } = useTransactions(userId ?? "");
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [editVisible, setEditVisible] = useState(false);
  const [names, setNames] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setNames(user?.names ?? "");
    setLastName(user?.lastName ?? "");
    setEmail(user?.email ?? "");
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!userId || !user) return;

    if (!names.trim()) {
      Alert.alert("Error", "El nombre no puede estar vacío.");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(user.id, { names, lastName, email });
      setEditVisible(false);
      Alert.alert("Listo", "Tus datos se actualizaron correctamente.");
    } catch (error) {
      console.error("❌ Error actualizando usuario:", error);
      Alert.alert("Error", "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const fullName =
    user && (user.names || user.lastName)
      ? `${user.names} ${user.lastName ?? ""}`.trim()
      : "Usuario";
  const initial = user?.names?.charAt(0)?.toUpperCase() ?? "U";

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-transparent">
        <ActivityIndicator size="large" color="#4b9aff" />
      </View>
    );
  }

  return (
    <ScrollView>
      <View className="flex-1 box-border bg-transparent p-4">
        {/* Profile Header */}
        <View className="mb-6 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6">
          <CardBackdrop
            glowColor="#1d7df0"
            glowOpacity={0.18}
            glowSize={240}
            glowTop={-90}
            glowRight={-60}
          />
          <View className="flex-row items-center mb-4">
            <View className="h-20 w-20 bg-accent/10 dark:bg-accent-dark/10 rounded-full flex items-center justify-center mr-4">
              <Text className="text-ink dark:text-ink-dark text-3xl font-bold">
                {initial}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
                {fullName}
              </Text>
              <View className="flex-row items-center mt-2">
                <Text className="px-2 py-1 bg-black/5 dark:bg-white/10 rounded-full text-xs text-ink dark:text-ink-dark">
                  {user?.email ? "Usuario" : "Administrador"}
                </Text>
                <Text className="ml-2 text-muted dark:text-muted-dark text-xs">
                  {memberSince(user?.creationDate)}
                </Text>
              </View>
              {user?.email ? (
                <Text className="mt-2 text-muted dark:text-muted-dark text-sm">
                  {user.email}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              className="h-10 w-10 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center"
              onPress={openEdit}
            >
              <SvgXml xml={editIconSvg} width={20} height={20} />
            </TouchableOpacity>
          </View>
          {/* Quick Stats */}
          <View className="flex-row justify-around pt-4 border-t border-black/10 dark:border-white/10">
            <View className="items-center">
              <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
                {transactions.length}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-xs">
                Transacciones
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
                ${accountsSummary.totalBalance.toLocaleString("es-CO")}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-xs">
                Balance actual
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
                {accountsSummary.activeAccounts}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-xs">
                Cuentas activas
              </Text>
            </View>
          </View>
        </View>

        {/* Account Management Section */}
        <View className="mb-6">
          <Text className="font-bold text-ink dark:text-ink-dark mb-3">
            Gestión de cuenta
          </Text>
          <View className="bg-panel dark:bg-panel-dark rounded-lg shadow-sm border border-black/10 dark:border-white/10">
            <TouchableOpacity
              onPress={() => router.push("/SelectUserScreen")}
              className="p-4 border-b border-black/10 dark:border-white/10 flex-row items-center"
            >
              <View className="h-10 w-10 rounded-full bg-accent/10 dark:bg-accent-dark/10 flex items-center justify-center mr-3">
                <IconSymbol size={20} name="person.circle" color={"#4b9aff"} />
              </View>
              <View className="flex-grow">
                <Text className="font-medium text-ink dark:text-ink-dark">
                  Gestionar usuarios
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Crear, editar y cambiar usuarios
                </Text>
              </View>
              <View className="flex-row items-center">
                <SvgXml xml={arrowSvg} width={20} height={20} fill="#97a4bb" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/UnlockScreen")}
              className="p-4 border-b border-black/10 dark:border-white/10 flex-row items-center"
            >
              <View className="h-10 w-10 rounded-full bg-income/10 dark:bg-income-dark/10 flex items-center justify-center mr-3">
                <SvgXml
                  xml={privacySvg}
                  width={20}
                  height={20}
                  fill="#4be0a6"
                />
              </View>
              <View className="flex-grow">
                <Text className="font-medium text-ink dark:text-ink-dark">
                  Seguridad y privacidad
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Configurar PIN y opciones de seguridad
                </Text>
              </View>
              <SvgXml xml={arrowSvg} width={20} height={20} fill="#97a4bb" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/accounts")}
              className="p-4 flex-row items-center"
            >
              <View className="h-10 w-10 rounded-full bg-accent/10 dark:bg-accent-dark/10 flex items-center justify-center mr-3">
                <SvgXml
                  xml={paymentSvg}
                  width={20}
                  height={20}
                  fill="#4b9aff"
                />
              </View>
              <View className="flex-grow">
                <Text className="font-medium text-ink dark:text-ink-dark">
                  Métodos de pago
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Tarjetas y cuentas bancarias
                </Text>
              </View>
              <SvgXml xml={arrowSvg} width={20} height={20} fill="#97a4bb" />
            </TouchableOpacity>
          </View>
        </View>
        {/* <!-- App Settings Section --> */}
        <View className="mb-6">
          <Text className="font-bold text-ink dark:text-ink-dark mb-3">
            Configuración de la app
          </Text>
          <View className="bg-panel dark:bg-panel-dark rounded-lg shadow-sm border border-black/10 dark:border-white/10">
            <TouchableOpacity
              onPress={() => console.log("Exportar datos")}
              className="p-4 border-b border-black/10 dark:border-white/10 flex-row items-center"
            >
              <View className="h-10 w-10 rounded-full bg-accent/10 dark:bg-accent-dark/10 flex items-center justify-center mr-3">
                <SvgXml xml={exportSvg} width={20} height={20} fill="#58a5ff" />
              </View>
              <View className="flex-grow">
                <Text className="font-medium text-ink dark:text-ink-dark">
                  Exportar datos
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Descargar transacciones y reportes
                </Text>
              </View>
              <SvgXml xml={arrowSvg} width={20} height={20} fill="#97a4bb" />
            </TouchableOpacity>

            <View className="p-4 border-b border-black/10 dark:border-white/10 flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-accent/10 dark:bg-accent-dark/10 flex items-center justify-center mr-3">
                <SvgXml
                  xml={notificationSvg}
                  width={20}
                  height={20}
                  fill="#4b9aff"
                />
              </View>
              <View className="flex-grow">
                <NotificationButton userId={userId ?? ""} />
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Recordatorios y alertas
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => console.log("Configuración general")}
              className="p-4 flex-row items-center"
            >
              <View className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mr-3">
                <SvgXml
                  xml={settingsSvg}
                  width={20}
                  height={20}
                  fill="#97a4bb"
                />
              </View>
              <View className="flex-grow">
                <Text className="font-medium text-ink dark:text-ink-dark">
                  Configuración general
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Moneda, idioma y preferencias
                </Text>
              </View>
              <SvgXml xml={arrowSvg} width={20} height={20} fill="#97a4bb" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Apparence / Theme */}
        <View className="mb-6">
          <Text className="font-bold text-ink dark:text-ink-dark mb-3">
            Apariencia
          </Text>
          <View className="bg-panel dark:bg-panel-dark rounded-lg shadow-sm border border-black/10 dark:border-white/10 p-4">
            <Text className="font-medium text-ink dark:text-ink-dark mb-3">
              Tema
            </Text>
            <View className="flex-row gap-2">
              {(
                [
                  { value: "system", label: "Sistema" },
                  { value: "light", label: "Claro" },
                  { value: "dark", label: "Oscuro" },
                ] as const
              ).map((option) => {
                const active = theme === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setTheme(option.value)}
                    className={`flex-1 items-center rounded-full py-2 px-3 ${
                      active
                        ? "bg-accent dark:bg-accent-dark"
                        : "bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        active
                          ? "text-white"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="mt-3 text-xs text-muted dark:text-muted-dark">
              Sistema sigue automáticamente el tema de tu dispositivo.
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="font-bold text-ink dark:text-ink-dark mb-3">
            Soporte
          </Text>
          <View className="bg-panel dark:bg-panel-dark rounded-lg shadow-sm border border-black/10 dark:border-white/10">
            <View className="p-4 border-b border-black/10 dark:border-white/10 flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-income/10 dark:bg-income-dark/10 flex items-center justify-center mr-3">
                <SvgXml
                  xml={editIconSvg}
                  width={20}
                  height={20}
                  fill="#4be0a6"
                />
              </View>
              <View className="flex-grow">
                <Text className="font-medium text-ink dark:text-ink-dark">
                  Ayuda y soporte
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  FAQ y contacto
                </Text>
              </View>
              <SvgXml xml={editIconSvg} width={20} height={20} fill="#97a4bb" />
            </View>

            <View className="p-4 border-b border-black/10 dark:border-white/10 flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-accent/10 dark:bg-accent-dark/10 flex items-center justify-center mr-3">
                <SvgXml
                  xml={editIconSvg}
                  width={20}
                  height={20}
                  fill="#4b9aff"
                />
              </View>
              <View className="flex-grow">
                <Text className="font-medium text-ink dark:text-ink-dark">
                  Calificar la app
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Comparte tu experiencia
                </Text>
              </View>
              <SvgXml xml={editIconSvg} width={20} height={20} fill="#97a4bb" />
            </View>

            <LogOutButton />
          </View>
        </View>

        {/* Footer */}
        <View className="p-6 mb-6 text-muted dark:text-muted-dark text-sm min-h-10">
          <Text className="mt-5 text-center text-muted dark:text-muted-dark">
            FinApp versión 1.0.0
          </Text>
          <Text className="mt-5 h-10 text-center text-muted dark:text-muted-dark">
            © 2023 FinApp. Todos los derechos reservados.
          </Text>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-deepSoft dark:bg-deepSoft-dark rounded-t-3xl p-6 pb-10 border border-black/10 dark:border-white/10">
            <View className="w-10 h-1 bg-black/5 dark:bg-white/10 rounded-full self-center mb-5" />
            <Text className="text-xl font-bold text-ink dark:text-ink-dark mb-1">
              Editar perfil
            </Text>
            <Text className="text-sm text-muted dark:text-muted-dark mb-5">
              Actualiza tu información personal
            </Text>

            <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
              Nombre
            </Text>
            <TextInput
              value={names}
              onChangeText={setNames}
              placeholder="Ej: Carlos"
              className="mb-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
              placeholderTextColor="#9ca3af"
            />

            <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
              Apellido
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Ej: Rodríguez"
              className="mb-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
              placeholderTextColor="#9ca3af"
            />

            <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
              Correo electrónico
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mb-6 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
              placeholderTextColor="#9ca3af"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                className="flex-1 items-center rounded-xl border border-black/10 dark:border-white/10 py-4"
              >
                <Text className="font-semibold text-muted dark:text-muted-dark">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
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
                  <Text className="font-semibold text-white">
                    Guardar cambios
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ProfileScreen;
