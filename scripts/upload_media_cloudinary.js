/*
Uploads media from the `public/` folders to Cloudinary and writes a mapping file.

Usage:
  1. Create a Cloudinary account and get CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
  2. Install deps:
     npm install cloudinary dotenv
  3. Create a `.env` file in the repo root with:
     CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
  4. Run:
     node scripts/upload_media_cloudinary.js

Output:
  - scripts/uploaded-media.json : map of local relative paths -> uploaded secure URLs

Note: This script doesn't modify repository files. It only uploads and produces a mapping JSON.
*/

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

if (!process.env.CLOUDINARY_URL && !(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
  console.error('Cloudinary credentials not found. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const targets = [
  { dir: path.join(publicDir, 'songs'), folder: 'vibescape/songs' },
  { dir: path.join(publicDir, 'songpic'), folder: 'vibescape/songpic' },
  { dir: path.join(publicDir, 'artistpic'), folder: 'vibescape/artistpic' },
];

const uploaded = {};

async function uploadFile(localPath, remoteFolder) {
  const absolute = path.resolve(localPath);
  const opts = {
    folder: remoteFolder,
    use_filename: true,
    unique_filename: false,
    resource_type: 'auto',
  };
  try {
    const res = await cloudinary.uploader.upload(absolute, opts);
    return res.secure_url;
  } catch (err) {
    console.error('Upload failed for', localPath, err && err.message ? err.message : err);
    throw err;
  }
}

async function run() {
  for (const t of targets) {
    if (!fs.existsSync(t.dir)) continue;
    const files = fs.readdirSync(t.dir).filter(f => f && f !== '.gitkeep');
    for (const f of files) {
      const rel = path.join(path.relative(process.cwd(), t.dir), f).replace(/\\/g, '/');
      try {
        process.stdout.write(`Uploading ${rel} ... `);
        const url = await uploadFile(path.join(t.dir, f), t.folder);
        uploaded[rel] = url;
        console.log('done');
      } catch (e) {
        console.log('failed');
      }
    }
  }

  const outPath = path.join(__dirname, 'uploaded-media.json');
  fs.writeFileSync(outPath, JSON.stringify(uploaded, null, 2), 'utf8');
  console.log('\nUpload complete. Mapping written to', outPath);
}

run().catch(err => {
  console.error('Fatal error during upload:', err);
  process.exit(1);
});
