#!/usr/bin/env node
// Bouwt lookup/v1/*.json uit seeds/*.json.
//
// Verantwoordelijkheden:
// 1. Lees elke seeds/<id>.json.
// 2. Transformeer naar het ADR-0019 pack-schema (zonder OFF-call — seeds zijn
//    de bron-van-waarheid).
// 3. Schrijf lookup/v1/<id>.json met dataVersion = vandaag (UTC, ISO-datum).
// 4. Compute SHA-256 per pack en (her)genereer lookup/v1/index.json met
//    bestandsgrootte + hash.
//
// Geen netwerk-call. Deterministisch (zelfde input → zelfde output behalve
// dataVersion). Falen is hard — exit 1 bij ontbrekende velden of schema-shifts.

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SEEDS_DIR = join(ROOT, 'seeds');
const OUT_DIR = join(ROOT, 'lookup', 'v1');

const SCHEMA_VERSION = 1;
const INDEX_VERSION = 1;

const VALID_CATEGORIES = new Set([
  'fruit', 'vegetables', 'bread', 'dairy', 'cheese', 'meat', 'fish',
  'pantry', 'bakingFlour', 'saucesCondiments', 'beverages', 'alcohol',
  'snacksSweets', 'frozenMeals', 'household', 'leftovers', 'other',
]);

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10);
}

function validateProduct(p, seedId, idx) {
  const ctx = `${seedId}.products[${idx}]`;
  if (!p.names || typeof p.names !== 'object' || Object.keys(p.names).length === 0) {
    throw new Error(`${ctx}: missing 'names'`);
  }
  if (!VALID_CATEGORIES.has(p.category)) {
    throw new Error(`${ctx}: invalid category '${p.category}'`);
  }
  if (p.shelfLifeDays !== undefined && (!Number.isInteger(p.shelfLifeDays) || p.shelfLifeDays < 0)) {
    throw new Error(`${ctx}: shelfLifeDays must be non-negative integer`);
  }
  if (p.daysAfterOpening !== undefined && (!Number.isInteger(p.daysAfterOpening) || p.daysAfterOpening < 0)) {
    throw new Error(`${ctx}: daysAfterOpening must be non-negative integer`);
  }
}

function buildPack(seed) {
  const products = seed.products.map((p, i) => {
    validateProduct(p, seed.id, i);
    const out = {
      names: p.names,
      aliases: p.aliases ?? [],
      category: p.category,
    };
    if (p.shelfLifeDays !== undefined) out.shelfLifeDays = p.shelfLifeDays;
    if (p.daysAfterOpening !== undefined) out.daysAfterOpening = p.daysAfterOpening;
    if (p.tracksOpening !== undefined) out.tracksOpening = p.tracksOpening;
    if (p.barcode !== undefined) out.barcode = p.barcode;
    return out;
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    dataVersion: todayUtcIso(),
    id: seed.id,
    country: seed.country ?? null,
    languages: seed.languages,
    products,
  };
}

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = await readdir(SEEDS_DIR);
  const seedFiles = entries.filter((f) => f.endsWith('.json'));
  if (seedFiles.length === 0) {
    throw new Error('No seed files found in seeds/');
  }

  const indexPacks = [];
  for (const file of seedFiles.sort()) {
    const seedPath = join(SEEDS_DIR, file);
    const raw = await readFile(seedPath, 'utf8');
    const seed = JSON.parse(raw);

    const pack = buildPack(seed);
    const packJson = JSON.stringify(pack, null, 2) + '\n';
    const packBuf = Buffer.from(packJson, 'utf8');
    const outName = seed.id === 'core' ? 'core.json' : `locale-${seed.id}.json`;
    await writeFile(join(OUT_DIR, outName), packBuf);

    indexPacks.push({
      id: seed.id,
      displayName: seed.displayName,
      languages: seed.languages,
      schemaVersion: SCHEMA_VERSION,
      dataVersion: pack.dataVersion,
      url: `lookup/v1/${outName}`,
      sizeBytes: packBuf.length,
      sha256: sha256Hex(packBuf),
    });

    console.log(`✓ ${outName}  (${packBuf.length} bytes, ${pack.products.length} products)`);
  }

  const index = {
    indexVersion: INDEX_VERSION,
    replacement_host: null,
    packs: indexPacks,
  };
  const indexJson = JSON.stringify(index, null, 2) + '\n';
  await writeFile(join(OUT_DIR, 'index.json'), indexJson);
  console.log(`✓ index.json (${indexPacks.length} packs)`);
}

main().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
