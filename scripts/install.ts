#!/usr/bin/env bun
// Cross-platform installer for the preserved Matt Pocock skills.
// Targets opencode's skill dir: ~/.agents/skills
// Usage:
//   bun run https://raw.githubusercontent.com/LocalT0aster/mattpostcock_skills/master/scripts/install.ts
// or:
//   git clone https://github.com/LocalT0aster/mattpostcock_skills.git
//   bun run mattpostcock_skills/scripts/install.ts

import { $ } from "bun";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir, platform } from "node:os";

const REPO_URL = "https://github.com/LocalT0aster/mattpostcock_skills.git";
const DEFAULT_BRANCH = "master";

const SKILLS: Array<{ name: string; rel: string }> = [
  { name: "caveman", rel: "skills/productivity/caveman" },
  { name: "diagnose", rel: "skills/engineering/diagnose" },
  { name: "review", rel: "skills/in-progress/review" },
  { name: "to-issues", rel: "skills/in-progress/to-issues" },
  { name: "to-prd", rel: "skills/in-progress/to-prd" },
  { name: "write-a-skill", rel: "skills/productivity/write-a-skill" },
  { name: "zoom-out", rel: "skills/engineering/zoom-out" },
];

const home = homedir();
const isWin = platform() === "win32";

function dataRoot(): string {
  if (isWin) {
    return join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "mattpostcock_skills");
  }
  return join(process.env.XDG_DATA_HOME ?? join(home, ".local", "share"), "mattpostcock_skills");
}

function backupRoot(): string {
  if (isWin) {
    return join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "mattpostcock-skills", "backups");
  }
  return join(process.env.XDG_STATE_HOME ?? join(home, ".local", "state"), "mattpostcock-skills", "backups");
}

function skillsDir(): string {
  return join(home, ".agents", "skills");
}

function copyRecursive(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

function lstatIfExists(p: string) {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}

async function ensureClone(target: string): Promise<void> {
  if (existsSync(join(target, ".git"))) {
    console.log(`Updating existing clone at ${target}`);
    const result = await $`git -C ${target} pull --ff-only`.nothrow().quiet();
    if (result.exitCode !== 0) {
      console.warn(
        `git pull failed (exit ${result.exitCode}); continuing with the existing clone.\n` +
          `${result.stderr.toString().trim()}`,
      );
    }
    return;
  }
  if (existsSync(target)) {
    const bak = `${target}.preinstall.${Date.now()}`;
    renameSync(target, bak);
    console.log(`Moved pre-existing ${target} aside -> ${bak}`);
  }
  mkdirSync(dirname(target), { recursive: true });
  console.log(`Cloning ${REPO_URL} -> ${target}`);
  await $`git clone --depth 1 --branch ${DEFAULT_BRANCH} ${REPO_URL} ${target}`.quiet();
}

function installSkill(name: string, rel: string, cloneRoot: string, dest: string): boolean {
  const src = join(cloneRoot, rel);
  if (!existsSync(join(src, "SKILL.md"))) {
    console.error(`x ${name}: missing SKILL.md at ${src}`);
    return false;
  }

  const target = join(dest, name);
  const existing = lstatIfExists(target);
  if (existing) {
    if (existing.isSymbolicLink()) {
      rmSync(target, { force: true });
    } else if (existing.isDirectory()) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "");
      const backup = join(backupRoot(), stamp, name);
      mkdirSync(backup, { recursive: true });
      renameSync(target, join(backup, name));
      console.log(`Backed up existing dir ${target} -> ${join(backup, name)}`);
    } else {
      rmSync(target, { force: true });
    }
  }

  try {
    symlinkSync(src, target, "dir");
    console.log(`+ linked ${target} -> ${src}`);
    return true;
  } catch (err: any) {
    console.warn(
      `symlink for ${name} failed (${err?.code ?? err?.message ?? err}); copying files instead.`,
    );
    try {
      copyRecursive(src, target);
      console.log(
        `+ copied ${src} -> ${target}\n` +
          `  (symlinks unavailable -- re-run this installer to pick up repo updates)`,
      );
      return true;
    } catch (copyErr: any) {
      console.error(`x ${name}: copy fallback failed: ${copyErr?.message ?? copyErr}`);
      return false;
    }
  }
}

async function main(): Promise<void> {
  console.log(`mattpostcock-skills installer -- platform=${platform()}`);

  if (!home) {
    console.error("Could not determine home directory.");
    process.exit(1);
  }

  const cloneRoot = dataRoot();
  await ensureClone(cloneRoot);

  const dest = skillsDir();
  mkdirSync(dest, { recursive: true });

  let ok = 0;
  let failed = 0;
  for (const { name, rel } of SKILLS) {
    if (installSkill(name, rel, cloneRoot, dest)) ok++;
    else failed++;
  }

  console.log(`\nDone. ${ok}/${SKILLS.length} skills installed into ${dest}`);
  if (failed > 0) {
    console.error(`${failed} skill(s) failed; see messages above.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Installer failed:", err);
  process.exit(1);
});
