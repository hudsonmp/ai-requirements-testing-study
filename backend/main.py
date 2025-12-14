"""FastAPI main entry point with WebSocket connections."""
import os
import hashlib
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from data import DataAnalyzer, ParticipantDataManager
from mouse_movements import MouseTracker
from gemini_graphviz import GeminiTreeAnalyzer
from vnc_capture import capture_vnc_screenshot, get_url_bar_hash

load_dotenv()

# Global instances
analyzer = DataAnalyzer()
mouse_tracker = MouseTracker()
gemini_analyzer = GeminiTreeAnalyzer(os.getenv("GEMINI_API_KEY"), analyzer.load_tree())

# Active participant session (None when in researcher mode)
active_participant: ParticipantDataManager | None = None

# Store researcher's tree when entering participant mode
saved_researcher_tree: dict | None = None

# Track last state for change detection
last_screenshot_hash = ""
last_url_bar_hash = ""

class ChangeCheckRequest(BaseModel):
    lastUrlBarHash: str = ""
    lastScreenHash: str = ""

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        if not self.active:
            return
        for ws in self.active.copy():
            try:
                await ws.send_json(data)
            except Exception:
                if ws in self.active:
                    self.active.remove(ws)

manager = ConnectionManager()

async def run_analysis(screenshot=None):
    """Run Gemini analysis immediately."""
    global active_participant
    
    if not screenshot:
        screenshot = capture_vnc_screenshot()
    
    if not screenshot:
        print("[ERROR] No screenshot available")
        return
    
    try:
        tree = await gemini_analyzer.analyze_screenshot(
            screenshot,
            analyzer.get_metadata()
        )
        
        if active_participant:
            # Participant mode: only save to participant's private data
            active_participant.save_tree(tree)
        else:
            # Researcher mode: save to researcher's data
            analyzer.save_tree(tree)
        
        await manager.broadcast({"type": "tree_update", "tree": tree})
    except Exception as e:
        print(f"[ERROR] Gemini analysis failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """Main WebSocket for all frontend communication."""
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_json()
            event_type = data.get("type")
            
            if event_type == "mouse":
                mouse_tracker.log_event(data)
            elif event_type == "trigger":
                trigger = data.get('trigger')
                if trigger in ('click', 'url_change'):
                    print(f"[TRIGGER] {trigger}")
                    try:
                        await ws.send_json({"type": "ack", "trigger": trigger})
                    except Exception:
                        pass
                    
                    if active_participant:
                        # Participant mode: only log to participant
                        active_participant.log_action(data)
                    else:
                        # Researcher mode: log to researcher
                        analyzer.log_action(data)
                    
                    await run_analysis(data.get("screenshot"))
            elif event_type == "notes":
                analyzer.save_notes(data.get("content", ""))
            elif event_type == "participant_notes":
                if active_participant:
                    active_participant.save_notes(data.get("content", ""))
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        manager.disconnect(ws)

@app.post("/check-changes")
async def check_changes(request: ChangeCheckRequest):
    """Check if screen or URL bar has changed since last check."""
    global last_screenshot_hash, last_url_bar_hash
    
    screenshot = capture_vnc_screenshot()
    if not screenshot:
        return {"changed": False, "error": "Failed to capture screenshot"}
    
    current_hash = hashlib.sha256(screenshot.encode()).hexdigest()[:16]
    current_url_bar_hash = get_url_bar_hash(screenshot)
    
    url_changed = current_url_bar_hash != request.lastUrlBarHash and request.lastUrlBarHash != ""
    screen_changed = current_hash != request.lastScreenHash
    
    if url_changed or screen_changed:
        if url_changed:
            print(f"[POST] /check-changes - URL bar changed")
        last_screenshot_hash = current_hash
        last_url_bar_hash = current_url_bar_hash
        return {
            "changed": True,
            "urlChanged": url_changed,
            "screenHash": current_hash,
            "urlBarHash": current_url_bar_hash,
            "screenshot": screenshot
        }
    return {"changed": False}

@app.post("/force-capture")
async def force_capture():
    """Force capture, analyze with Gemini, and broadcast update."""
    print("[POST] /force-capture")
    screenshot = capture_vnc_screenshot()
    if screenshot:
        tree = await gemini_analyzer.analyze_screenshot(
            screenshot, 
            analyzer.get_metadata()
        )
        
        if active_participant:
            active_participant.save_tree(tree)
        else:
            analyzer.save_tree(tree)
        
        await manager.broadcast({"type": "tree_update", "tree": tree})
        return {"success": True, "message": "Captured and analyzed"}
    else:
        print("[ERROR] /force-capture - screenshot failed")
        return {"error": "Failed to capture screenshot"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/state")
async def get_state():
    """Get current tree, notes, and highlights for frontend initialization."""
    notes = ""
    if analyzer.notes_file.exists():
        notes = analyzer.notes_file.read_text()
    return {
        "tree": gemini_analyzer.current_tree,
        "notes": notes,
        "highlights": analyzer.load_highlights()
    }

class TreeUpdateRequest(BaseModel):
    tree: dict

@app.post("/save-tree")
async def save_tree(request: TreeUpdateRequest):
    """Save updated tree (after deletions/edits)."""
    gemini_analyzer.current_tree = request.tree
    analyzer.save_tree(request.tree)
    await manager.broadcast({"type": "tree_update", "tree": request.tree})
    return {"success": True}

class HighlightsUpdateRequest(BaseModel):
    highlights: dict

@app.post("/save-highlights")
async def save_highlights(request: HighlightsUpdateRequest):
    """Save tree highlights/annotations."""
    analyzer.save_highlights(request.highlights)
    return {"success": True}


class StartParticipantRequest(BaseModel):
    firstName: str
    lastName: str

@app.post("/start-participant")
async def start_participant(request: StartParticipantRequest):
    """Start a new participant session with their own private data storage."""
    global active_participant, saved_researcher_tree
    
    # Save researcher's current tree before starting participant session
    saved_researcher_tree = gemini_analyzer.current_tree
    
    # Reset to empty tree for participant
    gemini_analyzer.current_tree = {"name": "User Session", "children": []}
    
    active_participant = ParticipantDataManager(request.firstName, request.lastName)
    return {
        "success": True,
        "participantId": active_participant.participant_id
    }

@app.post("/end-participant")
async def end_participant():
    """End current participant session and restore researcher's tree."""
    global active_participant, saved_researcher_tree
    
    # Restore researcher's tree
    if saved_researcher_tree:
        gemini_analyzer.current_tree = saved_researcher_tree
        saved_researcher_tree = None
    
    active_participant = None
    return {"success": True}

@app.post("/participant-notes")
async def save_participant_notes(content: str = ""):
    """Save notes for current participant."""
    if active_participant:
        active_participant.save_notes(content)
        return {"success": True}
    return {"success": False, "error": "No active participant"}

@app.get("/participant-state")
async def get_participant_state():
    """Get current participant's tree (separate from researcher data)."""
    if active_participant:
        return {
            "tree": active_participant.load_tree(),
            "participantId": active_participant.participant_id
        }
    return {"tree": {"name": "User Session", "children": []}, "participantId": None}
