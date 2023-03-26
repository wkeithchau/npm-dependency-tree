import { execSync, spawnSync } from "child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { globSync } from "glob";
import semver from "semver";

const PACKAGE_FILENAME = "package.json";
const PACKAGE_LOCK_FILENAME = "package-lock.json";
const README_FILENAME = "README.md";
const INFO_DIR = "info";
const NESTED_DEP_DIR = "nested-deps";
const DEPENDENCY_LIST_FILENAME = "dependency-list";

const installPackage = (name, version, path) => {
  execSync(`npm init -y`, { cwd: path });
  execSync(`npm install ${name}@${version}`, {
    cwd: path,
  });
};

const collectionPackageData = async (
  name,
  version,
  path,
  options = { subDir: "" }
) => {
  const packageLock = JSON.parse(
    readFileSync(`${path}/${PACKAGE_LOCK_FILENAME}`)
  );

  const packageRegex = new RegExp(name);
  const packageRef = Object.keys(packageLock.packages).find(
    (r) =>
      packageRegex.test(r) &&
      semver.satisfies(packageLock.packages[r].version, version) &&
      existsSync(`${path}/${r}`)
  );

  const usedVersion = semver.coerce(
    packageLock.packages[packageRef].version
  ).version;
  const packageDir = `${path}/${packageRef}`;
  const licenseFiles = globSync(`${packageDir}/license*`);
  const readmeFiles = globSync(`${packageDir}/${README_FILENAME}`);

  const nestedDir = options.subDir ? `/${options.subDir}` : "";
  const packageInfoDir = `${path}/${INFO_DIR}${nestedDir}/${name}@${usedVersion}`;
  if (!existsSync(packageInfoDir)) {
    mkdirSync(packageInfoDir, { recursive: true });

    console.log(`COLLECT ${name}${usedVersion}`);
    const packageJson = JSON.parse(
      readFileSync(`${packageDir}/${PACKAGE_FILENAME}`)
    );
    writeFileSync(
      `${packageInfoDir}/${PACKAGE_FILENAME}`,
      JSON.stringify(packageJson, null, 2)
    );

    licenseFiles.forEach((filePath) => {
      const fileName = filePath.split("/").at(-1);
      copyFileSync(filePath, `${packageInfoDir}/${fileName}`);
    });

    readmeFiles.forEach((filePath) => {
      const fileName = filePath.split("/").at(-1);
      copyFileSync(filePath, `${packageInfoDir}/${fileName}`);
    });

    const depList = [`${name}@${usedVersion}`];

    const dependencyKeys = Object.keys(packageJson.dependencies || {});
    await Promise.all(
      dependencyKeys.map(async (key) => {
        const depVersion = packageJson.dependencies[key];
        const nestedDepList = await collectionPackageData(
          key,
          depVersion,
          path,
          {
            subDir: NESTED_DEP_DIR,
          }
        );
        if (nestedDepList !== undefined) {
          depList.push(...nestedDepList);
        }
      })
    );

    return depList;
  }
};

export const getInstallDependencyTree = async (name, version, path) => {
  if (
    existsSync(`${path}/${INFO_DIR}`) &&
    existsSync(`${path}/${DEPENDENCY_LIST_FILENAME}`)
  ) {
    return;
  }

  const installerPackageJson = JSON.parse(
    readFileSync(`${path}/${PACKAGE_FILENAME}`)
  );
  const installedVersion = installerPackageJson.dependencies[name];
  if (semver.satisfies(installedVersion, version)) {
    console.log(`INSTALL ${name}${version}`);
    installPackage(name, version, path);
  }
  rmSync(`${path}/${INFO_DIR}`, { force: true, recursive: true });
  const depList = await collectionPackageData(name, version, path);
  const sortedDepList = depList.sort();
  writeFileSync(
    `${path}/${DEPENDENCY_LIST_FILENAME}`,
    sortedDepList.join("\n")
  );
};
