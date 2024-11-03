import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { Server } from 'socket.io';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();

const __dirname = dirname(fileURLToPath(new URL('../', import.meta.url)));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, './client/dist')));

app.use(
  cors({
    origin: ['http://localhost:5173'],
  })
);

const server = http.createServer(app, {
  cors: {
    origin: 'http://localhost:5173',
  },
});
const io = new Server(server);
const port = process.env.PORT || 4000;

const MAX_ROOM_PARTICIPANTS = 4; // Adjust as needed
const connectedUsers = new Map(); // Store username by socket ID

io.on('connection', (socket) => {
  socket.on('join', (roomName, username) => {
    const roomClients = io.sockets.adapter.rooms.get(roomName);

    // Check room capacity
    if (roomClients && roomClients.size >= MAX_ROOM_PARTICIPANTS) {
      socket.emit('full', roomName);
      return;
    }

    connectedUsers.set(socket.id, username);

    // Join room
    socket.join(roomName);

    // First client creates the room
    if (!roomClients || roomClients.size === 1) {
      socket.emit('created', roomName);
    }
    // Subsequent clients get joined status and peer list
    else {
      socket.emit('joined', roomName);

      // Send list of existing peer IDs and usernames to the new participant
      const peerInfo = Array.from(roomClients)
        .filter((id) => id !== socket.id)
        .map((id) => ({
          id,
          username: connectedUsers.get(id),
        }));
      socket.emit('peer-list', peerInfo);

      // Notify other participants about the new peer
      socket.to(roomName).emit('peer-joined', socket.id, username);
    }

    console.log(
      `Socket ${
        socket.id
      } (${username}) joined room ${roomName}. Current participants: ${
        roomClients?.size || 1
      }`
    );
  });

  // Signaling methods for WebRTC connection establishment
  socket.on('offer', (offer, roomName, targetPeerId) => {
    if (targetPeerId) {
      // Send offer to a specific peer
      socket
        .to(targetPeerId)
        .emit('offer', offer, socket.id, connectedUsers.get(socket.id));
    } else {
      // Broadcast offer to all other peers in the room
      socket.broadcast
        .to(roomName)
        .emit('offer', offer, socket.id, connectedUsers.get(socket.id));
    }
  });

  socket.on('answer', (answer, roomName, targetPeerId) => {
    if (targetPeerId) {
      // Send answer to a specific peer
      socket.to(targetPeerId).emit('answer', answer, socket.id);
    } else {
      // Broadcast answer to all other peers in the room
      socket.broadcast.to(roomName).emit('answer', answer, socket.id);
    }
  });

  socket.on('ice-candidate', (candidate, roomName, targetPeerId) => {
    if (targetPeerId) {
      // Send ICE candidate to a specific peer
      socket.to(targetPeerId).emit('ice-candidate', candidate, socket.id);
    } else {
      // Broadcast ICE candidate to all other peers in the room
      socket.broadcast.to(roomName).emit('ice-candidate', candidate, socket.id);
    }
  });

  socket.on('leave', (roomName) => {
    // Notify other participants about the peer leaving
    socket.broadcast.to(roomName).emit('peer-left', socket.id);
    socket.leave(roomName);
  });

  socket.on('disconnect', () => {
    // Find and clean up all rooms this socket was part of
    connectedUsers.delete(socket.id);
    socket.rooms.forEach((roomName) => {
      if (roomName !== socket.id) {
        console.log(`Socket ${socket.id} left room ${roomName}`);
        socket.broadcast.to(roomName).emit('peer-left', socket.id);
      }
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, './client/dist') });
});

server.listen(port, () => {
  // console.log('Server is running on http://localhost:5000');
});
