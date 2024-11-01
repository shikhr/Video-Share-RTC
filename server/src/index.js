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

io.on('connection', (socket) => {
  // console.log(`User Connected :${socket.id}`);

  socket.on('join', (roomName) => {
    const { rooms } = io.sockets.adapter;

    const room = rooms.get(roomName);

    if (room == undefined) {
      socket.join(roomName);
      socket.emit('created', roomName);
    } else if (room.size == 1) {
      socket.join(roomName);
      socket.emit('joined', roomName);
    } else {
      socket.emit('full', roomName);
    }
    // console.log('rooms', rooms);
  });

  socket.on('ready', (roomName) => {
    // console.log('ready');
    socket.broadcast.to(roomName).emit('ready');
  });

  socket.on('offer', (offer, roomName) => {
    // console.log('offer');
    socket.broadcast.to(roomName).emit('offer', offer);
  });

  socket.on('answer', (answer, roomName) => {
    socket.broadcast.to(roomName).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate, roomName) => {
    // console.log('candidate', candidate);
    socket.broadcast.to(roomName).emit('ice-candidate', candidate);
  });

  socket.on('leave', (roomName) => {
    socket.broadcast.to(roomName).emit('leave');
    socket.leave(roomName);
  });

  socket.on('disconnect', (socket) => {
    // console.log('Disconnected');
  });
});

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, './client/dist') });
});

server.listen(port, () => {
  // console.log('Server is running on http://localhost:5000');
});
