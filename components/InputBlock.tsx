import React from 'react'
import { View, Text, TextInput, TextInputProps } from 'react-native'

interface Props extends TextInputProps {
  label: string
}

export default function InputBlock({ label, ...props }: Props) {
  return (
    <View>
      <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">{label}</Text>
      <TextInput
        className="px-4 py-3 border border-black/10 dark:border-white/10 rounded-lg bg-deepSoft dark:bg-deepSoft-dark text-ink dark:text-ink-dark"
        placeholderTextColor="#9ca3af"
        {...props}
      />
    </View>
  )
}
