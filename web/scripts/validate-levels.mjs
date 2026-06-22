import Ajv from "ajv";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const levelsDir = join(repoRoot, "content/levels");
const schemaPath = join(levelsDir, "campaign-level.schema.json");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function collectPoolIds(level) {
  return new Set(level.pools.map((pool) => pool.id));
}

function collectBackendIds(level) {
  return new Set(level.pools.flatMap((pool) => pool.backends.map((backend) => backend.id)));
}

function validateReferences(level, fileName) {
  const errors = [];
  const poolIds = collectPoolIds(level);
  const backendIds = collectBackendIds(level);

  for (const [port, listener] of Object.entries(level.listeners)) {
    if (listener.defaultRule.action === "route" && !poolIds.has(listener.defaultRule.targetPoolId)) {
      errors.push(`${fileName}: listener ${port} defaultRule targets unknown pool "${listener.defaultRule.targetPoolId}"`);
    }

    for (const rule of listener.starterRules) {
      if (!poolIds.has(rule.targetPoolId)) {
        errors.push(`${fileName}: rule "${rule.id}" targets unknown pool "${rule.targetPoolId}"`);
      }
    }
  }

  for (const event of level.healthEvents) {
    if (!backendIds.has(event.backendId)) {
      errors.push(`${fileName}: health event references unknown backend "${event.backendId}"`);
    }
  }

  const expectedId = `level_${String(level.index).padStart(2, "0")}`;
  if (level.id !== expectedId) {
    errors.push(`${fileName}: id "${level.id}" does not match index ${level.index} (expected ${expectedId})`);
  }

  return errors;
}

const levelFiles = readdirSync(levelsDir)
  .filter((name) => name.startsWith("level_") && name.endsWith(".json"))
  .sort();

let failed = false;

for (const fileName of levelFiles) {
  const filePath = join(levelsDir, fileName);
  const level = JSON.parse(readFileSync(filePath, "utf8"));

  if (!validate(level)) {
    failed = true;
    console.error(`Schema validation failed for ${fileName}:`);
    for (const error of validate.errors ?? []) {
      console.error(`  - ${error.instancePath || "/"} ${error.message}`);
    }
  }

  const referenceErrors = validateReferences(level, fileName);
  if (referenceErrors.length > 0) {
    failed = true;
    for (const message of referenceErrors) {
      console.error(message);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Validated ${levelFiles.length} campaign level files.`);
