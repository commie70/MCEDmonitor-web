#!/usr/bin/env node

/**
 * Generates clone-website skill files for the platforms this project uses:
 * Codex CLI and Kimi Code.
 * Source of truth: .codex/skills/clone-website/SKILL.md
 *
 * Usage: node scripts/sync-skills.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, '.codex', 'skills', 'clone-website', 'SKILL.md');

let raw;
try {
  raw = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');
} catch {
  console.error(`Error: Source skill not found at .codex/skills/clone-website/SKILL.md`);
  process.exit(1);
}

function write(relPath, content) {
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  console.log(`  \u2713 ${relPath}`);
}

console.log('Syncing clone-website skill (Codex CLI / Kimi Code)...');
console.log(`  Source: .codex/skills/clone-website/SKILL.md\n`);

// Codex CLI — canonical copy
write('.codex/skills/clone-website/SKILL.md', raw);

// Kimi Code — same SKILL.md format
write('.kimi-code/skills/clone-website/SKILL.md', raw);

console.log('\nDone! Skill files generated for Codex CLI and Kimi Code.');
