const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const port = 3030;

// Middleware
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
// IMPORTANT: Replace <YOUR_PASSWORD_HERE> with your actual MongoDB Atlas password
const dbURI = process.env.MONGODB_URI || "mongodb+srv://vibescapeUser:santhiya1325@cluster0.dfq4mbe.mongodb.net/vibescape?retryWrites=true&w=majority";
mongoose.connect(dbURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ Could not connect to MongoDB Atlas:', err));

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
    passwordResetToken: String,
    passwordResetExpires: Date
});
const User = mongoose.model('User', userSchema);

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
        const payload = { id: user._id, username: user.username };
        const token = jwt.sign(payload, 'your_jwt_secret', { expiresIn: '1d' });
        res.json({ message: 'Login successful! Redirecting...', token, username: user.username });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login.' });
    }
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

// --- START SERVER ---
app.listen(port, () => {
    console.log(`VibeScape server running on port ${port}!`);
});