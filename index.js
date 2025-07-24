
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Store online users
const onlineUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('user-join', (username) => {
    onlineUsers.set(socket.id, username);
    socket.username = username;
    
    // Notify all users about new user
    io.emit('user-joined', {
      username: username,
      users: Array.from(onlineUsers.values())
    });

    // Send current online users to the new user
    socket.emit('online-users', Array.from(onlineUsers.values()));
  });

  // Handle text messages
  socket.on('send-message', (data) => {
    let messageData;
    
    if (data.message && typeof data.message === 'object' && data.message.type === 'file') {
      // Handle file messages
      messageData = {
        id: Date.now(),
        username: socket.username,
        message: data.message,
        type: 'file',
        timestamp: new Date().toLocaleTimeString()
      };
    } else {
      // Handle text messages
      messageData = {
        id: Date.now(),
        username: socket.username,
        message: data.message,
        type: 'text',
        timestamp: new Date().toLocaleTimeString()
      };
    }
    
    io.emit('new-message', messageData);
  });

  // Handle voice messages
  socket.on('send-voice', (data) => {
    const messageData = {
      id: Date.now(),
      username: socket.username,
      voiceData: data.voiceData,
      type: 'voice',
      timestamp: new Date().toLocaleTimeString()
    };
    io.emit('new-message', messageData);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      onlineUsers.delete(socket.id);
      io.emit('user-left', {
        username: socket.username,
        users: Array.from(onlineUsers.values())
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ 
    success: true, 
    fileUrl: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on port ${PORT}`);
});
