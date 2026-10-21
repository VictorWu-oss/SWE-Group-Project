const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-web/dist/exports/AssetRegistry') {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, '../../node_modules/react-native-web/src/modules/AssetRegistry/index.js'),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
