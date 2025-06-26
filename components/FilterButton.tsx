import React from 'react';
import { Pressable, Text } from 'react-native';

interface FilterButtonProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}

const FilterButton = ({ label, isActive = false, onPress }: FilterButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      <Text className={isActive ? 'text-white' : 'text-gray-700'}>{label}</Text>
    </Pressable>
  );
};

export default FilterButton;
