"""Data analysis and metadata tracking module."""
import json
from datetime import datetime
from pathlib import Path

# Save to root data/ directory (public)
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Private participant data directory (gitignored)
PARTICIPANTS_DIR = Path(__file__).parent.parent / "participants"
PARTICIPANTS_DIR.mkdir(exist_ok=True)

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
        self.notes_file = DATA_DIR / "notes.html"
        self.tree_file = DATA_DIR / "interactions.json"
        self.highlights_file = DATA_DIR / "highlights.json"
        self._load_existing()

    def _load_existing(self):
        if self.actions_file.exists():
            try:
                self.captured = json.loads(self.actions_file.read_text())
            except json.JSONDecodeError:
                self.captured = []

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
        return self.captured[-10:]

    def save_notes(self, content: str):
        """Save researcher notes to HTML file with backup."""
        if not content or content.strip() in ('', '<br>', '<div><br></div>'):
            return  # Don't save empty content
        
        # Create backup if file exists
        if self.notes_file.exists():
            backup_file = DATA_DIR / f"notes_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            backup_file.write_text(self.notes_file.read_text())
            
            # Keep only last 5 backups
            backups = sorted(DATA_DIR.glob("notes_backup_*.html"))
            for old_backup in backups[:-5]:
                old_backup.unlink()
        
        self.notes_file.write_text(content)

    def save_tree(self, tree: dict):
        """Save interaction tree to JSON file."""
        self.tree_file.write_text(json.dumps(tree, indent=2))

    def load_tree(self) -> dict:
        """Load existing tree from file."""
        if self.tree_file.exists():
            try:
                return json.loads(self.tree_file.read_text())
            except json.JSONDecodeError:
                pass
        return {"name": "User Session", "children": []}
    
    def save_highlights(self, highlights: dict):
        """Save tree highlights/annotations."""
        self.highlights_file.write_text(json.dumps(highlights, indent=2))
    
    def load_highlights(self) -> dict:
        """Load saved highlights."""
        if self.highlights_file.exists():
            try:
                return json.loads(self.highlights_file.read_text())
            except json.JSONDecodeError:
                pass
        return {}


class ParticipantDataManager:
    """Manages private per-participant data storage."""
    
    def __init__(self, first_name: str, last_name: str):
        # Create sanitized filename from name
        safe_name = f"{first_name}_{last_name}".lower().replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.participant_id = f"{safe_name}_{timestamp}"
        
        # Create participant directory
        self.participant_dir = PARTICIPANTS_DIR / self.participant_id
        self.participant_dir.mkdir(exist_ok=True)
        
        self.notes_file = self.participant_dir / "notes.html"
        self.tree_file = self.participant_dir / "interactions.json"
        self.actions_file = self.participant_dir / "actions.json"
        self.metadata_file = self.participant_dir / "metadata.json"
        
        # Initialize empty data
        self.tree = {"name": "User Session", "children": []}
        self.actions = []
        
        # Save participant metadata
        self.metadata_file.write_text(json.dumps({
            "first_name": first_name,
            "last_name": last_name,
            "started_at": datetime.now().isoformat()
        }, indent=2))
    
    def save_notes(self, content: str):
        """Save participant notes."""
        if content and content.strip() not in ('', '<br>', '<div><br></div>'):
            self.notes_file.write_text(content)
    
    def save_tree(self, tree: dict):
        """Save participant interaction tree."""
        self.tree = tree
        self.tree_file.write_text(json.dumps(tree, indent=2))
    
    def load_tree(self) -> dict:
        """Load participant's tree."""
        if self.tree_file.exists():
            try:
                return json.loads(self.tree_file.read_text())
            except json.JSONDecodeError:
                pass
        return {"name": "User Session", "children": []}
    
    def log_action(self, data: dict):
        """Log participant action."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "trigger": data.get("trigger"),
            "url": data.get("url"),
        }
        self.actions.append(entry)
        self.actions_file.write_text(json.dumps(self.actions, indent=2))
