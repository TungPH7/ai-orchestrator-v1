import { test } from 'node:test';
import assert from 'node:assert/strict';
import { posix, win32 } from 'node:path';
import {
  COMPOSE_UP,
  MAVEN_SCRIPTS,
  devEnv,
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

test('dev starts the database of the compose file and waits until it is healthy', () => {
  assert.deepEqual(COMPOSE_UP, ['compose', 'up', '--detach', '--wait']);
});
