import { existsSync, mkdirSync, writeFileSync } from "fs";

import { getInstallDependencyTree } from "./dep-tree-from-install.js";
import { getApiDependencyTree } from "./dep-from-registry-api.js";

const DESTINATION_FILE = "api-dep-tree.json";
const PACKAGES_DIR = "./packages";

if (process.argv.length === 3) {
  const target = process.argv[2];
  if (target.indexOf("@") !== -1) {
    const [packageName, packageVersion] = target.split("@");

    // Ensure packages directory exists
    const path = `${PACKAGES_DIR}/${target}`;
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }

    // Generate dependency tree from npm's public registry API
    const apiDepTree = await getApiDependencyTree(packageName, packageVersion);
    writeFileSync(
      `${path}/${DESTINATION_FILE}`,
      JSON.stringify(apiDepTree, null, 2)
    );
    process.exit();
  }
}

console.log(
  "ERR: only provide one additional argument as PACKAGE_NAME@SEMANTIC_VERSION"
);
