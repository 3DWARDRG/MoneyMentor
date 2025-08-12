import { router } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const FloatingButton = () => {


  return (
    <View className="absolute bottom-24 right-12  items-center">
      <TouchableOpacity
        onPress={() => router.push('/AddTransactionScreen')}
        className="bg-black w-16 h-16 rounded-full justify-center items-center shadow-lg"
      >
        <Text className="text-white text-2xl">+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FloatingButton;

