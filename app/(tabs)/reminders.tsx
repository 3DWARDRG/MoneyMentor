import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Image, ImageBackground } from 'react-native';
import UpcomingReminders from '@/components/UpcomingReminders';




export default function Reminders() {
  return (
    <SafeAreaView> 
    <View >
      <UpcomingReminders />
    </View>
    </SafeAreaView>
  );
}
