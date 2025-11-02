// Database Migration Script
// This script standardizes all song documents to have consistent fields

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vibescapeUser:santhiya1325@cluster0.dfq4mbe.mongodb.net/vibescape?retryWrites=true&w=majority';

// Current Song Schema (to match what we want)
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    file: { type: String, required: true },
    genre: { type: String, default: 'Unknown' },
    emotion: { type: String, default: 'Unknown' },
    image: String,
    albumArt: String,
    artistImage: String,
    uploadDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
}, { strict: false }); // Allow extra fields during migration

const Song = mongoose.model('Song', songSchema);

async function migrateSongDocuments() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB for migration');
        
        // Get all songs
        const songs = await Song.find({});
        console.log(`Found ${songs.length} songs to check`);
        
        let updatedCount = 0;
        
        for (const song of songs) {
            const updates = {};
            let needsUpdate = false;
            
            // Add missing genre field
            if (!song.genre) {
                updates.genre = 'Unknown';
                needsUpdate = true;
                console.log(`Adding genre to: ${song.title}`);
            }
            
            // Add missing emotion field
            if (!song.emotion) {
                updates.emotion = 'Unknown';
                needsUpdate = true;
                console.log(`Adding emotion to: ${song.title}`);
            }
            
            // Add missing uploadDate field
            if (!song.uploadDate) {
                updates.uploadDate = song.createdAt || new Date();
                needsUpdate = true;
                console.log(`Adding uploadDate to: ${song.title}`);
            }
            
            // Update the document if needed
            if (needsUpdate) {
                await Song.findByIdAndUpdate(song._id, updates);
                updatedCount++;
                console.log(`Updated: ${song.title}`);
            }
        }
        
        console.log(`\nMigration complete! Updated ${updatedCount} out of ${songs.length} songs.`);
        
        // Show final state
        const updatedSongs = await Song.find({});
        console.log('\nFinal song list:');
        updatedSongs.forEach(song => {
            console.log(`- ${song.title} by ${song.artist} | Genre: ${song.genre} | Emotion: ${song.emotion}`);
        });
        
        await mongoose.disconnect();
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

// Run the migration
migrateSongDocuments();