require('./scripts/patch-fallback-watcher');
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro to resolve explicitly from your local node_modules
config.resolver.extraNodeModules = {
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'pdf-lib': path.resolve(__dirname, 'node_modules/pdf-lib/cjs/index.js'),
};

module.exports = config;