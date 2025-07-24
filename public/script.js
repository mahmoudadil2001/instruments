
// Initialize Socket.io
const socket = io();

// DOM elements
const usernameModal = document.getElementById('usernameModal');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const chatContainer = document.getElementById('chatContainer');
const currentUserSpan = document.getElementById('currentUser');
const onlineCountSpan = document.getElementById('onlineCount');
const usersList = document.getElementById('usersList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileBtn = document.getElementById('fileBtn');
const fileInput = document.getElementById('fileInput');
const voiceBtn = document.getElementById('voiceBtn');
const recordingIndicator = document.getElementById('recordingIndicator');

// Global variables
let username = '';
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingStartTime = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Focus on username input
    usernameInput.focus();
    
    // Join chat on Enter key
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinChat();
        }
    });
    
    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

// Event listeners
joinBtn.addEventListener('click', joinChat);
sendBtn.addEventListener('click', sendMessage);
fileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
voiceBtn.addEventListener('click', toggleVoiceRecording);

// Handle paste events for images
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            uploadFile(blob);
            break;
        }
    }
});

// Join chat function
function joinChat() {
    const inputUsername = usernameInput.value.trim();
    if (inputUsername.length < 2) {
        alert('Username must be at least 2 characters long');
        return;
    }
    
    username = inputUsername;
    currentUserSpan.textContent = `Welcome, ${username}!`;
    
    // Hide modal and show chat
    usernameModal.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    
    // Join the chat room
    socket.emit('user-join', username);
    
    // Focus on message input
    messageInput.focus();
}

// Send text message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;
    
    socket.emit('send-message', { message });
    messageInput.value = '';
}

// Handle file upload
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

// Upload file function
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Send file message through socket to all users
            const fileMessage = {
                message: {
                    type: 'file',
                    fileUrl: result.fileUrl,
                    filename: result.filename,
                    mimetype: result.mimetype
                }
            };
            
            // Send to all users including sender
            socket.emit('send-message', fileMessage);
        } else {
            alert('File upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('File upload failed');
    }
}

// Voice recording functions
async function toggleVoiceRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            
            // Show uploading indicator
            recordingIndicator.innerHTML = '<span>📤 جاري الإرسال...</span>';
            
            const reader = new FileReader();
            reader.onload = () => {
                socket.emit('send-voice', { voiceData: reader.result });
                // Hide indicator after sending
                setTimeout(() => {
                    recordingIndicator.classList.add('hidden');
                }, 1000);
            };
            reader.readAsDataURL(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();
        voiceBtn.textContent = '⏹️';
        recordingIndicator.classList.remove('hidden');
        
        // Start timer
        recordingTimer = setInterval(updateRecordingTimer, 100);
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        voiceBtn.textContent = '🎤';
        
        // Clear timer
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
    }
}

// Display message function
function displayMessage(data, isOwn = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.innerHTML = `<span>${data.username}</span><span>${data.timestamp}</span>`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (data.type === 'voice') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = data.voiceData;
        contentDiv.appendChild(audio);
    } else if (data.type === 'file') {
        const fileData = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
        
        if (fileData.mimetype && fileData.mimetype.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileData.fileUrl;
            img.className = 'message-image';
            img.alt = fileData.filename;
            contentDiv.appendChild(img);
        } else {
            const link = document.createElement('a');
            link.href = fileData.fileUrl;
            link.textContent = `📎 ${fileData.filename}`;
            link.target = '_blank';
            contentDiv.appendChild(link);
        }
    } else {
        contentDiv.textContent = data.message;
    }
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Display system message
function displaySystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = message;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Generate random avatar for user
function generateUserAvatar(userName) {
    const gradients = [
        'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5',
        'gradient-6', 'gradient-7', 'gradient-8', 'gradient-9', 'gradient-10'
    ];
    
    // Use username to generate consistent random avatar
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
        hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const gradientIndex = Math.abs(hash) % gradients.length;
    const firstLetter = userName.charAt(0).toUpperCase();
    
    return {
        gradient: gradients[gradientIndex],
        letter: firstLetter
    };
}

// Update recording timer
function updateRecordingTimer() {
    if (recordingStartTime && isRecording) {
        const elapsed = Date.now() - recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        recordingIndicator.innerHTML = `<span>🔴 تسجيل... ${timeString} - اضغط للتوقف</span>`;
    }
}

// Update online users list
function updateUsersList(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        
        // Create avatar
        const avatar = generateUserAvatar(user);
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `user-avatar ${avatar.gradient}`;
        avatarDiv.textContent = avatar.letter;
        
        // Create name span
        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = user;
        
        // Create status span
        const statusSpan = document.createElement('span');
        statusSpan.className = 'user-status';
        statusSpan.textContent = '●';
        
        li.appendChild(avatarDiv);
        li.appendChild(nameSpan);
        li.appendChild(statusSpan);
        
        if (user === username) {
            nameSpan.style.fontWeight = 'bold';
            nameSpan.textContent += ' (أنت)';
        }
        
        usersList.appendChild(li);
    });
    
    onlineCountSpan.textContent = `${users.length} متصل`;
}

// Socket event listeners
socket.on('user-joined', (data) => {
    displaySystemMessage(`${data.username} joined the chat`);
    updateUsersList(data.users);
});

socket.on('user-left', (data) => {
    displaySystemMessage(`${data.username} left the chat`);
    updateUsersList(data.users);
});

socket.on('online-users', (users) => {
    updateUsersList(users);
});

socket.on('new-message', (data) => {
    const isOwn = data.username === username;
    displayMessage(data, isOwn);
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    displaySystemMessage('Disconnected from server');
});
