module.exports = function (api) {
  const isWeb = api.caller((caller) => caller?.platform === "web");
  // NO usar api.cache(true): al depender de la plataforma hay que invalidar el
  // caché cuando cambia el caller (el dev server sirve web y native en el mismo
  // proceso de Metro).
  api.cache.using(() => isWeb);
  // El preset web de babel-preset-expo NO incluye @babel/plugin-transform-class-properties
  // (web usa class fields nativos). Sin él, @babel/preset-typescript lanza error con los
  // decoradores WatermelonDB (`@field(...) prop!: type`). Se agrega SOLO en web porque en
  // native el preset RN ya lo incluye y agregarlo de nuevo rompe `declare` fields de
  // expo-file-system (debe correr tras el transform de TypeScript).

  const plugins = [
    "@babel/plugin-transform-class-static-block",
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
  ];

  if (isWeb) {
    plugins.push(["@babel/plugin-transform-class-properties", { "loose": true }]);
  }

  plugins.push("react-native-reanimated/plugin");

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind", unstable_transformImportMeta: true }],"nativewind/babel",
    ],
    plugins,
  };
};
