const {
  withEntitlementsPlist,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Arquivos Swift/ObjC que serão copiados para ios/<AppName>/ durante o prebuild.
// Os fontes vivem em plugins/siri/ e são commitados ao repo.
const SIRI_SOURCE_FILES = [
  'RegisterFeedingIntent.swift',
  'SessionSyncModule.swift',
  'SessionSyncModule.m',
];

/**
 * Adiciona entitlement com.apple.developer.siri ao app.
 */
function withSiriEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.siri'] = true;
    return config;
  });
}

/**
 * Copia os arquivos Swift/ObjC de plugins/siri/ para ios/<AppName>/
 * e os registra no project.pbxproj como Sources do target principal.
 */
function withSiriFiles(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectRoot   = config.modRequest.projectRoot;
    const platformRoot  = config.modRequest.platformProjectRoot; // ios/
    // Nome da pasta/target dentro de ios/ — geralmente igual ao nome do produto.
    const appName = config.modRequest.projectName ?? 'LadoaLado';

    const sourceDir = path.join(projectRoot, 'plugins', 'siri');
    const destDir   = path.join(platformRoot, appName);

    const groupKey =
      xcodeProject.findPBXGroupKey({ name: appName }) ||
      xcodeProject.findPBXGroupKey({ path: appName });

    for (const file of SIRI_SOURCE_FILES) {
      // Copia o arquivo para ios/<AppName>/
      fs.copyFileSync(path.join(sourceDir, file), path.join(destDir, file));

      // Adiciona ao target principal do Xcode (Sources build phase)
      // O terceiro arg é o group UUID; o target vai no opt.
      xcodeProject.addSourceFile(
        `${appName}/${file}`,
        { target: xcodeProject.getFirstTarget().uuid },
        groupKey
      );
    }

    return config;
  });
}

/**
 * Plugin principal — compõe todos os modificadores da integração Siri.
 *
 * Adiciona ao app.json:
 *   "plugins": ["./plugins/withSiri"]
 */
const withSiri = (config) => {
  config = withSiriEntitlement(config);
  config = withSiriFiles(config);
  return config;
};

module.exports = withSiri;
