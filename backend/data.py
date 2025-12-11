"""Data analysis and metadata tracking module."""
import json
from datetime import datetime
from pathlib import Path

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

class DataAnalyzer:
    """Tracks and analyzes user interactions with the browser."""
    
    METADATA_TYPES = [
        "clicks", "taps", "navigation", "scrolling", "form_interactions",
        "duration", "hover_patterns", "copy", "paste", "search_queries",
        "filters_applied", "items_viewed", "page_state_change", 
        "cart_actions", "quantity_changes", "price_changes", "checkout_flow"
    ]
    
    def __init__(self):
        self.captured: list[dict] = []
        self.actions_file = DATA_DIR / "actions.json"
        self.notes_file = DATA_DIR / "notes.md"
        self._load_existing()

    def _load_existing(self):
        if self.actions_file.exists():
            self.captured = json.loads(self.actions_file.read_text())

    def log_action(self, data: dict):
        """Log metadata from a trigger event with timestamp."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "trigger": data.get("trigger"),
            "url": data.get("url"),
            "metadata": {k: data.get(k) for k in self.METADATA_TYPES if k in data}
        }
        self.captured.append(entry)
        self._save()

    def _save(self):
        self.actions_file.write_text(json.dumps(self.captured, indent=2))

    def get_metadata(self) -> list[dict]:
        """Return captured metadata for Gemini context."""
        return self.captured[-10:]  # Last 10 actions for context

    def save_notes(self, content: str):
        """Save researcher notes to markdown file."""
        self.notes_file.write_text(content)

    def connect_to_graph(self, graph_data: str) -> dict:
        """Connect captured metadata with Graphviz graph."""
        return {"actions": len(self.captured), "graph": graph_data}

