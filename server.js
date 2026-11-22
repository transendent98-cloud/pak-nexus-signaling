const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Ye object users ko track karega (UserID -> SocketID)
const users = {};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Jab user app kholta hai, to apna ID register karta hai
  socket.on('register', (userId) => {
    users[userId] = socket.id;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Jab koi call karta hai
  socket.on('call_user', ({ from, to, offer }) => {
    console.log(`Call from ${from} to ${to}`);
    const targetSocket = users[to];
    if (targetSocket) {
      // Target user ko call bhejein
      io.to(targetSocket).emit('incoming_call', { from, offer });
    } else {
      // Agar user online nahi hai
      socket.emit('call_failed', { message: 'User is offline.' });
    }
  });

  // Jab call receive ho jaye
  socket.on('answer_call', ({ to, answer }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit('call_answered', { answer });
    }
  });

  // Network connection (ICE candidates) exchange karne ke liye
  socket.on('ice_candidate', ({ to, candidate }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit('ice_candidate', { candidate });
    }
  });

  // Call end karne ke liye
  socket.on('end_call', ({ to }) => {
    const targetSocket = users[to];
    if (targetSocket) io.to(targetSocket).emit('call_ended');
  });

  // Jab user disconnect ho
  socket.on('disconnect', () => {
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Port setup (Render khud PORT provide karta hai)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
