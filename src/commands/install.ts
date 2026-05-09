import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { copyDir, listSkills } from "../skills.js";
import { CliError } from "../errors.js";

export interface RunInstallOpts {
  assetsDir: string;
  targetDir: string;
  skills: string[];
  force: boolean;
  write: (s: string) => void;
}

export async function runInstall(opts: RunInstallOpts): Promise<void> {
  const available = listSkills(opts.assetsDir);
  for (const name of opts.skills) {
    if (!available.includes(name)) {
      throw new CliError("usage", `unknown skill: ${name}. Try \`loomy install --list\`.`);
    }
  }
  if (!existsSync(opts.targetDir)) mkdirSync(opts.targetDir, { recursive: true });
  for (const name of opts.skills) {
    const dest = join(opts.targetDir, name);
    if (existsSync(dest)) {
      if (!opts.force) throw new CliError("usage", `${dest} exists. Pass --force to overwrite.`);
      rmSync(dest, { recursive: true, force: true });
    }
    copyDir(join(opts.assetsDir, name), dest);
    opts.write(`installed ${name} -> ${dest}\n`);
  }
}

export interface RunInstallListOpts {
  assetsDir: string;
  write: (s: string) => void;
}

export async function runInstallList(opts: RunInstallListOpts): Promise<void> {
  for (const name of listSkills(opts.assetsDir)) opts.write(`${name}\n`);
}
