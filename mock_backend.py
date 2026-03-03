"""Minimal mock backend for screenshot purposes — serves /state with sample tree data."""
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_TREE = {
    "name": "User Session",
    "children": [
        {
            "name": "Interaction 1 — Rider pickup assignment",
            "children": [
                {"name": "Student asked: 'If two riders are equidistant, who gets the vehicle?'", "children": []},
                {"name": "TA response: 'Does your spec define request_time as a field?'", "children": []},
                {
                    "name": "LOA: Missing request_time in schema",
                    "children": [
                        {"name": "request_time undefined → ordering is arbitrary", "children": []},
                        {"name": "Test: R1(2mi), R2(2mi) → V1 — assigned R2 by queue position", "children": []},
                    ]
                },
            ]
        },
        {
            "name": "Interaction 2 — Vehicle accessibility matching",
            "children": [
                {"name": "Student asked: 'What if an accessible rider requests a non-accessible vehicle?'", "children": []},
                {"name": "TA response: 'Is is_accessible defined on the vehicle object?'", "children": []},
                {
                    "name": "LOA: Missing is_accessible on vehicle spec",
                    "children": [
                        {"name": "is_accessible only on rider, not vehicle → silent mismatch", "children": []},
                        {"name": "Test: R1(accessible=true) → V1(accessible=?) — no validation", "children": []},
                    ]
                },
            ]
        },
        {
            "name": "Interaction 3 — Simultaneous request handling",
            "children": [
                {"name": "Student asked: 'What happens when 3 riders request at the same timestamp?'", "children": []},
                {
                    "name": "LOA: No tie-breaking policy defined",
                    "children": [
                        {"name": "current_location undefined on vehicle → distance calc relies on implicit state", "children": []},
                        {"name": "eta_dropoff missing → cannot optimize full trip cost", "children": []},
                    ]
                },
            ]
        },
    ]
}

MOCK_NOTES = """# Session Notes — Subject 07

## Key Findings
- **request_time** not defined in request schema → ordering undefined
- **is_accessible** missing from vehicle object (only on rider)
- **current_location** treated as implicit input, not a named field

## Missing Requirements Identified
1. `request_time` — needed for FIFO ordering when distances are equal
2. `current_location` — vehicle GPS must be explicit schema field
3. `eta_dropoff` — required for full trip cost optimization
4. `is_accessible` on vehicle — capability flag for accessibility matching
"""

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/state")
async def get_state():
    return {"tree": MOCK_TREE, "notes": MOCK_NOTES, "highlights": {}}

@app.post("/save-tree")
async def save_tree(request: dict):
    return {"success": True}

@app.post("/save-highlights")
async def save_highlights(request: dict):
    return {"success": True}

@app.post("/check-changes")
async def check_changes(request: dict):
    return {"changed": False}

@app.post("/force-capture")
async def force_capture():
    return {"success": True, "message": "Mock capture"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await ws.receive_text()
    except (WebSocketDisconnect, RuntimeError):
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
