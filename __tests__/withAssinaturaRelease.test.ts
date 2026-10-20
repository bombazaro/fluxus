import { aplicarAssinatura } from '../plugins/withAssinaturaRelease';

// Trecho do android/app/build.gradle gerado pelo template do Expo
const GRADLE_TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

function blocoBuildType(gradle: string, nome: string): string {
  const buildTypes = gradle.slice(gradle.indexOf('buildTypes {'));
  const inicio = buildTypes.indexOf(`${nome} {`);
  return buildTypes.slice(inicio, buildTypes.indexOf('\n        }', inicio));
}

describe('aplicarAssinatura', () => {
  it('assina o build type release com a chave própria', () => {
    const resultado = aplicarAssinatura(GRADLE_TEMPLATE);
    expect(blocoBuildType(resultado, 'release')).toContain(
      "project.hasProperty('FLUXUS_UPLOAD_STORE_FILE') ? signingConfigs.release"
    );
  });

  it('não mexe no build type debug', () => {
    const resultado = aplicarAssinatura(GRADLE_TEMPLATE);
    expect(blocoBuildType(resultado, 'debug')).toContain('signingConfig signingConfigs.debug');
    expect(blocoBuildType(resultado, 'debug')).not.toContain('FLUXUS_UPLOAD_STORE_FILE');
  });

  it('cria o signingConfig release lendo as propriedades do Gradle', () => {
    const resultado = aplicarAssinatura(GRADLE_TEMPLATE);
    const signing = resultado.slice(0, resultado.indexOf('buildTypes {'));
    expect(signing).toContain('storeFile file(FLUXUS_UPLOAD_STORE_FILE)');
  });

  it('é idempotente', () => {
    const umaVez = aplicarAssinatura(GRADLE_TEMPLATE);
    expect(aplicarAssinatura(umaVez)).toBe(umaVez);
  });

  it('falha se o template mudar', () => {
    expect(() => aplicarAssinatura('android {}')).toThrow(/template mudou/);
  });
});
