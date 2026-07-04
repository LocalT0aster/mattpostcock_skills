# Preserved Matt Pocock Skills

This repo freezes Matt Pocock skills that were installed locally but later disappeared from `mattpocock/skills`.

Preserved skills:

- `caveman`
- `diagnose`
- `review`
- `write-a-skill`
- `zoom-out`

Run `scripts/install-preserved-skills.sh` to link these copies into the local agent skill dirs and remove their stale upstream lock entries. Removing those lock entries stops `skills update -g` from asking to delete these local copies when upstream no longer contains them.

The script links into:

- `~/.agents/skills`
- `~/.continue/skills`, when `~/.continue` exists
- `~/.openclaw/skills`, when `~/.openclaw` exists

Existing non-symlink skill dirs are moved to `~/.local/state/mattpostcock-skills/backups/<timestamp>/` before links are created.

## Install on another machine (friend setup)

Prerequisites: [Bun](https://bun.sh) and `git` on PATH. Works on Linux, macOS, and Windows.

### Recommended (always works)

```sh
git clone https://github.com/LocalT0aster/mattpostcock_skills.git
cd mattpostcock_skills
bun run scripts/install.ts
```

### One-liner (if your Bun supports remote-URL execution)

```sh
bun run https://raw.githubusercontent.com/LocalT0aster/mattpostcock_skills/master/scripts/install.ts
```

What the installer does:

- Clones/pulls the repo into a stable per-user path
  (`~/.local/share/mattpostcock_skills` on Linux/macOS,
  `%LOCALAPPDATA%\mattpostcock_skills` on Windows).
- Links the 5 skills into `~/.agents/skills` (opencode's skill dir).
- Backs up any pre-existing real skill dir to
  `~/.local/state/mattpostcock-skills/backups/<timestamp>/`.
- On Windows without Developer Mode/admin, falls back to copying the skill
  files (note: `git pull` will then not auto-update them — re-run the installer).

Re-running the installer is safe: it pulls the latest repo and relinks.

### Linux/macOS only (original bash installer)

```sh
./scripts/install-preserved-skills.sh
```

Requires `bash` and `node`. Also cleans stale entries from
`~/.agents/.skill-lock.json` and links into `~/.continue/skills` and
`~/.openclaw/skills` when those dirs exist.
