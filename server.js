const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3030;

// JWT Secret key
const JWT_SECRET = process.env.JWT_SECRET || 'vibescape-default-secret-key';

// Middleware
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
// IMPORTANT: Replace <YOUR_PASSWORD_HERE> with your actual MongoDB Atlas password
const dbURI = process.env.MONGODB_URI || "mongodb+srv://vibescapeUser:santhiya1325@cluster0.dfq4mbe.mongodb.net/vibescape?retryWrites=true&w=majority";
mongoose.connect(dbURI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        // Create default admin user if none exists
        createDefaultAdmin();
    })
    .catch(err => console.error('❌ Could not connect to MongoDB Atlas:', err));

// Function to create default admin user
async function createDefaultAdmin() {
    try {
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            const adminUser = new User({
                username: 'admin',
                email: 'admin@vibescape.com',
                password: hashedPassword,
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('🔑 Default admin user created successfully!');
            console.log('📧 Admin Email: admin@vibescape.com');
            console.log('🔒 Admin Password: admin123');
            console.log('⚠️  Please change the password after first login!');
        } else {
            console.log('ℹ️  Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error creating default admin:', error);
    }
}

// Mongoose Schemas
const songSchema = new mongoose.Schema({
    title: String, artist: String, genre: String, emotion: String,
    file: String, art: String, artistArt: String,
    uploadDate: { type: Date, default: Date.now }
});
const Song = mongoose.model('Song', songSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    passwordResetToken: String,
    passwordResetExpires: Date
});
const User = mongoose.model('User', userSchema);

// Comment Schema
const commentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// History Schema for individual user listening history
const historySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    songTitle: { type: String, required: true },
    artist: { type: String, required: true },
    playedAt: { type: Date, default: Date.now }
});
const History = mongoose.model('History', historySchema);

// Favorites Schema for user favorite songs
const favoriteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    songTitle: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});
const Favorite = mongoose.model('Favorite', favoriteSchema);

// Playlist Schema for user playlists
const playlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    songs: [{ type: String }], // Array of song titles
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Playlist = mongoose.model('Playlist', playlistSchema);

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(__dirname, 'public');
        if (file.fieldname === 'song') uploadPath = path.join(uploadPath, 'songs');
        else if (file.fieldname === 'albumArt') uploadPath = path.join(uploadPath, 'songpic');
        else if (file.fieldname === 'artistImage') uploadPath = path.join(uploadPath, 'artistpic');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- API ENDPOINTS ---

// Song Endpoints
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find({});
        res.json(songs);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching songs.' });
    }
});

app.post('/api/upload', upload.fields([
    { name: 'song', maxCount: 1 }, { name: 'albumArt', maxCount: 1 }, { name: 'artistImage', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files || !req.files.song) {
            return res.status(400).json({ error: 'Audio file is required.' });
        }
        const newSong = new Song({
            title: req.body.title, artist: req.body.artist, genre: req.body.genre, emotion: req.body.emotion,
            file: `songs/${req.files.song[0].filename}`,
            art: req.files.albumArt ? `songpic/${req.files.albumArt[0].filename}` : 'songpic/default.png',
            artistArt: req.files.artistImage ? `artistpic/${req.files.artistImage[0].filename}` : 'artistpic/default.png'
        });
        await newSong.save();
        res.status(201).json({ message: 'Song uploaded successfully!', song: newSong });
    } catch (error) {
        res.status(500).json({ error: 'Server error during upload.' });
    }
});

app.delete('/api/songs/:id', async (req, res) => {
    try {
        const songToDelete = await Song.findById(req.params.id);
        if (!songToDelete) return res.status(404).json({ error: 'Song not found.' });
        [songToDelete.file, songToDelete.art, songToDelete.artistArt].forEach(filePath => {
            if (filePath && !filePath.includes('default.png')) {
                const fullPath = path.join(__dirname, 'public', filePath);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            }
        });
        await Song.findByIdAndDelete(req.params.id);
        res.json({ message: 'Song deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error during deletion.' });
    }
});

