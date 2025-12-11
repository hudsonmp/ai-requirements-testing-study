"""FastAPI main entry point with WebSocket connections."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from data import DataAnalyzer
from mouse_movements import MouseTracker
from gemini_graphviz import GeminiGraphviz

load_dotenv()

# Global instances
analyzer = DataAnalyzer()
mouse_tracker = MouseTracker()
gemini_gv = GeminiGraphviz(os.getenv("GEMINI_API_KEY"))

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
        for ws in self.active:
            await ws.send_json(data)

manager = ConnectionManager()

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
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_json()
            event_type = data.get("type")
            
            if event_type == "mouse":
                mouse_tracker.log_event(data)
            elif event_type == "trigger":
                # URL change, click, scroll, or page change
                analyzer.log_action(data)
                # Capture screenshot and analyze with Gemini
                if data.get("screenshot"):
                    dot = await gemini_gv.analyze_screenshot(
                        data["screenshot"], 
                        analyzer.get_metadata()
                    )
                    await manager.broadcast({"type": "graph_update", "dot": dot})
            elif event_type == "notes":
                analyzer.save_notes(data.get("content", ""))
    except WebSocketDisconnect:
        manager.disconnect(ws)

@app.get("/health")
async def health():
    return {"status": "ok"}

