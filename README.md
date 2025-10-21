# 🎵 VibeScape - Music Streaming Platform

A modern music streaming platform built with Node.js, Express, MongoDB, and vanilla JavaScript.

## 🚀 Features

- **🎶 Music Streaming**: Play, pause, skip, and control volume
- **🔐 User Authentication**: Secure signup/login with password validation
- **💬 Global Comments**: Real-time comments synced across all devices
- **🎨 Theme Support**: Dark/Light mode toggle
- **📱 Responsive Design**: Works on desktop and mobile
- **⚡ Performance Optimized**: Fast loading with DOM optimization

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: bcryptjs, JWT
- **File Upload**: Multer
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## 🌐 Live Demo

Visit the live application: [Your Render URL]

## 📦 Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/santhiya1818/vibescape.git
   cd vibescape
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3030`

## 🚀 Deployment on Render

1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Set environment variables in Render dashboard
4. Deploy!

## 📁 Project Structure

```
vibescape/
├── public/           # Frontend files
│   ├── index.html    # Login page
│   ├── home.html     # Music player
│   ├── comments.html # Comments page
│   ├── signup.html   # Registration page
│   ├── script.js     # Authentication & utilities
│   ├── home.js       # Music player functionality
│   ├── style.css     # Styles
│   ├── songs/        # Audio files
│   ├── songpic/      # Album artwork
│   └── artistpic/    # Artist images
├── server.js         # Express server
├── package.json      # Dependencies
└── README.md         # This file
```

## 🔧 API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/songs` - Get all songs
- `POST /api/upload` - Upload new songs
- `GET /api/comments` - Get all comments
- `POST /api/comments` - Add new comment
- `DELETE /api/comments/:id` - Delete comment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Santhiya** - [GitHub](https://github.com/santhiya1818)