const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

config.resolver.extraNodeModules = {
  buffer: require.resolve('@craftzdog/react-native-buffer'),
  // pdfjs solo usa @napi-rs/canvas en la ruta de Node (nunca en RN);
  // se enruta a un stub para que Metro no intente empaquetar el binario nativo.
  '@napi-rs/canvas': require.resolve('./services/ai/pdfjs-canvas-shim.js'),
};
 
module.exports = withNativeWind(config, { input: './global.css' })