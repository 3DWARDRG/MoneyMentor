const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

config.resolver.extraNodeModules = {
  buffer: require.resolve('@craftzdog/react-native-buffer'),
};
 
module.exports = withNativeWind(config, { input: './global.css' })