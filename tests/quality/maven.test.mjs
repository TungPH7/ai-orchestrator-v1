import { test } from 'node:test';
import assert from 'node:assert/strict';
import { posix, win32 } from 'node:path';
import {
  composeUpArgs,
  ciJavaVersions,
  MAVEN_SCRIPTS,
  devEnv,
  DOCKER_INFO,
  dockerAnswered,
  findJdk,
  javaVersionOf,
  jdkMajor,
  mavenArgs,
  wrapperCommand,
} from '../../lib/quality/maven.mjs';

test('each script of a Java app maps to one fixed Maven run, in batch mode and without download logs', () => {
  assert.deepEqual(Object.keys(MAVEN_SCRIPTS), ['lint', 'typecheck', 'test:coverage', 'build', 'dev']);
  assert.deepEqual(mavenArgs('lint'), ['-B', '-ntp', 'validate']);
  assert.deepEqual(mavenArgs('typecheck'), ['-B', '-ntp', 'compile', '-Dspotless.check.skip=true', '-Dcheckstyle.skip=true']);
  assert.deepEqual(mavenArgs('test:coverage'), ['-B', '-ntp', 'verify']);
  assert.deepEqual(mavenArgs('build'), ['-B', '-ntp', 'package', '-DskipTests', '-Dspotless.check.skip=true', '-Dcheckstyle.skip=true']);
  assert.deepEqual(mavenArgs('dev'), ['-B', '-ntp', 'spring-boot:run']);
  assert.throws(() => mavenArgs('deploy'), /deploy.*lint, typecheck, test:coverage, build, dev/);
});

test('on Windows the wrapper runs through cmd.exe with the explicit .\\mvnw.cmd, since cmd does not search the folder', () => {
  const run = wrapperCommand('verify-args', mavenArgs('test:coverage'), { platform: 'win32', env: { ComSpec: 'C:\\Windows\\system32\\cmd.exe' } });
  assert.equal(run.file, 'C:\\Windows\\system32\\cmd.exe');
  assert.deepEqual(run.args, ['/d', '/s', '/c', '".\\mvnw.cmd -B -ntp verify"']);
  assert.equal(run.windowsVerbatimArguments, true);
});

test('elsewhere the wrapper runs with sh, so it needs no executable bit and no shell line', () => {
  const run = wrapperCommand('verify-args', mavenArgs('lint'), { platform: 'linux', env: {} });
  assert.equal(run.file, 'sh');
  assert.deepEqual(run.args, ['./mvnw', '-B', '-ntp', 'validate']);
  assert.equal(run.windowsVerbatimArguments, undefined);
});

test('an argument cmd.exe could read as more than a word is refused', () => {
  for (const bad of ['a&b', 'a|b', 'a"b', '%PATH%', 'a^b', 'a b', '<x', 'x>']) {
    assert.throws(() => wrapperCommand('x', ['-B', bad], { platform: 'win32', env: {} }), /not a plain Maven argument/);
  }
});

test('the Java version of a pom.xml comes from java.version, or from maven.compiler.release', () => {
  assert.equal(javaVersionOf('<project><properties>\n  <java.version>21</java.version>\n</properties></project>'), 21);
  assert.equal(javaVersionOf('<properties><maven.compiler.release>17</maven.compiler.release></properties>'), 17);
  assert.equal(javaVersionOf('<project></project>'), null);
});

test('the major version of a JDK comes from its release file', () => {
  assert.equal(jdkMajor('IMPLEMENTOR="Oracle Corporation"\nJAVA_VERSION="21.0.10"\n'), 21);
  assert.equal(jdkMajor('JAVA_VERSION="1.8.0_402"'), 8);
  assert.equal(jdkMajor('JAVA_VERSION="17"'), 17);
  assert.equal(jdkMajor('nothing here'), null);
});

// A fake disk of JDK folders, each with a release file of its version.
function disk(jdks, path = win32) {
  const releases = Object.fromEntries(Object.entries(jdks).map(([home, version]) => [path.join(home, 'release'), `JAVA_VERSION="${version}"\n`]));
  return {
    path,
    readFile: (file) => {
      if (!(file in releases)) throw new Error(`ENOENT ${file}`);
      return releases[file];
    },
    listDir: (dir) => Object.keys(jdks).filter((home) => path.dirname(home) === dir).map((home) => path.basename(home)),
  };
}

test('JAVA_HOME wins when it is the version the pom asks for', () => {
  const found = findJdk({ want: 21, env: { JAVA_HOME: 'C:\\opt\\jdk-21' }, platform: 'win32', ...disk({ 'C:\\opt\\jdk-21': '21.0.10' }) });
  assert.deepEqual(found, { home: 'C:\\opt\\jdk-21', from: 'JAVA_HOME' });
});

