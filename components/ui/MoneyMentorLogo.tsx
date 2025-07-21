// components/MoneyMentorLogo.tsx
import { Image } from 'react-native';

export default function MoneyMentorLogo({ size = 120 }) {
  return (
    <Image
      source={require('../../assets/images/logo-MM.png')}
      style={{ width: size, height: size, resizeMode: 'contain' }}
    />
  );
}
