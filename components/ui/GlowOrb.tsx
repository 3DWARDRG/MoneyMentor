import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

interface GlowOrbProps {
  size: number;
  color: string;
  opacity?: number;
  top?: number;
  right?: number;
  left?: number;
  bottom?: number;
  style?: StyleProp<ViewStyle>;
}

const GlowOrb = ({
  size,
  color,
  opacity = 0.5,
  top,
  right,
  left,
  bottom,
  style,
}: GlowOrbProps) => {
  const rawId = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <Svg
      width={size}
      height={size}
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          top,
          right,
          left,
          bottom,
        },
        style,
      ]}
    >
      <Defs>
        <RadialGradient id={rawId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${rawId})`} />
    </Svg>
  );
};

export default GlowOrb;