// User Authentication Endpoints
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User with that email or username already exists.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Registration successful! You can now log in.' });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }
        const payload = { id: user._id, username: user.username, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
        res.json({ 
            message: 'Login successful! Redirecting...', 
            token, 
            username: user.username,
            role: user.role 
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Create admin user (one-time setup) - Remove this in production
app.post('/api/create-admin', async (req, res) => {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin user already exists.' });
        }

        const { username, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const adminUser = new User({
            username,
            email,
            password: hashedPassword,
            role: 'admin'
        });
        
        await adminUser.save();
        res.json({ message: 'Admin user created successfully!' });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: 'Server error creating admin.' });
    }
});

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

// Admin route to check admin status
app.get('/api/admin/verify', verifyAdmin, (req, res) => {
    res.json({ message: 'Admin access verified', user: req.user.username });
});

app.post('/api/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(200).json({ message: 'If an account with that email exists, a reset link has been generated.' });
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // THIS IS THE CORRECTED LINE
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();
        const resetURL = `http://localhost:${port}/reset-password.html?token=${resetToken}`;
        res.json({ message: 'Reset link generated.', resetLink: resetURL });
    } catch (error) {
        console.error('Forgot Password Error:', error); // Added for better debugging
        res.status(500).json({ error: 'Server error.' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ error: 'Token is invalid or has expired.' });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.json({ message: 'Password has been successfully reset.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// --- COMMENT API ENDPOINTS ---

// Get all comments
app.get('/api/comments', async (req, res) => {
    try {
        const comments = await Comment.find().sort({ date: -1 }); // Sort by newest first
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments.' });
    }
});

// Create a new comment
app.post('/api/comments', async (req, res) => {
    try {
        const { username, text } = req.body;
        
        if (!username || !text) {
            return res.status(400).json({ error: 'Username and text are required.' });
        }

        const newComment = new Comment({
            username: username.trim(),
            text: text.trim()
        });

        await newComment.save();
        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment.' });
    }
});

// Delete a comment
app.delete('/api/comments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedComment = await Comment.findByIdAndDelete(id);
        
        if (!deletedComment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }

        res.json({ message: 'Comment deleted successfully.' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment.' });
    }
});

// --- HISTORY API ENDPOINTS ---

// Get user's listening history
app.get('/api/history', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const history = await History.find({ userId: decoded.id })
            .sort({ playedAt: -1 }) // Sort by newest first
            .limit(50); // Limit to last 50 songs

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

// Add song to user's history
app.post('/api/history', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { songTitle, artist } = req.body;

        if (!songTitle || !artist) {
            return res.status(400).json({ error: 'Song title and artist are required.' });
        }

        // Check if this exact song was played recently (within last 30 seconds) to avoid duplicates
        const recentPlay = await History.findOne({
            userId: decoded.id,
            songTitle,
            artist,
            playedAt: { $gte: new Date(Date.now() - 30000) } // Last 30 seconds
        });

        if (recentPlay) {
            return res.json({ message: 'Song already in recent history.' });
        }

        const historyEntry = new History({
            userId: decoded.id,
            username: decoded.username,
            songTitle,
            artist
        });

        await historyEntry.save();
        res.status(201).json(historyEntry);
    } catch (error) {
        console.error('Error adding to history:', error);
        res.status(500).json({ error: 'Failed to add to history.' });
    }
});

// Clear user's history
app.delete('/api/history', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        await History.deleteMany({ userId: decoded.id });

        res.json({ message: 'History cleared successfully.' });
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ error: 'Failed to clear history.' });
    }
});

// Delete individual history item
app.delete('/api/history/delete', async (req, res) => {
    console.log('🔥 DELETE /api/history/delete endpoint called');
    console.log('Request body:', req.body);
    console.log('Authorization header:', req.header('Authorization'));
    
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token decoded for user ID:', decoded.id);
        
        const { title, playedAt } = req.body;

        if (!title || !playedAt) {
            return res.status(400).json({ error: 'Title and playedAt are required.' });
        }

        // Delete the specific history item
        const deletedItem = await History.findOneAndDelete({
            userId: decoded.id,
            songTitle: title,
            playedAt: new Date(playedAt)
        });

        if (!deletedItem) {
            return res.status(404).json({ error: 'History item not found.' });
        }

        res.json({ message: 'History item deleted successfully.' });
    } catch (error) {
        console.error('Error deleting history item:', error);
        res.status(500).json({ error: 'Failed to delete history item.' });
    }
});

