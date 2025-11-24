import ProfileScreen from '@/components/ProfileScreen';
import React from 'react';
import { View, Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Profile() {
  return (
    <SafeAreaView className='bg-gray-50 flex-1'> 
      <ProfileScreen />
    </SafeAreaView>
  );
}

