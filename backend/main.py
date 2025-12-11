"""FastAPI main entry point with WebSocket connections."""
import os
import hashlib
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from data import DataAnalyzer
from mouse_movements import MouseTracker
from gemini_graphviz import GeminiTreeAnalyzer
from vnc_capture import capture_vnc_screenshot

load_dotenv()

# Global instances
analyzer = DataAnalyzer()
mouse_tracker = MouseTracker()
gemini_analyzer = GeminiTreeAnalyzer(os.getenv("GEMINI_API_KEY"))

# Track last state for change detection
last_screenshot_hash = ""
last_url = ""

# Batching: 3-second debounce for Gemini calls
BATCH_DELAY_SECONDS = 3
pending_analysis_task = None
pending_screenshot = None

class ChangeCheckRequest(BaseModel):
    lastUrl: str = ""
    lastScreenHash: str = ""

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        print(f"[WS] Broadcasting to {len(self.active)} clients: {str(data)[:100]}...")
        disconnected = []
        for ws in self.active:
            try:
                await ws.send_json(data)
                print(f"[WS] ✓ Sent to client successfully")
            except Exception as e:
                print(f"[WS] ✗ Failed to send to client: {e}")
                disconnected.append(ws)
        # Clean up dead connections
        for ws in disconnected:
            self.active.remove(ws)
            print(f"[WS] Removed dead connection, {len(self.active)} active")

manager = ConnectionManager()

async def schedule_batched_analysis(screenshot=None):
    """Schedule Gemini analysis with 3-second batching/debounce."""
    global pending_analysis_task, pending_screenshot
    
    # Capture screenshot now if not provided
    if not screenshot:
        print("[Batch] No screenshot provided, capturing from VNC...")
        screenshot = capture_vnc_screenshot()
    
    if screenshot:
        pending_screenshot = screenshot
        print(f"[Batch] Screenshot queued ({len(screenshot)} chars)")
    
    # Cancel existing pending task if any
    if pending_analysis_task and not pending_analysis_task.done():
        pending_analysis_task.cancel()
        print(f"[Batch] Cancelled pending task, restarting {BATCH_DELAY_SECONDS}s timer")
    
    # Schedule new analysis after delay
    pending_analysis_task = asyncio.create_task(run_batched_analysis())

async def run_batched_analysis():
    """Wait for batch delay then run Gemini analysis."""
    global pending_screenshot
    
    try:
        print(f"[Batch] Waiting {BATCH_DELAY_SECONDS}s for more events...")
        await asyncio.sleep(BATCH_DELAY_SECONDS)
        
        if pending_screenshot:
            print("[Batch] Timer complete, sending to Gemini...")
            tree = await gemini_analyzer.analyze_screenshot(
                pending_screenshot,
                analyzer.get_metadata()
            )
            print(f"[Batch] Broadcasting tree update: {tree.get('name', 'Unknown')} with {len(tree.get('children', []))} children")
            await manager.broadcast({"type": "tree_update", "tree": tree})
            pending_screenshot = None
        else:
            print("[Batch] ⚠ No screenshot available")
    except asyncio.CancelledError:
        pass  # Task was cancelled by new trigger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize browser permissions and services."""
    print("Initializing services...")
    yield
    print("Shutting down...")

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
    print("[WS] Client connecting...")
    await manager.connect(ws)
    print("[WS] Client connected successfully")
    try:
        while True:
            data = await ws.receive_json()
            event_type = data.get("type")
            print(f"[WS] Received event: {event_type}, data: {data}")
            
            if event_type == "mouse":
                print("[WS] Processing mouse event")
                mouse_tracker.log_event(data)
            elif event_type == "trigger":
                print(f"[WS] Processing trigger: {data.get('trigger')}")
                # Immediately acknowledge receipt
                await ws.send_json({"type": "ack", "trigger": data.get('trigger')})
                # URL change, click, scroll, or page change
                analyzer.log_action(data)
                # Schedule batched analysis (3-second debounce)
                await schedule_batched_analysis(data.get("screenshot"))
            elif event_type == "notes":
                print("[WS] Saving notes")
                analyzer.save_notes(data.get("content", ""))
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
        manager.disconnect(ws)

@app.post("/check-changes")
async def check_changes(request: ChangeCheckRequest):
    """Check if screen or URL has changed since last check."""
    global last_screenshot_hash, last_url
    
    print(f"[API] Checking for changes... Last hash: {request.lastScreenHash[:8] if request.lastScreenHash else 'none'}")
    
    # Capture current screenshot
    screenshot = capture_vnc_screenshot()
    if not screenshot:
        return {"changed": False, "error": "Failed to capture screenshot"}
    
    # Hash the screenshot to detect visual changes
    current_hash = hashlib.sha256(screenshot.encode()).hexdigest()[:16]
    
    # For URL detection, we'd need to inject JavaScript into the VNC browser
    # For now, we'll just use screenshot hash comparison
    changed = current_hash != request.lastScreenHash
    
    if changed:
        print(f"[API] ✓ Change detected! New hash: {current_hash[:8]}")
        last_screenshot_hash = current_hash
        return {
            "changed": True,
            "screenHash": current_hash,
            "url": last_url,
            "screenshot": screenshot
        }
    else:
        print(f"[API] No changes detected")
        return {"changed": False}

@app.post("/force-capture")
async def force_capture():
    """Force capture, analyze with Gemini, and broadcast update."""
    print("[API] Force capture requested")
    screenshot = capture_vnc_screenshot()
    if screenshot:
        current_hash = hashlib.sha256(screenshot.encode()).hexdigest()[:16]
        print(f"[API] ✓ Force capture complete: {current_hash[:8]}")
        
        # Send to Gemini for analysis
        print("[API] Sending to Gemini for analysis...")
        tree = await gemini_analyzer.analyze_screenshot(
            screenshot, 
            analyzer.get_metadata()
        )
        
        # Broadcast updated tree to all connected clients
        print(f"[API] Broadcasting tree update: {tree.get('name', 'Unknown')} with {len(tree.get('children', []))} children")
        await manager.broadcast({"type": "tree_update", "tree": tree})
        
        return {"success": True, "message": "Captured and analyzed"}
    else:
        return {"error": "Failed to capture screenshot"}

@app.get("/health")
async def health():
    return {"status": "ok"}

