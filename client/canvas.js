// Canvas drawing logic
class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.strokeWidth = 3;
        this.lastX = 0;
        this.lastY = 0;
        
        // Store current stroke for batching
        this.currentStroke = null;
        
        this.setupCanvas();
        this.attachEventListeners();
    }

    setupCanvas() {
        // Set canvas size to match container
        const resize = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            
            // Redraw canvas content if needed
            if (window.wsManager) {
                window.wsManager.requestFullState();
            }
        };
        
        resize();
        window.addEventListener('resize', resize);
        
        // Set default canvas properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    attachEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
        
        // Cursor tracking
        this.canvas.addEventListener('mousemove', this.trackCursor.bind(this));
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getCanvasCoordinates(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        // Initialize new stroke
        this.currentStroke = {
            tool: this.currentTool,
            color: this.currentTool === 'eraser' ? '#ffffff' : this.currentColor,
            width: this.currentTool === 'eraser' ? this.strokeWidth * 2 : this.strokeWidth,
            points: [{ x: pos.x, y: pos.y }]
        };
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getCanvasCoordinates(e);
        
        // Add point to current stroke
        this.currentStroke.points.push({ x: pos.x, y: pos.y });
        
        // Draw locally
        this.drawLine(this.lastX, this.lastY, pos.x, pos.y, {
            color: this.currentStroke.color,
            width: this.currentStroke.width
        });
        
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        // Send update via WebSocket (throttled)
        if (window.wsManager) {
            window.wsManager.sendDrawing(this.currentStroke);
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // Send final stroke
        if (this.currentStroke && window.wsManager) {
            window.wsManager.sendDrawingComplete(this.currentStroke);
        }
        
        this.currentStroke = null;
    }

    drawLine(x1, y1, x2, y2, style) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = style.color;
        this.ctx.lineWidth = style.width;
        this.ctx.stroke();
    }

    drawStroke(stroke) {
        if (!stroke || !stroke.points || stroke.points.length === 0) return;
        
        const points = stroke.points;
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.width;
        this.ctx.stroke();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    setColor(color) {
        this.currentColor = color;
    }

    setStrokeWidth(width) {
        this.strokeWidth = width;
    }

    trackCursor(e) {
        const pos = this.getCanvasCoordinates(e);
        if (window.wsManager) {
            window.wsManager.sendCursorPosition(pos);
        }
    }

    // Redraw entire canvas from state
    redrawFromState(strokes) {
        this.clear();
        strokes.forEach(stroke => this.drawStroke(stroke));
    }
}

// Remote cursor management
class CursorManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cursors = new Map();
    }

    updateCursor(userId, position, userName, color) {
        let cursor = this.cursors.get(userId);
        
        if (!cursor) {
            cursor = this.createCursor(userId, userName, color);
            this.cursors.set(userId, cursor);
        }
        
        cursor.element.style.left = position.x + 'px';
        cursor.element.style.top = position.y + 'px';
        cursor.lastUpdate = Date.now();
    }

    createCursor(userId, userName, color) {
        const element = document.createElement('div');
        element.className = 'remote-cursor';
        element.style.backgroundColor = color;
        
        const label = document.createElement('div');
        label.className = 'cursor-label';
        label.textContent = userName;
        element.appendChild(label);
        
        this.container.appendChild(element);
        
        return { element, lastUpdate: Date.now() };
    }

    removeCursor(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.element.remove();
            this.cursors.delete(userId);
        }
    }

    clearOldCursors() {
        const now = Date.now();
        const timeout = 2000; // 2 seconds
        
        for (const [userId, cursor] of this.cursors) {
            if (now - cursor.lastUpdate > timeout) {
                this.removeCursor(userId);
            }
        }
    }
}

// Initialize cursor cleanup interval
setInterval(() => {
    if (window.cursorManager) {
        window.cursorManager.clearOldCursors();
    }
}, 1000);
