#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/mattpostcock-skills/backups/$STAMP"

SKILL_NAMES=(
  caveman
  diagnose
  write-a-skill
  zoom-out
)

skill_rel_path() {
  case "$1" in
    caveman) printf '%s\n' "skills/productivity/caveman" ;;
    diagnose) printf '%s\n' "skills/engineering/diagnose" ;;
    write-a-skill) printf '%s\n' "skills/productivity/write-a-skill" ;;
    zoom-out) printf '%s\n' "skills/engineering/zoom-out" ;;
    *) printf 'unknown skill: %s\n' "$1" >&2; return 1 ;;
  esac
}

link_skill() {
  local name="$1" dest="$2" rel src target backup_dir backup_target link_value

  rel="$(skill_rel_path "$name")"
  src="$REPO/$rel"
  target="$dest/$name"

  if [[ ! -f "$src/SKILL.md" ]]; then
    printf 'missing skill source: %s\n' "$src" >&2
    return 1
  fi

  mkdir -p "$dest"

  if [[ -e "$target" || -L "$target" ]]; then
    if [[ -L "$target" ]]; then
      rm "$target"
    else
      backup_dir="$BACKUP_ROOT/$(basename "$(dirname "$dest")")-$(basename "$dest")"
      backup_target="$backup_dir/$name"
      mkdir -p "$backup_dir"
      mv "$target" "$backup_target"
      printf 'backed up %s -> %s\n' "$target" "$backup_target"
    fi
  fi

  link_value="$(realpath --relative-to="$(dirname "$target")" "$src")"
  ln -s "$link_value" "$target"
  printf 'linked %s -> %s\n' "$target" "$src"
}

global_lock_path() {
  if [[ -n "${XDG_STATE_HOME:-}" ]]; then
    printf '%s\n' "$XDG_STATE_HOME/skills/.skill-lock.json"
  else
    printf '%s\n' "$HOME/.agents/.skill-lock.json"
  fi
}

remove_stale_lock_entries() {
  local lock_path
  lock_path="$(global_lock_path)"

  if [[ ! -f "$lock_path" ]]; then
    printf 'lock not found, skipped: %s\n' "$lock_path"
    return 0
  fi

  node - "$lock_path" "${SKILL_NAMES[@]}" <<'NODE'
const fs = require("node:fs");

const lockPath = process.argv[2];
const names = process.argv.slice(3);
const raw = fs.readFileSync(lockPath, "utf8");
const lock = JSON.parse(raw);

let changed = false;
if (lock.skills && typeof lock.skills === "object") {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(lock.skills, name)) {
      delete lock.skills[name];
      changed = true;
      console.log(`removed stale upstream lock entry: ${name}`);
    }
  }
}

if (changed) {
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
} else {
  console.log("no stale upstream lock entries found");
}
NODE
}

main() {
  local dest name
  local dests=("$HOME/.agents/skills")

  if [[ -d "$HOME/.continue" ]]; then
    dests+=("$HOME/.continue/skills")
  fi

  if [[ -d "$HOME/.openclaw" ]]; then
    dests+=("$HOME/.openclaw/skills")
  fi

  for dest in "${dests[@]}"; do
    for name in "${SKILL_NAMES[@]}"; do
      link_skill "$name" "$dest"
    done
  done

  remove_stale_lock_entries
}

main "$@"
