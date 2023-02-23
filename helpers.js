import semver from "semver";

import { url } from "./constants.js";

const fetchPackageData = async (name, version) => {
  const completeUrl = `${url}/${name}/${version}`;
  console.log(`GET ${completeUrl}`);
  const result = await fetch(completeUrl);
  const data = await result.json();

  return data;
};

export const getDependencyTree = async (name, version) => {
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
        const depInfo = await getDependencyTree(depName, exactDepVersion);
        info.dependencies[depName] = depInfo;
      })
    );
  }

  return info;
};
