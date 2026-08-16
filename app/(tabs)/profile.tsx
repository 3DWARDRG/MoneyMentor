import ProfileScreen from '@/components/ProfileScreen';
import ScreenBackdrop from '@/components/ui/ScreenBackdrop';
import React from 'react';
import { View, Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Profile() {
  return (
    <SafeAreaView className='flex-1'> 
      <ScreenBackdrop />
      <ProfileScreen />
    </SafeAreaView>
  );
}

