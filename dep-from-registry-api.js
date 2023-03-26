import { existsSync, writeFileSync } from "fs";
import semver from "semver";

import { url } from "./constants.js";

const DESTINATION_FILE = "api-dep-tree.json";

const fetchPackageData = async (name, version) => {
  const completeUrl = `${url}/${name}/${version}`;
  console.log(`GET ${completeUrl}`);
  const result = await fetch(completeUrl);
  const data = await result.json();

  return data;
};

export const getApiDependencyTree = async (name, version, path) => {
  if (existsSync(`${path}/${DESTINATION_FILE}`)) {
    return;
  }

  const semnaticVersion = semver.coerce(version).version;
  const data = await fetchPackageData(name, semnaticVersion);
  const info = {
    name: data.name,
    version: data.version,
    license: data.license,
  };
  info.repository = data.repository.url.replace("git+", "");
  info.dependencies = {};

  if (data.dependencies !== undefined) {
    const dependencies = Object.entries(data.dependencies);
    await Promise.all(
      dependencies.map(async ([depName, depVersion]) => {
        const exactDepVersion = depVersion.replace(/[^.\d]/g, "");
        const depInfo = await getApiDependencyTree(
          depName,
          exactDepVersion,
          path
        );
        info.dependencies[depName] = depInfo;
      })
    );
  }

  writeFileSync(`${path}/${DESTINATION_FILE}`, JSON.stringify(info, null, 2));
};
