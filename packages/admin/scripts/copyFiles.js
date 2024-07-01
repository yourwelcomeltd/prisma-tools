const path = require('path');
const fse = require('fs-extra');
const { existsSync } = require('fs');
const glob = require('glob');

const packagePath = process.cwd();
const outPut = './dist';

const buildPath = path.join(packagePath, outPut);
const srcPath = path.join(packagePath, './src');

async function createModulePackages({ from, to }) {
  const ts = glob.sync('*/index.ts', { cwd: from }).map(path.dirname);
  const tsx = glob.sync('*/index.tsx', { cwd: from }).map(path.dirname);
  const directoryPackages = [...ts, ...tsx];
  await Promise.all(
    directoryPackages.map(async (directoryPackage) => {
      const packageJson = {
        sideEffects: false,
        module: path.join('../esm', directoryPackage, 'index.js'),
        typings: './index.d.ts',
      };
      const packageJsonPath = path.join(to, directoryPackage, 'package.json');

      const [typingsExist] = await Promise.all([
        existsSync(path.join(to, directoryPackage, 'index.d.ts')),
        fse.writeJsonSync(packageJsonPath, packageJson),
      ]);

      if (!typingsExist) {
        throw new Error(`index.d.ts for ${directoryPackage} is missing`);
      }

      return packageJsonPath;
    }),
  );
}

async function run() {
  try {
    await Promise.all(
      ['./README.md', './LICENSE'].map((file) => {
        fse.copy(path.join(packagePath, file), path.join(buildPath, file));
      }),
    );
    const pkg = fse.readJsonSync(path.join(packagePath, './package.json'));
    delete pkg.devDependencies;
    fse.writeJsonSync(path.join(buildPath, './package.json'), pkg, {
      spaces: 2,
    });
    await createModulePackages({ from: srcPath, to: buildPath });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
