// Configura a assinatura da versão release do Android com a chave própria do app.
//
// A pasta android/ é gerada pelo `expo prebuild` (e não vai para o git), então
// editar o build.gradle à mão se perderia. Este plugin reaplica a configuração
// a cada prebuild.
//
// A chave e as senhas NUNCA ficam no repositório: são lidas de propriedades do
// Gradle, normalmente em ~/.gradle/gradle.properties:
//   FLUXUS_UPLOAD_STORE_FILE=/caminho/fluxus-release.jks
//   FLUXUS_UPLOAD_KEY_ALIAS=fluxus
//   FLUXUS_UPLOAD_STORE_PASSWORD=...
//   FLUXUS_UPLOAD_KEY_PASSWORD=...
// Sem elas, o release usa a chave de debug (como o template) e o Gradle avisa.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARCADOR = '// fluxus: assinatura release';

const SIGNING_RELEASE = `
        ${MARCADOR}
        release {
            if (project.hasProperty('FLUXUS_UPLOAD_STORE_FILE')) {
                storeFile file(FLUXUS_UPLOAD_STORE_FILE)
                storePassword FLUXUS_UPLOAD_STORE_PASSWORD
                keyAlias FLUXUS_UPLOAD_KEY_ALIAS
                keyPassword FLUXUS_UPLOAD_KEY_PASSWORD
            }
        }`;

const ASSINATURA_RELEASE = `signingConfig project.hasProperty('FLUXUS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug
            if (!project.hasProperty('FLUXUS_UPLOAD_STORE_FILE')) {
                logger.warn('Fluxus: FLUXUS_UPLOAD_STORE_FILE não definido, release assinado com a chave de DEBUG.')
            }`;

function aplicarAssinatura(gradle) {
  if (gradle.includes(MARCADOR)) return gradle;

  const comSigning = gradle.replace(/signingConfigs \{/, (trecho) => trecho + SIGNING_RELEASE);
  const comRelease = comSigning.replace(
    /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
    (_, antes) => antes + ASSINATURA_RELEASE
  );

  if (comSigning === gradle || comRelease === comSigning) {
    throw new Error(
      'withAssinaturaRelease: não encontrei signingConfigs/release no build.gradle. O template mudou?'
    );
  }
  return comRelease;
}

module.exports = function withAssinaturaRelease(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = aplicarAssinatura(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.aplicarAssinatura = aplicarAssinatura;
