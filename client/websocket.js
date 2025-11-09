// WebSocket client manager
class WebSocketManager {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.lastCursorSend = 0;
        this.cursorThrottle = 50; // Send cursor updates every 50ms max
        
        this.connect();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);
            this.attachListeners();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleReconnect();
        }
    }

    attachListeners() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus(false);
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleMessage(data) {
        switch (data.type) {
            case 'init':
                this.userId = data.userId;
                this.handleInit(data);
                break;
            
            case 'drawing':
                this.handleDrawing(data);
                break;
            
            case 'drawingComplete':
                this.handleDrawingComplete(data);
                break;
            
            case 'cursor':
                this.handleCursor(data);
                break;
            
            case 'users':
                this.handleUsers(data);
                break;
            
            case 'undo':
                this.handleUndo(data);
                break;
            
            case 'redo':
                this.handleRedo(data);
                break;
            
            case 'clear':
                this.handleClear();
                break;
            
            case 'fullState':
                this.handleFullState(data);
                break;
        }
    }

    handleInit(data) {
        // Initialize with existing canvas state
        if (data.canvasState && window.canvasManager) {
            window.canvasManager.redrawFromState(data.canvasState);
        }
        
        // Update users list
        if (data.users) {
            this.handleUsers({ users: data.users });
        }
    }

    handleDrawing(data) {
        // Don't draw our own strokes
        if (data.userId === this.userId) return;
        
        if (window.canvasManager && data.stroke) {
            window.canvasManager.drawStroke(data.stroke);
        }
    }

    handleDrawingComplete(data) {
        // Stroke already drawn in real-time
        // This is for final confirmation
    }

    handleCursor(data) {
        if (data.userId === this.userId) return;
        
        if (window.cursorManager) {
            window.cursorManager.updateCursor(
                data.userId,
                data.position,
                data.userName,
                data.color
            );
        }
    }

    handleUsers(data) {
        const usersList = document.getElementById('users-list');
        const userCount = document.getElementById('user-count');
        
        if (usersList && data.users) {
            usersList.innerHTML = '';
            
            data.users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                
                const colorDot = document.createElement('div');
                colorDot.className = 'user-color';
                colorDot.style.backgroundColor = user.color;
                
                const userName = document.createElement('span');
                userName.className = 'user-name';
                userName.textContent = user.name + (user.id === this.userId ? ' (You)' : '');
                
                userItem.appendChild(colorDot);
                userItem.appendChild(userName);
                usersList.appendChild(userItem);
            });
            
            if (userCount) {
                userCount.textContent = `Users: ${data.users.length}`;
            }
        }
    }

    handleUndo(data) {
        if (window.canvasManager && data.canvasState) {
            window.canvasManager.redrawFromState(data.canvasState);
        }
    }

    handleRedo(data) {
        if (window.canvasManager && data.canvasState) {
            window.canvasManager.redrawFromState(data.canvasState);
        }
    }

    handleClear() {
        if (window.canvasManager) {
            window.canvasManager.clear();
        }
    }

    handleFullState(data) {
        if (window.canvasManager && data.canvasState) {
            window.canvasManager.redrawFromState(data.canvasState);
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    sendDrawing(stroke) {
        this.send({
            type: 'drawing',
            stroke: stroke
        });
    }

    sendDrawingComplete(stroke) {
        this.send({
            type: 'drawingComplete',
            stroke: stroke
        });
    }

    sendCursorPosition(position) {
        // Throttle cursor updates
        const now = Date.now();
        if (now - this.lastCursorSend < this.cursorThrottle) return;
        
        this.lastCursorSend = now;
        this.send({
            type: 'cursor',
            position: position
        });
    }

    sendUndo() {
        this.send({ type: 'undo' });
    }

    sendRedo() {
        this.send({ type: 'redo' });
    }

    sendClear() {
        this.send({ type: 'clear' });
    }

    requestFullState() {
        this.send({ type: 'requestFullState' });
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connection-status');
        if (status) {
            status.textContent = connected ? 'Connected' : 'Disconnected';
            status.className = connected ? 'connected' : 'disconnected';
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.updateConnectionStatus(false);
        }
    }
}
