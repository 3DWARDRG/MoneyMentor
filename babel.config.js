module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind", unstable_transformImportMeta: true }],"nativewind/babel",
    ],
    plugins: [
      "@babel/plugin-transform-class-static-block",
      ["@babel/plugin-proposal-decorators", { "legacy": true }],"react-native-reanimated/plugin"
    ]
  };
};
