// Helper to expose Mongoose models for scripts without starting the full server
require('dotenv').config();
const mongoose = require('mongoose');

const dbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/vibescape";
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB for scripts'))
  .catch(err => {
    console.error('Could not connect to MongoDB for scripts:', err);
    process.exit(1);
  });

const songSchema = new mongoose.Schema({
  title: String, artist: String, genre: String, emotion: String,
  file: String, art: String, artistArt: String,
  uploadDate: { type: Date, default: Date.now }
});

const Song = mongoose.model('Song', songSchema);

module.exports = { mongoose, Song };