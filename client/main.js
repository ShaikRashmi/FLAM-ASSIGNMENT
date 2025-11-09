// Main application initialization
(function() {
    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    // Initialize managers
    window.canvasManager = new CanvasManager('canvas');
    window.cursorManager = new CursorManager('cursors');
    window.wsManager = new WebSocketManager(wsUrl);
    
    // Setup UI event listeners
    setupToolbar();
    
    function setupToolbar() {
        // Tool selection
        const brushBtn = document.getElementById('brush-tool');
        const eraserBtn = document.getElementById('eraser-tool');
        
        brushBtn.addEventListener('click', () => {
            setActiveTool('brush');
            window.canvasManager.setTool('brush');
        });
        
        eraserBtn.addEventListener('click', () => {
            setActiveTool('eraser');
            window.canvasManager.setTool('eraser');
        });
        
        function setActiveTool(tool) {
            brushBtn.classList.toggle('active', tool === 'brush');
            eraserBtn.classList.toggle('active', tool === 'eraser');
        }
        
        // Color picker
        const colorPicker = document.getElementById('color-picker');
        colorPicker.addEventListener('change', (e) => {
            window.canvasManager.setColor(e.target.value);
        });
        
        // Stroke width
        const strokeWidth = document.getElementById('stroke-width');
        const widthValue = document.getElementById('width-value');
        
        strokeWidth.addEventListener('input', (e) => {
            const width = parseInt(e.target.value);
            window.canvasManager.setStrokeWidth(width);
            widthValue.textContent = width;
        });
        
        // Undo/Redo
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        undoBtn.addEventListener('click', () => {
            window.wsManager.sendUndo();
        });
        
        redoBtn.addEventListener('click', () => {
            window.wsManager.sendRedo();
        });
        
        // Clear canvas
        const clearBtn = document.getElementById('clear-btn');
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear canvas for all users?')) {
                window.wsManager.sendClear();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                window.wsManager.sendUndo();
            }
            
            // Ctrl/Cmd + Shift + Z for redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                window.wsManager.sendRedo();
            }
            
            // B for brush
            if (e.key === 'b') {
                brushBtn.click();
            }
            
            // E for eraser
            if (e.key === 'e') {
                eraserBtn.click();
            }
        });
    }
    
    // Prevent context menu on canvas
    document.getElementById('canvas').addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    console.log('Collaborative Canvas initialized');
})();
