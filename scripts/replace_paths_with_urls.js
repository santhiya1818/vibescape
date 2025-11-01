/*
Replaces local `public/...` paths in a songs JSON with uploaded Cloudinary URLs.

Usage:
  1. Ensure `scripts/uploaded-media.json` exists (created by `upload_media_cloudinary.js`).
  2. Copy your local songs JSON (e.g. `new-songs.json`) to `scripts/input-songs.json` or point to another path.
  3. Run:
     node scripts/replace_paths_with_urls.js scripts/input-songs.json scripts/output-songs-with-urls.json

This script will look for occurrences of filenames found in uploaded-media.json and replace the path with the uploaded URL.
*/

const fs = require('fs');
const path = require('path');

function loadJSON(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const mappingPath = path.join(__dirname, 'uploaded-media.json');
const mapping = loadJSON(mappingPath) || {};

const argv = process.argv.slice(2);
if (argv.length < 2) {
  console.error('Usage: node scripts/replace_paths_with_urls.js <input-json> <output-json>');
  process.exit(1);
}

const [inputJson, outputJson] = argv;
const data = loadJSON(inputJson);
if (!data) {
  console.error('Input JSON not found:', inputJson);
  process.exit(1);
}

// Helper: find mapping by filename
function urlForPath(p) {
  if (!p) return null;
  // try exact match first
  if (mapping[p]) return mapping[p];
  const basename = path.basename(p).replace(/\\/g, '/');
  // try matching by basename in mapping keys
  for (const k of Object.keys(mapping)) {
    if (k.endsWith('/' + basename) || k === basename) return mapping[k];
  }
  return null;
}

function replaceInValue(val) {
  if (typeof val !== 'string') return val;
  const u = urlForPath(val);
  return u || val;
}

function walk(obj) {
  if (Array.isArray(obj)) return obj.map(walk);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      out[k] = walk(obj[k]);
    }
    return out;
  }
  return replaceInValue(obj);
}

const out = walk(data);
fs.writeFileSync(outputJson, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote', outputJson);
