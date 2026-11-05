const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// O SQLite no navegador (wa-sqlite) vem em um arquivo .wasm
config.resolver.assetExts.push('wasm');

module.exports = config;
