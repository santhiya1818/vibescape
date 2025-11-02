// Comprehensive fix for all missing file references
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

async function fixAllMissingFiles() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Get all songs
        const songs = await Song.find({});
        console.log(`Found ${songs.length} songs to check`);
        
        let fixedCount = 0;
        
        for (const song of songs) {
            let needsUpdate = false;
            const updates = {};
            
            console.log(`\nChecking: ${song.title} by ${song.artist}`);
            
            // Fix missing or broken image references
            if (song.image && (song.image.includes('undefined') || song.image.includes('NaN'))) {
                updates.image = '/songpic/default.jpg';
                needsUpdate = true;
                console.log('  ✅ Fixed image path');
            }
            
            if (song.albumArt && (song.albumArt.includes('undefined') || song.albumArt.includes('NaN'))) {
                updates.albumArt = '/songpic/default.jpg';
                needsUpdate = true;
                console.log('  ✅ Fixed albumArt path');
            }
            
            if (song.artistImage && (song.artistImage.includes('undefined') || song.artistImage.includes('NaN'))) {
                updates.artistImage = '/artistpic/default.jpg';
                needsUpdate = true;
                console.log('  ✅ Fixed artistImage path');
            }
            
            // Set default values for missing image fields
            if (!song.image) {
                updates.image = '/songpic/default.jpg';
                needsUpdate = true;
                console.log('  ✅ Added default image');
            }
            
            if (!song.albumArt) {
                updates.albumArt = '/songpic/default.jpg';
                needsUpdate = true;
                console.log('  ✅ Added default albumArt');
            }
            
            if (!song.artistImage) {
                updates.artistImage = '/artistpic/default.jpg';
                needsUpdate = true;
                console.log('  ✅ Added default artistImage');
            }
            
            // Apply updates if needed
            if (needsUpdate) {
                await Song.findByIdAndUpdate(song._id, updates);
                fixedCount++;
                console.log(`  🔧 Updated ${song.title}`);
            } else {
                console.log(`  ✅ ${song.title} - No fixes needed`);
            }
        }
        
        console.log(`\n🎉 Fix completed! Updated ${fixedCount} out of ${songs.length} songs.`);
        
        // Show final summary
        console.log('\n📋 Final song list:');
        const updatedSongs = await Song.find({}).select('title artist file image albumArt artistImage');
        updatedSongs.forEach(song => {
            console.log(`- ${song.title} by ${song.artist}`);
            console.log(`  Audio: ${song.file}`);
            console.log(`  Image: ${song.image}`);
            console.log(`  Album Art: ${song.albumArt}`);
            console.log(`  Artist Image: ${song.artistImage}`);
        });
        
        await mongoose.disconnect();
        console.log('\n✅ All fixes applied successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing files:', error);
        process.exit(1);
    }
}

fixAllMissingFiles();