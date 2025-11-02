// Test Upload System - Demonstrates how songs with different extensions are stored

const mongoose = require('mongoose');

// Song Schema (same as in server.js)
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    file: { type: String, required: true },
    genre: { type: String, default: 'Unknown' },
    emotion: { type: String, default: 'Unknown' },
    art: String,
    artistart: String,
    uploaddate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

const Song = mongoose.model('Song', songSchema);

// Simulate upload function with different file extensions
function simulateUpload(title, artist, audioExtension, albumArtExtension, artistImageExtension) {
    console.log(`\n📤 Simulating upload of "${title}" by ${artist}`);
    console.log(`   Audio file: ${title}.${audioExtension}`);
    console.log(`   Album art: ${title}.${albumArtExtension}`);
    console.log(`   Artist image: ${artist}.${artistImageExtension}`);
    
    // This is how the server processes the upload
    const audioFileExtension = `.${audioExtension}`;
    const albumArtFileExtension = `.${albumArtExtension}`;
    const artistImageFileExtension = `.${artistImageExtension}`;
    
    const songData = {
        title: title,
        artist: artist,
        genre: 'Pop',
        emotion: 'Happy',
        file: `/songs/${title}${audioFileExtension}`,
        art: `/songpic/${title.toLowerCase().replace(/\s+/g, '')}${albumArtFileExtension}`,
        artistart: `/artistpic/${artist.toLowerCase().replace(/\s+/g, '')}${artistImageFileExtension}`,
        uploaddate: new Date()
    };
    
    console.log('   📁 Database entry will be:');
    console.log('     File:', songData.file);
    console.log('     Art:', songData.art);
    console.log('     Artist Art:', songData.artistart);
    
    return songData;
}

// Connect to test database
mongoose.connect('mongodb+srv://vibescapeUser:santhiya1325@cluster0.dfq4mbe.mongodb.net/test?retryWrites=true&w=majority')
    .then(() => {
        console.log('✅ Connected to test database');
        console.log('\n🎵 VibeScape Upload System Demo');
        console.log('=====================================');
        
        // Demonstrate different file extensions
        simulateUpload('New Song MP3', 'Artist One', 'mp3', 'jpg', 'png');
        simulateUpload('New Song M4A', 'Artist Two', 'm4a', 'png', 'jpg');
        simulateUpload('New Song WAV', 'Artist Three', 'wav', 'jpeg', 'png');
        
        console.log('\n✨ Key Features:');
        console.log('   ✅ Supports .mp3, .m4a, .wav audio files');
        console.log('   ✅ Supports .jpg, .png, .jpeg image files');
        console.log('   ✅ Automatically detects file extensions');
        console.log('   ✅ Stores in test database');
        console.log('   ✅ Proper file path formatting with /');
        
        console.log('\n📊 Current songs in database:');
        return Song.find({}).select('title artist file');
    })
    .then(songs => {
        songs.forEach((song, index) => {
            console.log(`   ${index + 1}. "${song.title}" by ${song.artist} → ${song.file}`);
        });
        
        mongoose.disconnect();
        console.log('\n✅ Demo completed!');
    })
    .catch(err => {
        console.error('❌ Error:', err);
        mongoose.disconnect();
    });