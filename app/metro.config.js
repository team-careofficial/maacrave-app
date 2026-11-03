// Metro config: same as Expo's default, plus the "@/..." → "src/..." shortcut used across the app.
// (Expo resolves this from tsconfig paths on the website build, but the Android release bundler needs it spelled out.)
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const previous = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const name = moduleName.startsWith('@/') ? path.join(__dirname, 'src', moduleName.slice(2)) : moduleName;
  return (previous || context.resolveRequest)(context, name, platform);
};
module.exports = config;
