import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface ProfileOptionProps {
  iconSvg: string;
  bgColor: string;
  text: string;
  textColor?: string;
  onPress?: () => void;
}

const ProfileOption: React.FC<ProfileOptionProps> = ({
  iconSvg,
  bgColor,
  text,
  textColor = 'text-black',
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <View className={`h-8 w-8 rounded-full ${bgColor} items-center justify-center mr-3`}>
          <SvgXml xml={iconSvg} width={10} height={10} />
        </View>
        <View className="flex-grow">
          <Text className={`font-medium ${textColor}`}>{text}</Text>
        </View>
        <SvgXml
          xml={`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`}
          width={20}
          height={20}
        />
      </View>
    </TouchableOpacity>
  );
};

export default ProfileOption;
