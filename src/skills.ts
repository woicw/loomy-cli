import { readdirSync, existsSync, mkdirSync, copyFileSync, readlinkSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

export function defaultAssetsDir(): string {
  // Resolved at runtime relative to dist/cli.js → dist/assets/skills
  // When running via tsx (dev), use src/../assets/skills equivalent.
  const here = dirname(fileURLToPath(import.meta.url));
  // Try bundled location first, then dev location.
  const candidates = [
    join(here, "assets", "skills"),
    join(here, "..", "assets", "skills"),
    join(here, "..", "..", "assets", "skills"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return candidates[0]!;
}

export function defaultTargetDir(): string {
  return join(process.env.HOME ?? "/", ".claude", "skills");
}

export function listSkills(assetsDir: string): string[] {
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function copyDir(src: string, dest: string): void {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isSymbolicLink()) symlinkSync(readlinkSync(s), d);
    else copyFileSync(s, d);
  }
}
