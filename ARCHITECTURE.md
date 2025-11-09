# Architecture Documentation

## System Overview

The collaborative canvas uses a client-server architecture with WebSocket connections for real-time bidirectional communication.

## Data Flow Diagram

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client A  │◄──────────────────────────►│             │
│  (Browser)  │                             │   Server    │
└─────────────┘                             │  (Node.js)  │
                                            │             │
┌─────────────┐         WebSocket          │   + Room    │
│   Client B  │◄──────────────────────────►│  Manager    │
│  (Browser)  │                             │             │
└─────────────┘                             │  + Drawing  │
                                            │   State     │
┌─────────────┐         WebSocket          │             │
│   Client C  │◄──────────────────────────►│             │
│  (Browser)  │                             │             │
└─────────────┘                             └─────────────┘

Drawing Event Flow:
1. User draws on Client A
2. Canvas captures mouse events → creates stroke data
3. WebSocket sends stroke to server
4. Server broadcasts to Clients B & C
5. Clients B & C draw the stroke on their canvas
```

## Component Architecture

### Client Side

#### 1. CanvasManager (`canvas.js`)
**Responsibilities:**
- Handle mouse/touch events for drawing
- Manage canvas rendering
- Convert events to stroke data
- Local drawing operations

**Key Methods:**
```javascript
startDrawing(e)  // Initialize stroke on mousedown
draw(e)          // Add points during mousemove
stopDrawing()    // Finalize stroke on mouseup
drawStroke(stroke) // Render stroke from data
```

**Data Structure - Stroke:**
```javascript
{
  tool: 'brush' | 'eraser',
  color: '#000000',
  width: 3,
  points: [{x, y}, {x, y}, ...]
}
```

#### 2. WebSocketManager (`websocket.js`)
**Responsibilities:**
- Maintain WebSocket connection
- Handle reconnection logic
- Send/receive messages
- Route messages to handlers

**Message Types:**
- `init` - Initial connection with canvas state
- `drawing` - Real-time stroke updates
- `drawingComplete` - Finalized stroke
- `cursor` - Cursor position updates
- `undo/redo` - History operations
- `users` - User list updates

#### 3. CursorManager (`canvas.js`)
**Responsibilities:**
- Display remote user cursors
- Update cursor positions
- Clean up inactive cursors

### Server Side

#### 1. Server (`server.js`)
**Responsibilities:**
- WebSocket server setup
- Connection handling
- Message routing
- User session management

#### 2. RoomManager (`rooms.js`)
**Responsibilities:**
- Manage multiple rooms (prepared for future)
- User assignment to rooms
- Color assignment to users
- Broadcasting messages within rooms

#### 3. DrawingState (`drawing-state.js`)
**Responsibilities:**
- Maintain stroke history
- Implement undo/redo stacks
- State persistence (in-memory)

**Data Structure:**
```javascript
{
  strokes: [stroke, stroke, ...],      // Main canvas state
  undoneStrokes: [stroke, stroke, ...] // Redo stack
}
```

## WebSocket Protocol

### Client → Server Messages

```javascript
// Real-time drawing
{
  type: 'drawing',
  stroke: { tool, color, width, points }
}

// Completed stroke
{
  type: 'drawingComplete',
  stroke: { tool, color, width, points }
}

// Cursor movement
{
  type: 'cursor',
  position: { x, y }
}

// Actions
{ type: 'undo' }
{ type: 'redo' }
{ type: 'clear' }
{ type: 'requestFullState' }
```

### Server → Client Messages

```javascript
// Initial connection
{
  type: 'init',
  userId: 'abc123',
  canvasState: [stroke, stroke, ...],
  users: [user, user, ...]
}

// Drawing broadcast
{
  type: 'drawing',
  userId: 'abc123',
  stroke: { ... },
  userName: 'User 1',
  color: '#e74c3c'
}

// Canvas updates
{
  type: 'undo',
  canvasState: [stroke, stroke, ...]
}

