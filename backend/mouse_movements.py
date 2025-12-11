"""Mouse movement and click tracking via noVNC events."""
import json
from datetime import datetime
from pathlib import Path

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

class MouseTracker:
    """Hooks into noVNC mouse events and logs them."""
    
    def __init__(self):
        self.events: list[dict] = []
        self.events_file = DATA_DIR / "mouse_events.json"

    def log_event(self, data: dict):
        """Log mouse event with timestamp and coordinates."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "type": data.get("event_type"),  # move, click, scroll
            "x": data.get("x"),
            "y": data.get("y"),
            "button": data.get("button"),
            "scroll_delta": data.get("scroll_delta")
        }
        self.events.append(entry)
        # Keep only last 1000 events in memory
        if len(self.events) > 1000:
            self._flush()

    def _flush(self):
        """Write events to file and clear memory."""
        existing = []
        if self.events_file.exists():
            existing = json.loads(self.events_file.read_text())
        existing.extend(self.events)
        self.events_file.write_text(json.dumps(existing, indent=2))
        self.events = []

    def get_recent(self, count: int = 50) -> list[dict]:
        """Get recent mouse events for analysis."""
        return self.events[-count:]

