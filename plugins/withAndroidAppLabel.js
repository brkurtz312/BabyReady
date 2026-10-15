// Sets the short name shown under the app icon on Android home screens.
// Expo has no app.json setting for this, so we override the "app_name" string.
const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

module.exports = function withAndroidAppLabel(config, { label }) {
  return withStringsXml(config, (modConfig) => {
    modConfig.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: label })],
      modConfig.modResults,
    );
    return modConfig;
  });
};
