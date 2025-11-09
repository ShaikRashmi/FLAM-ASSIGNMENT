// WebSocket server with Express
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const { RoomManager } = require('./rooms');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager();

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// WebSocket connection handling
wss.on('connection', (ws) => {
    const userId = generateUserId();
    const room = roomManager.getRoom(); // Default room
    const user = room.addUser(userId, ws);
    
    console.log(`User ${userId} connected. Total users: ${room.users.size}`);
    
    // Send initial state to new user
    ws.send(JSON.stringify({
        type: 'init',
        userId: userId,
        canvasState: room.drawingState.getState(),
        users: room.getUsers()
    }));
    
    // Notify others about new user
    room.broadcast({
        type: 'users',
        users: room.getUsers()
    }, userId);
    
    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, userId, room, data);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        room.removeUser(userId);
        console.log(`User ${userId} disconnected. Total users: ${room.users.size}`);
        
        // Notify others about user leaving
        room.broadcast({
            type: 'users',
            users: room.getUsers()
        });
        
        // Clean up empty rooms periodically
        roomManager.removeEmptyRooms();
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
    });
});

function handleMessage(ws, userId, room, data) {
    const user = room.getUser(userId);
    
    switch (data.type) {
        case 'drawing':
            // Real-time drawing updates
            room.broadcast({
                type: 'drawing',
                userId: userId,
                stroke: data.stroke,
                userName: user.name,
                color: user.color
            }, userId);
            break;
        
        case 'drawingComplete':
            // Stroke completed, add to history
            room.drawingState.addStroke(data.stroke);
            room.broadcast({
                type: 'drawingComplete',
                userId: userId,
                stroke: data.stroke
            }, userId);
            break;
        
        case 'cursor':
            // Cursor position updates
            room.broadcast({
                type: 'cursor',
                userId: userId,
                position: data.position,
                userName: user.name,
                color: user.color
            }, userId);
            break;
        
        case 'undo':
            const undoResult = room.drawingState.undo();
            if (undoResult.success) {
                room.broadcastToAll({
                    type: 'undo',
                    canvasState: undoResult.canvasState
                });
            }
            break;
        
        case 'redo':
            const redoResult = room.drawingState.redo();
            if (redoResult.success) {
                room.broadcastToAll({
                    type: 'redo',
                    canvasState: redoResult.canvasState
                });
            }
            break;
        
        case 'clear':
            room.drawingState.clear();
            room.broadcastToAll({
                type: 'clear'
            });
            break;
        
        case 'requestFullState':
            ws.send(JSON.stringify({
                type: 'fullState',
                canvasState: room.drawingState.getState()
            }));
            break;
    }
}

function generateUserId() {
    return Math.random().toString(36).substring(2, 15);
}

// API endpoint for room stats (optional)
app.get('/api/stats', (req, res) => {
    res.json({
        rooms: roomManager.getAllRoomsStats(),
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server ready`);
});
