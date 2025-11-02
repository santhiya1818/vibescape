// Fix Matushka song with correct field names to match database structure
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vibescapeUser:santhiya1325@cluster0.dfq4mbe.mongodb.net/vibescape?retryWrites=true&w=majority';

// Song Schema matching your actual database structure
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    file: { type: String, required: true },
    genre: { type: String, default: 'Unknown' },
    emotion: { type: String, default: 'Unknown' },
    art: String,  // Your database uses 'art', not 'image'
    artistart: String,  // Your database uses 'artistart', not 'artistImage'
    uploaddate: { type: Date, default: Date.now },  // Your database uses 'uploaddate', not 'uploadDate'
    createdAt: { type: Date, default: Date.now }
}, { strict: false });

const Song = mongoose.model('Song', songSchema);

async function fixMatushkaCorrectly() {
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
        console.log('Current fields:', {
            file: matushkaSong.file,
            art: matushkaSong.art,
            artistart: matushkaSong.artistart,
            uploaddate: matushkaSong.uploaddate
        });
        
        // Update with correct field names and correct file path
        const updates = {
            file: '/songs/Matushka.m4a',  // Correct audio file path
            art: '/songpic/default.jpg',  // Use default since specific doesn't exist
            artistart: '/artistpic/default.jpg',  // Use default since specific doesn't exist
            uploaddate: new Date()
        };
        
        await Song.findByIdAndUpdate(matushkaSong._id, updates);
        
        console.log('✅ Fixed Matushka with correct field names:');
        console.log('New fields:', updates);
        
        // Verify the fix
        const updatedSong = await Song.findById(matushkaSong._id);
        console.log('Verification - Updated fields:');
        console.log({
            file: updatedSong.file,
            art: updatedSong.art,
            artistart: updatedSong.artistart,
            uploaddate: updatedSong.uploaddate
        });
        
        await mongoose.disconnect();
        console.log('✅ Fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing Matushka:', error);
        process.exit(1);
    }
}

fixMatushkaCorrectly();