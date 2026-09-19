#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Programmatically fetch the public SYNTHETIC Synthea sample dataset from
// https://github.com/lhs-open/synthetic-data (record/synthea-dataset-100.zip)
// and extract it under source_data/.
//
// Only synthetic, non-PHI data is downloaded (Synthea generates fabricated
// patients). The large Hugging Face Synthea exports are intentionally NOT used.
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const URL = 'https://raw.githubusercontent.com/lhs-open/synthetic-data/main/record/synthea-dataset-100.zip'
const ZIP = 'source_data/synthea-dataset-100.zip'

fs.mkdirSync('source_data', { recursive: true })
console.log(`Downloading ${URL} …`)
execFileSync('curl', ['-sSL', '-m', '120', '-o', ZIP, URL], { stdio: 'inherit' })
const size = fs.statSync(ZIP).size
if (size < 1_000_000) {
  console.error(`Downloaded file looks too small (${size} bytes) — aborting.`)
  process.exit(1)
}
console.log(`Downloaded ${(size / 1e6).toFixed(1)} MB. Extracting…`)
execFileSync('unzip', ['-oq', ZIP, '-d', 'source_data'], { stdio: 'inherit' })
console.log('Done. Next: npm run build:source')
