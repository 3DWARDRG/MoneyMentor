import React from 'react'
import { View, Text, TextInput, TextInputProps } from 'react-native'

interface Props extends TextInputProps {
  label: string
}

export default function InputBlock({ label, ...props }: Props) {
  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      <TextInput
        className="px-4 py-3 border border-gray-300 rounded-lg"
        placeholderTextColor="#9CA3AF" // text-gray-400
        {...props}
      />
    </View>
  )
}
