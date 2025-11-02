const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://vibescape-jmss.onrender.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibescape';
const JWT_SECRET = process.env.JWT_SECRET || 'vibescape-fallback-secret-key';

console.log('Attempting to connect to MongoDB...');

// For development, let's add a fallback if MongoDB is not available
let mongoConnected = false;

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
        console.log('Database URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
        mongoConnected = true;
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('💡 Make sure MongoDB is running locally or update MONGODB_URI in .env file');
        console.log('   For local MongoDB: mongodb://localhost:27017/vibescape');
        console.log('   For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/vibescape');
        console.log('⚠️  Server will continue running but database features will be limited');
        mongoConnected = false;
    });

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    createdAt: { type: Date, default: Date.now }
});

// Song Schema
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    file: { type: String, required: true },
    image: String,
    createdAt: { type: Date, default: Date.now }
});

// Comment Schema
const commentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// History Schema
const historySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    songTitle: { type: String, required: true },
    artist: { type: String, required: true },
    playedAt: { type: Date, default: Date.now }
});

// Playlist Schema
const playlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    songs: [{ type: String }], // Array of song titles
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Favorite Schema
const favoriteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    songTitle: { type: String, required: true },
    artist: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Song = mongoose.model('Song', songSchema);
const Comment = mongoose.model('Comment', commentSchema);
const History = mongoose.model('History', historySchema);
const Playlist = mongoose.model('Playlist', playlistSchema);
const Favorite = mongoose.model('Favorite', favoriteSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Auto-create admin user function
async function createAdminUser() {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 12);
            const admin = new User({
                username: 'admin',
                email: 'admin@vibescape.com',
                password: hashedPassword,
                role: 'admin'
            });
            await admin.save();
            console.log('Admin user created: admin@vibescape.com / admin123');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('Registration attempt:', req.body);
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ 
                error: 'User with this email or username already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();
        console.log('User created successfully:', email);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                email: user.email,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                email: user.email,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Songs API
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find().sort({ createdAt: -1 });
        res.json(songs);
    } catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

// Upload API (Admin only)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.post('/api/upload', authenticateToken, requireAdmin, upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'albumArt', maxCount: 1 },
    { name: 'artistImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const { title, artist, genre } = req.body;
        
        if (!title || !artist) {
            return res.status(400).json({ error: 'Title and artist are required' });
        }

        // For now, we'll store file info without actual file upload
        // In production, you'd upload to cloud storage like AWS S3
        const song = new Song({
            title,
            artist,
            file: `/songs/${title.replace(/\s+/g, '_')}.mp3`, // Mock file path
            image: req.files.albumArt ? `/songpic/${title.replace(/\s+/g, '_')}.jpg` : '/songpic/default.jpg'
        });

        await song.save();
        res.status(201).json({ message: 'Song uploaded successfully', song });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload song' });
    }
});