test('JAVA_HOME_<version> comes next, as the GitHub runners name it', () => {
  const env = { JAVA_HOME: 'C:\\opt\\jdk-17.0.10', JAVA_HOME_21_X64: 'D:\\jdks\\temurin-21' };
  const found = findJdk({ want: 21, env, platform: 'win32', ...disk({ 'C:\\opt\\jdk-17.0.10': '17.0.10', 'D:\\jdks\\temurin-21': '21.0.5' }) });
  assert.deepEqual(found, { home: 'D:\\jdks\\temurin-21', from: 'JAVA_HOME_21_X64' });
});

test('then a JDK next to JAVA_HOME, as C:\\opt\\jdk-21 sits next to C:\\opt\\jdk-17.0.10', () => {
  const jdks = { 'C:\\opt\\jdk-17.0.10': '17.0.10', 'C:\\opt\\jdk-21': '21.0.10', 'C:\\opt\\apache-maven-3.9.0': 'none' };
  const found = findJdk({ want: 21, env: { JAVA_HOME: 'C:\\opt\\jdk-17.0.10' }, platform: 'win32', ...disk(jdks) });
  assert.deepEqual(found, { home: 'C:\\opt\\jdk-21', from: 'next to JAVA_HOME' });
});

test('then the folders JDK installers use', () => {
  const found = findJdk({ want: 21, env: {}, platform: 'win32', ...disk({ 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot': '21.0.5' }) });
  assert.deepEqual(found, { home: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot', from: 'C:\\Program Files\\Eclipse Adoptium' });
  const linux = findJdk({ want: 21, env: {}, platform: 'linux', ...disk({ '/usr/lib/jvm/temurin-21-jdk-amd64': '21.0.5' }, posix) });
  assert.deepEqual(linux, { home: '/usr/lib/jvm/temurin-21-jdk-amd64', from: '/usr/lib/jvm' });
});

test('no JDK of that version gives null', () => {
  assert.equal(findJdk({ want: 21, env: { JAVA_HOME: 'C:\\opt\\jdk-17.0.10' }, platform: 'win32', ...disk({ 'C:\\opt\\jdk-17.0.10': '17.0.10' }) }), null);
});

test('dev reads the .env of the app, and a variable already set, such as PORT from /ao-preview, wins', () => {
  const env = devEnv({ PORT: '3105', PATH: 'p' }, '# local\nPORT=8080\nPOSTGRES_DB=shop\nPOSTGRES_PASSWORD="se cret"\n\n');
  assert.deepEqual(env, { PORT: '3105', PATH: 'p', POSTGRES_DB: 'shop', POSTGRES_PASSWORD: 'se cret' });
  assert.deepEqual(devEnv({ A: '1' }, null), { A: '1' });
});

// The compose file of the user's Java template has postgres and app; app builds the image of the API itself and runs it
// on 8080, next to the one Maven runs for dev. dev starts only the services made from an image (project-scaffold part 3,
// T21): a database, a cache.
test('dev starts the services of the compose file that are not built from the app, and waits until they are healthy', () => {
  const template = 'name: "learn"\nservices:\n  postgres:\n    image: "${POSTGRES_IMAGE:-postgres:17-alpine}"\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready"]\n  app:\n    build:\n      context: "."\n    depends_on:\n      postgres:\n        condition: "service_healthy"\n  redis:\n    image: redis:8-alpine\n';
  assert.deepEqual(composeUpArgs(template), ['compose', 'up', '--detach', '--wait', 'postgres', 'redis']);
  assert.equal(composeUpArgs('services:\n  app:\n    build: .\n'), null);
  assert.equal(composeUpArgs('services: {}\n'), null);
  assert.throws(() => composeUpArgs('services: [\n'), /docker-compose\.yml of the app cannot be read/);
});

test('CI installs each Java version the apps ask for, once, and stops on a pom that names none', () => {
  const pom = (version) => `<properties><java.version>${version}</java.version></properties>`;
  assert.deepEqual(ciJavaVersions([{ path: 'apps/api/pom.xml', text: pom(21) }, { path: 'apps/jobs/pom.xml', text: pom(17) }, { path: 'apps/b/pom.xml', text: pom(21) }]), { versions: [17, 21] });
  assert.deepEqual(ciJavaVersions([]), { versions: [] });
  assert.match(ciJavaVersions([{ path: 'apps/api/pom.xml', text: '<project/>' }]).error, /apps\/api\/pom\.xml names no <java\.version>/);
});

// Docker 24 on Windows, with Docker Desktop stopped: `docker info --format {{.ServerVersion}}` exits 0 and prints an
// empty line, the error going to stderr (project-scaffold part 3, T21). doctor said "Docker is running", and ao-step
// would have let be-dev run tests that need it.
test('Docker counts as running only when its server answered with a version', () => {
  assert.deepEqual(DOCKER_INFO, ['info', '--format', '{{.ServerVersion}}']);
  assert.equal(dockerAnswered({ status: 0, stdout: '24.0.7\n' }), true);
  assert.equal(dockerAnswered({ status: 0, stdout: '\n' }), false);
  assert.equal(dockerAnswered({ status: 1, stdout: '' }), false);
  assert.equal(dockerAnswered({ status: null, stdout: null, error: new Error('ETIMEDOUT') }), false);
});
