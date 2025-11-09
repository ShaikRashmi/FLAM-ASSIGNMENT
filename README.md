# Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can draw simultaneously on the same canvas with live synchronization.

# Live Demo

https://flam-assignment-tx5o.onrender.com/

# Demo Video

https://drive.google.com/file/d/1J_kH308xSSsga2oMnxjNE9pbQptJ5ZdF/view?usp=sharing

## Features

- **Real-time Drawing**: See other users' strokes as they draw
- **Drawing Tools**: Brush and eraser with customizable colors and stroke widths
- **Live Cursors**: Track where other users are drawing
- **Global Undo/Redo**: Undo and redo operations work across all users
- **User Management**: See who's online with unique color assignments
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Backend**: Node.js, Express, WebSocket (ws)
- **No frameworks**: Pure DOM and Canvas API implementation

## Installation

```bash
# Clone or download the project
cd collaborative-canvas

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

## Testing with Multiple Users

1. Open `http://localhost:3000` in your browser
2. Open the same URL in another browser window or incognito tab
3. Start drawing in one window - you'll see it appear in the other in real-time
4. Test undo/redo, color changes, and tool switching across windows

## Usage

### Drawing
- Click and drag on the canvas to draw
- Use the brush tool (default) or switch to eraser
- Change colors and stroke width using the toolbar controls

### Keyboard Shortcuts
- `B` - Switch to brush tool
- `E` - Switch to eraser tool
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo

### Tools
- **Brush**: Draw with selected color
- **Eraser**: Remove existing strokes
- **Color Picker**: Choose drawing color
- **Stroke Width**: Adjust line thickness (1-20px)
- **Clear**: Remove all drawings (requires confirmation)

## Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML structure
│   ├── style.css           # Styling
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client
│   └── main.js             # App initialization
├── server/
│   ├── server.js           # Express + WebSocket server
│   ├── rooms.js            # Room management
│   └── drawing-state.js    # Canvas state management
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## API Endpoints

- `GET /` - Serve the application
- `GET /api/stats` - Get server statistics (users, strokes, etc.)
- `GET /api/health` - Health check endpoint
- `WebSocket /` - Real-time communication

## Known Limitations

1. **Canvas State Persistence**: Drawings are stored in memory and cleared on server restart
2. **History Limit**: Undo/redo history limited to 100 operations to prevent memory issues
3. **Single Room**: All users share the same canvas (no room isolation)
4. **Scalability**: Current implementation suitable for small groups (5-10 users)

## Performance Considerations

- Cursor positions are throttled to 50ms intervals
- Canvas redraws are optimized to avoid unnecessary operations
- WebSocket messages are batched where possible
- Stroke history is limited to prevent memory leaks

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern mobile browsers

## Time Spent

Approximately 4-5 hours:
- Planning and architecture: 30 minutes
- Frontend implementation: 2 hours
- Backend implementation: 1.5 hours
- Testing and refinement: 1 hour

## Future Enhancements

- [ ] Canvas persistence (database storage)
- [ ] Multiple isolated rooms
- [ ] Shape drawing tools (rectangle, circle, line)
- [ ] Export canvas as image
- [ ] Zoom and pan functionality
- [ ] User authentication
- [ ] Text tool
- [ ] Layer management

## License

MIT