// Delete song API (Admin only)
app.delete('/api/songs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await Song.findByIdAndDelete(id);
        res.json({ message: 'Song deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});

// Comments API
app.get('/api/comments', async (req, res) => {
    try {
        const comments = await Comment.find().sort({ timestamp: -1 });
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/api/comments', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        const comment = new Comment({
            username: req.user.username,
            text: text
        });
        await comment.save();
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

// History API
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const history = await History.find({ userId: req.user.userId })
            .sort({ playedAt: -1 });
        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const { songTitle, artist } = req.body;
        
        // Check if this song was already played recently (within last minute) to avoid duplicates
        const recentPlay = await History.findOne({
            userId: req.user.userId,
            songTitle,
            playedAt: { $gt: new Date(Date.now() - 60000) } // Within last minute
        });
        
        if (recentPlay) {
            return res.json({ message: 'Song already recorded recently' });
        }
        
        const historyEntry = new History({
            userId: req.user.userId,
            username: req.user.username,
            songTitle,
            artist
        });
        
        await historyEntry.save();
        res.status(201).json(historyEntry);
    } catch (error) {
        console.error('Error adding to history:', error);
        res.status(500).json({ error: 'Failed to add to history' });
    }
});

app.delete('/api/history', authenticateToken, async (req, res) => {
    try {
        await History.deleteMany({ userId: req.user.userId });
        res.json({ message: 'History cleared successfully' });
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// ===== PLAYLIST ENDPOINTS =====

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint hit - Playlist API');
    res.json({ 
        message: 'Playlist endpoints are available', 
        timestamp: new Date(),
        endpoints: [
            'GET /api/playlists',
            'POST /api/playlists', 
            'PUT /api/playlists/:id',
            'DELETE /api/playlists/:id'
        ]
    });
});

// Get user playlists
app.get('/api/playlists', authenticateToken, async (req, res) => {
    console.log('📋 GET /api/playlists endpoint hit');
    try {
        const playlists = await Playlist.find({ userId: req.user.userId })
            .sort({ updatedAt: -1 }); // Sort by newest first

        console.log('📋 Found playlists:', playlists.length);
        res.json(playlists);
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists.' });
    }
});

// Create new playlist
app.post('/api/playlists', authenticateToken, async (req, res) => {
    console.log('📋 POST /api/playlists endpoint hit');
    try {
        const { name, songs } = req.body;
        console.log('📋 Creating playlist:', name, 'with songs:', songs);

        if (!name) {
            return res.status(400).json({ error: 'Playlist name is required.' });
        }

        // Create new playlist
        const playlist = new Playlist({
            userId: req.user.userId,
            username: req.user.username,
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
app.put('/api/playlists/:id', authenticateToken, async (req, res) => {
    try {
        const { songs } = req.body;

        const playlist = await Playlist.findOne({ 
            _id: req.params.id, 
            userId: req.user.userId 
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
app.delete('/api/playlists/:id', authenticateToken, async (req, res) => {
    try {
        const playlist = await Playlist.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        await Playlist.deleteOne({ _id: req.params.id });
        res.json({ message: 'Playlist deleted successfully' });
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ error: 'Failed to delete playlist.' });
    }
});

// ===== FAVORITES ENDPOINTS =====

// Get user favorites
app.get('/api/favorites', authenticateToken, async (req, res) => {
    console.log('⭐ GET /api/favorites endpoint hit');
    try {
        const favorites = await Favorite.find({ userId: req.user.userId })
            .sort({ addedAt: -1 }); // Sort by newest first

        console.log('⭐ Found favorites:', favorites.length);
        res.json(favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites.' });
    }
});

// Add song to favorites
app.post('/api/favorites', authenticateToken, async (req, res) => {
    console.log('⭐ POST /api/favorites endpoint hit');
    try {
        const { songTitle, artist } = req.body;
        console.log('⭐ Adding to favorites:', songTitle, 'by', artist);

        if (!songTitle || !artist) {
            return res.status(400).json({ error: 'Song title and artist are required.' });
        }

        // Check if already in favorites
        const existingFavorite = await Favorite.findOne({
            userId: req.user.userId,
            songTitle: songTitle,
            artist: artist
        });

        if (existingFavorite) {
            return res.status(400).json({ error: 'Song is already in favorites.' });
        }

        // Add new favorite
        const favorite = new Favorite({
            userId: req.user.userId,
            username: req.user.username,
            songTitle: songTitle,
            artist: artist
        });

        await favorite.save();
        console.log('✅ Favorite saved to database:', favorite);
        res.status(201).json(favorite);
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ error: 'Failed to add to favorites.' });
    }
});

// Remove song from favorites
app.delete('/api/favorites/:id', authenticateToken, async (req, res) => {
    try {
        const favorite = await Favorite.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!favorite) {
            return res.status(404).json({ error: 'Favorite not found.' });
        }

        await Favorite.deleteOne({ _id: req.params.id });
        res.json({ message: 'Removed from favorites successfully' });
    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ error: 'Failed to remove from favorites.' });
    }
});

// Remove song from favorites by song details (alternative endpoint)
app.delete('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const { songTitle, artist } = req.body;
        
        if (!songTitle || !artist) {
            return res.status(400).json({ error: 'Song title and artist are required.' });
        }

        const result = await Favorite.deleteOne({
            userId: req.user.userId,
            songTitle: songTitle,
            artist: artist
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Favorite not found.' });
        }

        res.json({ message: 'Removed from favorites successfully' });
    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ error: 'Failed to remove from favorites.' });
    }
});

// Admin verification endpoint
app.get('/api/admin/verify', authenticateToken, requireAdmin, (req, res) => {
    res.json({ message: 'Admin access verified', user: req.user });
});

// Serve static files and handle client-side routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    // Handle client-side routing by serving the appropriate HTML files
    const requestedPath = req.path;
    let filePath;
    
    if (requestedPath.endsWith('.html') || requestedPath === '/') {
        filePath = requestedPath === '/' ? 'index.html' : requestedPath.substring(1);
    } else {
        filePath = requestedPath.substring(1) + '.html';
    }
    
    const fullPath = path.join(__dirname, filePath);
    res.sendFile(fullPath, (err) => {
        if (err) {
            res.status(404).sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

const PORT = process.env.PORT || 3000;

// Create admin user and start server
createAdminUser().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Visit: http://localhost:${PORT}`);
    });
});