import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const bunModulesRoot = path.join(repoRoot, "node_modules", ".bun");
const hoistedNodeModulesRoot = path.join(repoRoot, "node_modules");
const draggableTargetPrefix = "react-native-draggable-flatlist@4.0.3+";
const clerkExpoTargetPrefix = "@clerk+clerk-expo@";

function replaceOnce(source, searchValue, replaceValue) {
  if (!source.includes(searchValue)) {
    return source;
  }

  return source.replace(searchValue, replaceValue);
}

function fixNestableFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const repaired = replaceOnce(
    source,
    `    //@ts-ignore
    if (containerNode == null || scrollNode == null) {
      onFail();
      return;
    }

    UIManager.measureLayout(containerNode, scrollNode, onFail, onSuccess);

  const onDragBegin`,
    `    if (containerNode == null || scrollNode == null) {
      onFail();
      return;
    }

    UIManager.measureLayout(containerNode, scrollNode, onFail, onSuccess);
  });

  const onDragBegin`,
  );

  if (repaired !== source) {
    writeFileSync(filePath, repaired);
    return true;
  }

  return false;
}

function fixDraggableFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  let repaired = source;

  repaired = replaceOnce(
    repaired,
    `    if (cellData) {
      activeCellOffset.value = cellData.measurements.offset;
      activeCellSize.value = cellData.measurements.size;
    }

      spacerIndexAnim.value = index;
      activeIndexAnim.value = index;
      setActiveKey(activeKey);
      onDragBegin?.(index);
  });`,
    `    if (cellData) {
      activeCellOffset.value = cellData.measurements.offset;
      activeCellSize.value = cellData.measurements.size;
    }

    if (index !== undefined) {
      spacerIndexAnim.value = index;
      activeIndexAnim.value = index;
      setActiveKey(activeKey);
    }
  });`,
  );

  repaired = replaceOnce(
    repaired,
    `    })
    .onUpdate((evt) => {
    .onStart(() => {
      if (gestureDisabled.value) return;
      if (activeIndexAnim.value >= 0) {
        runOnJS(onDragBegin)(activeIndexAnim.value);
      }
    })
      if (gestureDisabled.value) return;`,
    `    })
    .onStart(() => {
      if (gestureDisabled.value) return;
      if (activeIndexAnim.value >= 0) {
        runOnJS(onDragBegin)(activeIndexAnim.value);
      }
    })
    .onUpdate((evt) => {
      if (gestureDisabled.value) return;`,
  );

  repaired = replaceOnce(
    repaired,
    `  if (dragHitSlop) panGesture.hitSlop(dragHitSlop);
  if (typeof activateAfterLongPress === "number" && activateAfterLongPress > 0) {
    panGesture.activateAfterLongPress(activateAfterLongPress);
  }`,
    `  if (typeof activateAfterLongPress === "number" && activateAfterLongPress > 0) {
    panGesture.activateAfterLongPress(activateAfterLongPress);
  }
  if (dragHitSlop) panGesture.hitSlop(dragHitSlop);`,
  );

  if (repaired !== source) {
    writeFileSync(filePath, repaired);
    return true;
  }

  return false;
}

function fixPackageCopy(packageRoot) {
  const draggableFile = path.join(
    packageRoot,
    "src",
    "components",
    "DraggableFlatList.tsx",
  );
  const nestableFile = path.join(
    packageRoot,
    "src",
    "components",
    "NestableDraggableFlatList.tsx",
  );

  if (!existsSync(draggableFile) || !existsSync(nestableFile)) {
    return false;
  }

  const draggableChanged = fixDraggableFile(draggableFile);
  const nestableChanged = fixNestableFile(nestableFile);
  return draggableChanged || nestableChanged;
}

function fixClerkExpoPackage(packageRoot) {
  const packageJsonPath = path.join(packageRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return false;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const exportsField = packageJson.exports ?? {};

  let changed = false;

  const requiredExports = {
    "./dist/provider/ClerkProvider": {
      types: "./dist/provider/ClerkProvider.d.ts",
      default: "./dist/provider/ClerkProvider.js",
    },
    "./dist/hooks/useAuth": {
      types: "./dist/hooks/useAuth.d.ts",
      default: "./dist/hooks/useAuth.js",
    },
    "./dist/hooks/useSSO": {
      types: "./dist/hooks/useSSO.d.ts",
      default: "./dist/hooks/useSSO.js",
    },
  };

  for (const [subpath, exportValue] of Object.entries(requiredExports)) {
    if (!(subpath in exportsField)) {
      exportsField[subpath] = exportValue;
      changed = true;
    }
  }

  if (!changed) {
    return false;
  }

  packageJson.exports = exportsField;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return true;
}

function main() {
  let draggableChangedCount = 0;
  let clerkChangedCount = 0;

  const directDraggablePackageRoot = path.join(
    hoistedNodeModulesRoot,
    "react-native-draggable-flatlist",
  );
  if (existsSync(directDraggablePackageRoot) && fixPackageCopy(directDraggablePackageRoot)) {
    draggableChangedCount += 1;
  }

  const directClerkExpoPackageRoot = path.join(
    hoistedNodeModulesRoot,
    "@clerk",
    "clerk-expo",
  );
  if (existsSync(directClerkExpoPackageRoot) && fixClerkExpoPackage(directClerkExpoPackageRoot)) {
    clerkChangedCount += 1;
  }

  if (existsSync(bunModulesRoot)) {
    for (const entry of readdirSync(bunModulesRoot)) {
      if (entry.startsWith(draggableTargetPrefix)) {
        const packageRoot = path.join(
          bunModulesRoot,
          entry,
          "node_modules",
          "react-native-draggable-flatlist",
        );

        if (fixPackageCopy(packageRoot)) {
          draggableChangedCount += 1;
        }
        continue;
      }

      if (entry.startsWith(clerkExpoTargetPrefix)) {
        const packageRoot = path.join(
          bunModulesRoot,
          entry,
          "node_modules",
          "@clerk",
          "clerk-expo",
        );

        if (fixClerkExpoPackage(packageRoot)) {
          clerkChangedCount += 1;
        }
      }
    }
  }

  if (draggableChangedCount > 0) {
    console.log(
      `Repaired ${draggableChangedCount} react-native-draggable-flatlist package entr${draggableChangedCount === 1 ? "y" : "ies"} after Bun patching.`,
    );
  }

  if (clerkChangedCount > 0) {
    console.log(
      `Patched Clerk Expo exports in ${clerkChangedCount} package entr${clerkChangedCount === 1 ? "y" : "ies"} for Metro compatibility.`,
    );
  }
}

main();
