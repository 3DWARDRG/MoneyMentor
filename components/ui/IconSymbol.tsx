// Importamos los íconos que necesitas (buscamos los equivalentes más cercanos)
import {
  AlarmClock,
  ArrowRight,
  Bot,
  Code,
  Home,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  UserRound,
} from "lucide-react-native";
import React from "react";
import { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

// 1. Nuestro diccionario ahora mapea nombres a COMPONENTES
const MAPPING = {
  "house.fill": Home,
  "paperplane.fill": Send,
  "chevron.left.forwardslash.chevron.right": Code,
  alarm: AlarmClock,
  person: User,
  "chart.line.uptrend.xyaxis": TrendingUp,
  shield: Shield,
  "person.circle": UserRound,
  "arrow.right": ArrowRight,
  sparkles: Sparkles,
  bot: Bot,
} as const;

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>; // Lo dejamos por compatibilidad de tipos
}) {
  // 2. Extraemos el componente de Lucide del diccionario
  const IconComponent = MAPPING[name];

  // 3. Renderizamos el ícono directamente
  // Importante: Aseguramos que color sea un string plano
  return <IconComponent size={size} color={color.toString()} />;
}