// User updates
{
  type: 'users',
  users: [{ id, name, color }, ...]
}
```

## Undo/Redo Strategy

### Implementation
We use a **global operation history** approach where the server maintains the canonical state.

### How It Works

1. **Stroke Storage**:
   - Each completed stroke is added to `drawingState.strokes[]`
   - Undo moves strokes to `undoneStrokes[]` stack
   - Redo moves them back

2. **Global Nature**:
   - Undo removes the **last stroke** regardless of who drew it
   - All clients receive the updated canvas state
   - Clients redraw entire canvas from state

3. **Conflict Resolution**:
   - Last-write-wins: newest undo/redo takes precedence
   - Server is source of truth
   - No optimistic updates for undo/redo

### Trade-offs

**Pros:**
- Simple to implement
- Guaranteed consistency
- No conflict resolution needed

**Cons:**
- Can be confusing (User A undoes User B's stroke)
- Full canvas redraw on undo/redo
- Not per-user operation history

**Alternative Approach (Not Implemented):**
Per-user undo/redo with Operational Transformation (OT) or CRDT would allow each user to undo only their own strokes, but adds significant complexity.

## Performance Decisions

### 1. Event Batching
- **Problem**: Mouse events fire at 60+ Hz
- **Solution**: Throttle cursor updates to 50ms intervals
- **Impact**: Reduces WebSocket messages by 70%

### 2. Canvas Redrawing
- **Problem**: Full redraw on undo is expensive
- **Solution**: Use requestAnimationFrame and path optimization
- **Trade-off**: Slight delay vs smooth performance

### 3. Stroke Serialization
- **Problem**: Large stroke data
- **Solution**: Send incremental points during drawing
- **Optimization**: Could use delta encoding (not implemented)

### 4. Memory Management
- **Problem**: Unlimited history grows indefinitely
- **Solution**: Limit to 100 operations
- **Impact**: Reasonable for sessions under 30 minutes

## Conflict Resolution

### Simultaneous Drawing
**Scenario**: Users A and B draw at same time in same area

**Handling**:
1. Each user sees their own stroke immediately (local render)
2. Both strokes broadcast to all clients
3. All clients render both strokes in order received
4. Last stroke appears on top (natural layering)

**Result**: Both strokes visible, no data loss

### Undo Conflicts
**Scenario**: User A draws, User B immediately undoes

**Handling**:
1. Server maintains single operation history
2. Undo removes last stroke (User A's)
3. All clients update to new state
4. User A's stroke disappears for everyone

**Result**: Consistent but potentially confusing UX

### Network Latency
**Handling**:
- Local prediction: Draw immediately on client
- Server reconciliation: Trust server state
- No rollback: Optimistic updates stand

## Scalability Considerations

### Current Limits
- **Users per room**: ~10 concurrent (WebSocket limit)
- **Stroke history**: 100 operations
- **Memory**: ~5-10MB per room
- **Bandwidth**: ~1KB/sec per active drawer

### Scaling Strategies (Future)

1. **Horizontal Scaling**:
   - Redis pub/sub for inter-server communication
   - Sticky sessions for WebSocket connections
   - Shared state in Redis

2. **Performance**:
   - Compress WebSocket messages (gzip)
   - Delta encoding for strokes
   - Canvas quadtree for efficient redraws
   - Stroke simplification (Douglas-Peucker)

3. **Persistence**:
   - PostgreSQL for canvas snapshots
   - S3 for image exports
   - Incremental state updates

## Security Considerations

### Current Implementation
- No authentication (demo purposes)
- Rate limiting: Not implemented
- Input validation: Minimal

### Production Requirements
- User authentication (JWT)
- Rate limiting per user/IP
- Input sanitization
- Canvas size limits
- WebSocket message size limits
- CSRF protection

## Error Handling

### Connection Failures
- Exponential backoff reconnection
- Max 5 retry attempts
- UI feedback on connection status

### Message Errors
- Try-catch on JSON parsing
- Graceful degradation
- Log errors without crashing

### Canvas Errors
- Validate stroke data before rendering
- Fallback to last known good state
- Clear corrupted state on error

## Testing Strategy

### Manual Testing
1. Open 3+ browser windows
2. Draw simultaneously
3. Test undo/redo across users
4. Disconnect/reconnect
5. Clear canvas
6. Mobile touch testing

### Load Testing
```bash
# Simulate 10 concurrent users
for i in {1..10}; do
  node test-client.js &
done
```

### Edge Cases Tested
- Empty canvas undo
- Redo on empty stack
- Reconnection during draw
- Rapid tool switching
- Large strokes (1000+ points)

## Future Improvements

1. **Operational Transformation**: Per-user undo/redo
2. **Persistence**: Database-backed storage
3. **Rooms**: Multi-room support
4. **Optimization**: Stroke simplification
5. **Features**: Shapes, text, layers
6. **Analytics**: Usage tracking, performance metrics
