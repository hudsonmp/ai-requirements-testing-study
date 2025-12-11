"""Gemini API integration for screenshot analysis and Graphviz generation."""
import base64
import google.generativeai as genai
from graphviz import Source

SYSTEM_PROMPT = """You are analyzing a screenshot of a user's browser session for requirements documentation.
Identify all possible user interactions on the page and document them hierarchically.

Return ONLY valid Graphviz DOT notation. Be concise. Example format:
digraph G {
    rankdir=TB;
    node [shape=box];
    "Page View" -> "See Item";
    "See Item" -> "Price";
    "See Item" -> "Add to Cart";
    "Add to Cart" -> "Protection Plan Prompt";
}

Document:
- All visible UI elements that can be interacted with
- The hierarchical relationship between elements
- Any implicit requirements (e.g., protection prompts, upsells)
- User decision points"""

class GeminiGraphviz:
    """Handles Gemini API calls and Graphviz rendering."""
    
    def __init__(self, api_key: str):
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config={"temperature": 0.2}
        )
        self.current_dot = 'digraph G { "Start" }'

    async def analyze_screenshot(self, screenshot_b64: str, metadata: list) -> str:
        """Send screenshot to Gemini and get Graphviz DOT output."""
        try:
            image_data = base64.b64decode(screenshot_b64)
            
            context = f"Recent actions: {metadata}" if metadata else ""
            prompt = f"{SYSTEM_PROMPT}\n\n{context}\n\nAnalyze this screenshot:"
            
            response = await self.model.generate_content_async([
                prompt,
                {"mime_type": "image/png", "data": image_data}
            ])
            
            dot = self._extract_dot(response.text)
            if self._validate_dot(dot):
                self.current_dot = self._merge_graphs(self.current_dot, dot)
            return self.current_dot
        except Exception as e:
            print(f"Gemini error: {e}")
            return self.current_dot

    def _extract_dot(self, text: str) -> str:
        """Extract DOT notation from Gemini response."""
        if "digraph" in text:
            start = text.find("digraph")
            depth = 0
            for i, c in enumerate(text[start:]):
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        return text[start:start+i+1]
        return self.current_dot

    def _validate_dot(self, dot: str) -> bool:
        """Validate DOT syntax."""
        try:
            Source(dot)
            return True
        except Exception:
            return False

    def _merge_graphs(self, existing: str, new: str) -> str:
        """Merge new graph data into existing graph (upsert)."""
        # Extract edges from both graphs and combine
        existing_edges = self._get_edges(existing)
        new_edges = self._get_edges(new)
        all_edges = existing_edges | new_edges
        
        edges_str = "\n    ".join(all_edges)
        return f'digraph G {{\n    rankdir=TB;\n    node [shape=box];\n    {edges_str}\n}}'

    def _get_edges(self, dot: str) -> set:
        """Extract edge definitions from DOT string."""
        edges = set()
        for line in dot.split("\n"):
            if "->" in line:
                edges.add(line.strip().rstrip(";"))
        return edges

    def render_svg(self) -> str:
        """Render current graph as SVG string."""
        return Source(self.current_dot).pipe(format="svg").decode("utf-8")

