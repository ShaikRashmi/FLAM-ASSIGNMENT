// Drawing state management
class DrawingState {
    constructor() {
        this.strokes = [];
        this.undoneStrokes = [];
        this.maxHistory = 100; // Limit history to prevent memory issues
    }

    addStroke(stroke) {
        // Add completed stroke to history
        this.strokes.push(stroke);
        
        // Clear redo stack when new action is performed
        this.undoneStrokes = [];
        
        // Limit history size
        if (this.strokes.length > this.maxHistory) {
            this.strokes.shift();
        }
        
        return this.strokes;
    }

    undo() {
        if (this.strokes.length === 0) {
            return { success: false, canvasState: this.strokes };
        }
        
        const lastStroke = this.strokes.pop();
        this.undoneStrokes.push(lastStroke);
        
        return {
            success: true,
            canvasState: this.strokes
        };
    }

    redo() {
        if (this.undoneStrokes.length === 0) {
            return { success: false, canvasState: this.strokes };
        }
        
        const stroke = this.undoneStrokes.pop();
        this.strokes.push(stroke);
        
        return {
            success: true,
            canvasState: this.strokes
        };
    }

    clear() {
        this.strokes = [];
        this.undoneStrokes = [];
        return this.strokes;
    }

    getState() {
        return this.strokes;
    }

    getStats() {
        return {
            strokes: this.strokes.length,
            undoStack: this.undoneStrokes.length,
            totalPoints: this.strokes.reduce((sum, stroke) => 
                sum + (stroke.points ? stroke.points.length : 0), 0
            )
        };
    }
}

module.exports = DrawingState;
