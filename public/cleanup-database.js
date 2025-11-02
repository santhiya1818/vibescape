// Clear all songs from database
// Run this script once to clean up test data

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vibescapeUser:santhiya1325@cluster0.dfq4mbe.mongodb.net/vibescape?retryWrites=true&w=majority';

// Song Schema (same as in server.js)
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    file: { type: String, required: true },
    genre: { type: String, default: 'Unknown' },
    image: String,
    albumArt: String,
    artistImage: String,
    uploadDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

const Song = mongoose.model('Song', songSchema);

async function clearAllSongs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const result = await Song.deleteMany({});
        console.log(`Deleted ${result.deletedCount} songs from database`);
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearAllSongs();