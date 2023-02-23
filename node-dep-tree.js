import fs from "fs";

import { getDependencyTree } from "./helpers.js";

const DESTINATION_FILE = "./dependency-tree.json";

if (process.argv.length === 3) {
  const target = process.argv[2];
  if (target.indexOf("@") !== -1) {
    const [packageName, packageVersion] = target.split("@");
    const depTree = await getDependencyTree(packageName, packageVersion);
    fs.writeFileSync(DESTINATION_FILE, JSON.stringify(depTree, null, 2));
    process.exit();
  }
}

console.log(
  "ERR: only provide one additional argument as PACKAGE_NAME@SEMANTIC_VERSION"
);