// Test endpoint to verify deployment
app.get('/api/test-delete', (req, res) => {
    res.json({ message: 'Delete endpoint is deployed!', timestamp: new Date().toISOString() });
});

// ===== FAVORITES ENDPOINTS =====

// Add song to favorites
app.post('/api/favorites', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { songTitle } = req.body;

        if (!songTitle) {
            return res.status(400).json({ error: 'Song title is required.' });
        }

        // Check if already in favorites
        const existingFavorite = await Favorite.findOne({
            userId: decoded.id,
            songTitle: songTitle
        });

        if (existingFavorite) {
            return res.status(400).json({ error: 'Song already in favorites.' });
        }

        // Get user info
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Add to favorites
        const favorite = new Favorite({
            userId: decoded.id,
            username: user.username,
            songTitle: songTitle
        });

        await favorite.save();
        res.json({ message: 'Added to favorites successfully.' });
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ error: 'Failed to add to favorites.' });
    }
});

// Remove song from favorites
app.delete('/api/favorites/remove', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { songTitle } = req.body;

        if (!songTitle) {
            return res.status(400).json({ error: 'Song title is required.' });
        }

        // Remove from favorites
        const deletedFavorite = await Favorite.findOneAndDelete({
            userId: decoded.id,
            songTitle: songTitle
        });

        if (!deletedFavorite) {
            return res.status(404).json({ error: 'Song not found in favorites.' });
        }

        res.json({ message: 'Removed from favorites successfully.' });
    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ error: 'Failed to remove from favorites.' });
    }
});

// Get user favorites
app.get('/api/favorites', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const favorites = await Favorite.find({ userId: decoded.id }).sort({ addedAt: -1 });

        res.json(favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites.' });
    }
});

// ===== PLAYLIST ENDPOINTS =====

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint hit - Nov 2, 2025 02:12 PM');
    res.json({ 
        message: 'Playlist endpoints are available', 
        timestamp: new Date(),
        playlistEndpoints: [
            'GET /api/playlists',
            'POST /api/playlists', 
            'PUT /api/playlists/:id',
            'DELETE /api/playlists/:id'
        ]
    });
});

// Get user playlists
app.get('/api/playlists', async (req, res) => {
    console.log('📋 GET /api/playlists endpoint hit');
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('🔑 Token received:', token ? 'Yes' : 'No');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const playlists = await Playlist.find({ userId: decoded.id })
            .sort({ updatedAt: -1 }); // Sort by newest first

        console.log('📋 Found playlists:', playlists.length);
        res.json(playlists);
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists.' });
    }
});

// Create new playlist
app.post('/api/playlists', async (req, res) => {
    console.log('📋 POST /api/playlists endpoint hit');
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('🔑 Token received:', token ? 'Yes' : 'No');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { name, songs } = req.body;
        console.log('📋 Creating playlist:', name, 'with songs:', songs);

        if (!name) {
            return res.status(400).json({ error: 'Playlist name is required.' });
        }

        // Create new playlist (like history does)
        const playlist = new Playlist({
            userId: decoded.id,
            username: decoded.username,
            name: name,
            songs: songs || [] // Use provided songs or empty array
        });

        await playlist.save();
        console.log('✅ Playlist saved to database:', playlist);
        res.status(201).json(playlist);
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ error: 'Failed to create playlist.' });
    }
});

// Update playlist (add/remove songs)
app.put('/api/playlists/:id', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { songs } = req.body;

        const playlist = await Playlist.findOne({ 
            _id: req.params.id, 
            userId: decoded.id 
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        playlist.songs = songs;
        playlist.updatedAt = new Date();
        await playlist.save();

        res.json(playlist);
    } catch (error) {
        console.error('Error updating playlist:', error);
        res.status(500).json({ error: 'Failed to update playlist.' });
    }
});

// Delete playlist
app.delete('/api/playlists/:id', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const deletedPlaylist = await Playlist.findOneAndDelete({
            _id: req.params.id,
            userId: decoded.id
        });

        if (!deletedPlaylist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        res.json({ message: 'Playlist deleted successfully.' });
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ error: 'Failed to delete playlist.' });
    }
});

// --- START SERVER ---
app.listen(port, () => {
    console.log(`VibeScape server running on port ${port}!`);
});
