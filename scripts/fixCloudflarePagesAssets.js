#!/usr/bin/env node
/**
 * Cloudflare Pages refuses to upload any directory named `node_modules`.
 * Expo web export puts icon fonts (Ionicons.ttf, etc.) at
 * `dist/assets/node_modules/@expo/vector-icons/...`, so production icons 404
 * and render as empty. Rename that folder and rewrite bundled URLs.
 */
const fs = require("node:fs");
const path = require("node:path");

const FROM_DIR = "node_modules";
const TO_DIR = "npm";
const FROM_SEGMENT = `assets/${FROM_DIR}`;
const TO_SEGMENT = `assets/${TO_DIR}`;
const TEXT_EXT = new Set([".js", ".css", ".html", ".json", ".map", ".txt"]);

function rewriteAssetReferences(content) {
  return content
    .replaceAll("assets\\/node_modules", "assets\\/npm")
    .replaceAll("assets%2Fnode_modules", "assets%2Fnpm")
    .replaceAll("assets%2fnode_modules", "assets%2fnpm")
    .replaceAll("assets/node_modules", "assets/npm");
}

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, files);
    else files.push(full);
  }
  return files;
}

function findNamedDirs(root, name, found = []) {
  if (!fs.existsSync(root)) return found;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name === name) found.push(full);
    else findNamedDirs(full, name, found);
  }
  return found;
}

function rewriteTextFiles(distDir) {
  let rewritten = 0;
  for (const file of walkFiles(distDir)) {
    if (!TEXT_EXT.has(path.extname(file))) continue;
    const original = fs.readFileSync(file, "utf8");
    const next = rewriteAssetReferences(original);
    if (next === original) continue;
    fs.writeFileSync(file, next);
    rewritten += 1;
  }
  return rewritten;
}

function fixCloudflarePagesAssets(distDir) {
  if (!fs.existsSync(distDir)) {
    throw new Error(`Export output not found: ${distDir}`);
  }

  const named = findNamedDirs(distDir, FROM_DIR);
  for (const src of named) {
    const dest = path.join(path.dirname(src), TO_DIR);
    if (fs.existsSync(dest)) {
      throw new Error(`Refusing to overwrite existing ${dest}`);
    }
    fs.renameSync(src, dest);
  }

  const rewritten = rewriteTextFiles(distDir);
  return { renamed: named.length, rewritten };
}

function main() {
  const distDir = path.join(__dirname, "..", "dist");
  const { renamed, rewritten } = fixCloudflarePagesAssets(distDir);
  if (renamed === 0 && rewritten === 0) {
    console.log("No dist/assets/node_modules paths to rewrite.");
    return;
  }
  console.log(
    `Cloudflare Pages asset fix: renamed ${renamed} node_modules dir(s) to ${TO_DIR}; rewrote ${rewritten} file(s) (${FROM_SEGMENT} → ${TO_SEGMENT}).`
  );
}

module.exports = {
  FROM_SEGMENT,
  TO_SEGMENT,
  rewriteAssetReferences,
  fixCloudflarePagesAssets,
};

if (require.main === module) {
  main();
}
