import React from "react";
import { Pressable, Text } from "react-native";

interface FilterButtonProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}

const FilterButton = ({
  label,
  isActive = false,
  onPress,
}: FilterButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
        isActive
          ? "bg-accent dark:bg-accent-dark"
          : "bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10"
      }`}
    >
      <Text className={isActive ? "text-white" : "text-muted dark:text-muted-dark"}>{label}</Text>
    </Pressable>
  );
};

export default FilterButton;
