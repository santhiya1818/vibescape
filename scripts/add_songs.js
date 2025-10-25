/**
 * Helper script to insert songs into MongoDB using the Song model
 * Usage: node scripts/add_songs.js songs-to-add.json
 *
 * Place your audio files in public/songs/, artwork in public/songpic/ and public/artistpic/
 * Edit the JSON file with entries similar to songs-to-add.json.example
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('Usage: node scripts/add_songs.js <songs-json-file>');
  process.exit(1);
}

const file = argv[0];
if (!fs.existsSync(file)) {
  console.error('File not found:', file);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Load server.js to reuse the Song model definition
const serverPath = path.join(__dirname, '..', 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error('server.js not found in project root. Run this script from project root.');
  process.exit(1);
}

// Require the server and models
const { Song } = require('../server-models-helper');

async function main() {
  try {
    await Promise.all(data.map(async (item) => {
      const exists = await Song.findOne({ title: item.title, artist: item.artist });
      if (exists) {
        console.log(`Skipping existing song: ${item.title} - ${item.artist}`);
        return;
      }
      const s = new Song(item);
      await s.save();
      console.log(`Inserted: ${item.title} - ${item.artist}`);
    }));
  } catch (err) {
    console.error('Error inserting songs:', err);
  } finally {
    mongoose.connection.close();
  }
}

main();