import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fixCloudflarePagesAssets,
  rewriteAssetReferences,
} from "./fixCloudflarePagesAssets.js";

describe("rewriteAssetReferences", () => {
  it("rewrites plain, escaped, and encoded Expo asset paths", () => {
    const input = [
      '"/assets/node_modules/@expo/vector-icons/Fonts/Ionicons.ttf"',
      '"assets\\/node_modules/@expo/vector-icons/Fonts/Ionicons.ttf"',
      "assets%2Fnode_modules/@expo/vector-icons/Fonts/Ionicons.ttf",
    ].join("\n");

    const out = rewriteAssetReferences(input);
    expect(out).toContain("/assets/npm/@expo/vector-icons/Fonts/Ionicons.ttf");
    expect(out).toContain("assets\\/npm/@expo/vector-icons/Fonts/Ionicons.ttf");
    expect(out).toContain("assets%2Fnpm/@expo/vector-icons/Fonts/Ionicons.ttf");
    expect(out).not.toContain("node_modules");
  });
});

describe("fixCloudflarePagesAssets", () => {
  it("renames exported node_modules assets and rewrites bundle URLs", () => {
    const root = mkdtempSync(join(tmpdir(), "cf-pages-assets-"));
    try {
      const fontDir = join(
        root,
        "assets",
        "node_modules",
        "@expo",
        "vector-icons",
        "Fonts"
      );
      mkdirSync(fontDir, { recursive: true });
      writeFileSync(join(fontDir, "Ionicons.ttf"), "fake-font");
      mkdirSync(join(root, "_expo", "static", "js", "web"), { recursive: true });
      writeFileSync(
        join(root, "_expo", "static", "js", "web", "entry.js"),
        'src:"/assets/node_modules/@expo/vector-icons/Fonts/Ionicons.ttf"'
      );

      const result = fixCloudflarePagesAssets(root);
      expect(result.renamed).toBe(1);
      expect(result.rewritten).toBe(1);
      expect(
        readFileSync(join(root, "assets", "npm", "@expo", "vector-icons", "Fonts", "Ionicons.ttf"), "utf8")
      ).toBe("fake-font");
      expect(
        readFileSync(join(root, "_expo", "static", "js", "web", "entry.js"), "utf8")
      ).toBe('src:"/assets/npm/@expo/vector-icons/Fonts/Ionicons.ttf"');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
