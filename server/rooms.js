// Room management for multi-user sessions
const DrawingState = require('./drawing-state');

class Room {
    constructor(id) {
        this.id = id;
        this.users = new Map();
        this.drawingState = new DrawingState();
        this.userColors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
            '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
        ];
        this.colorIndex = 0;
    }

    addUser(userId, ws) {
        const color = this.userColors[this.colorIndex % this.userColors.length];
        this.colorIndex++;
        
        const user = {
            id: userId,
            ws: ws,
            color: color,
            name: `User ${this.users.size + 1}`
        };
        
        this.users.set(userId, user);
        return user;
    }

    removeUser(userId) {
        this.users.delete(userId);
    }

    getUser(userId) {
        return this.users.get(userId);
    }

    getUsers() {
        return Array.from(this.users.values()).map(user => ({
            id: user.id,
            name: user.name,
            color: user.color
        }));
    }

    broadcast(data, excludeUserId = null) {
        this.users.forEach((user, userId) => {
            if (userId !== excludeUserId && user.ws.readyState === 1) { // 1 = OPEN
                try {
                    user.ws.send(JSON.stringify(data));
                } catch (error) {
                    console.error(`Error broadcasting to user ${userId}:`, error);
                }
            }
        });
    }

    broadcastToAll(data) {
        this.broadcast(data, null);
    }

    isEmpty() {
        return this.users.size === 0;
    }

    getStats() {
        return {
            id: this.id,
            users: this.users.size,
            ...this.drawingState.getStats()
        };
    }
}

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.defaultRoomId = 'default';
    }

    getRoom(roomId = this.defaultRoomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Room(roomId));
        }
        return this.rooms.get(roomId);
    }

    removeEmptyRooms() {
        for (const [roomId, room] of this.rooms) {
            if (room.isEmpty() && roomId !== this.defaultRoomId) {
                this.rooms.delete(roomId);
                console.log(`Removed empty room: ${roomId}`);
            }
        }
    }

    getAllRoomsStats() {
        const stats = [];
        this.rooms.forEach((room, roomId) => {
            stats.push(room.getStats());
        });
        return stats;
    }
}

module.exports = { Room, RoomManager };
