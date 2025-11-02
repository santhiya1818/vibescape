// Fix Matushka song file path
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vibescapeUser:santhiya1325@cluster0.dfq4mbe.mongodb.net/vibescape?retryWrites=true&w=majority';

// Song Schema
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
}, { strict: false });

const Song = mongoose.model('Song', songSchema);

async function fixMatushkaFilePath() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Find the Matushka song
        const matushkaSong = await Song.findOne({ title: 'Matushka' });
        
        if (!matushkaSong) {
            console.log('Matushka song not found in database');
            return;
        }
        
        console.log('Found Matushka song:');
        console.log(`Current file path: ${matushkaSong.file}`);
        
        // Update the file path to the correct one
        await Song.findByIdAndUpdate(matushkaSong._id, {
            file: '/songs/Matushka.m4a',  // Correct path
            image: '/songpic/Matushka.jpg',
            albumArt: '/songpic/Matushka.jpg',
            artistImage: '/artistpic/Tatiana_Kurtukova.jpg'
        });
        
        console.log('✅ Fixed Matushka file path to: /songs/Matushka.m4a');
        
        // Verify the fix
        const updatedSong = await Song.findById(matushkaSong._id);
        console.log('Updated file path:', updatedSong.file);
        
        await mongoose.disconnect();
        console.log('Fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing file path:', error);
        process.exit(1);
    }
}

fixMatushkaFilePath();