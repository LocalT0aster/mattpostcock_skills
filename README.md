# Preserved Matt Pocock Skills

This repo freezes Matt Pocock skills that were installed locally but later disappeared from `mattpocock/skills`.

Preserved skills:

- `caveman`
- `diagnose`
- `write-a-skill`
- `zoom-out`

Run `scripts/install-preserved-skills.sh` to link these copies into the local agent skill dirs and remove their stale upstream lock entries. Removing those lock entries stops `skills update -g` from asking to delete these local copies when upstream no longer contains them.

The script links into:

- `~/.agents/skills`
- `~/.continue/skills`, when `~/.continue` exists
- `~/.openclaw/skills`, when `~/.openclaw` exists

Existing non-symlink skill dirs are moved to `~/.local/state/mattpostcock-skills/backups/<timestamp>/` before links are created.
