
import React from 'react';
import { View, Text, Button } from 'react-native';

const RandomNumber = () => {
  const [number, setNumber] = React.useState<number | null>(null);

  const generateRandomNumber = () => {
    const randomNum = Math.floor(Math.random() * 100) + 1;
    setNumber(randomNum);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        {number !== null ? `Random Number: ${number}` : 'Press the button to generate a random number'}
      </Text>
      <Button title="Generate Random Number" onPress={generateRandomNumber} />
    </View>
  );
};

export default RandomNumber;

