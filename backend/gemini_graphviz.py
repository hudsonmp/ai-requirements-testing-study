"""Gemini API integration for screenshot analysis and tree generation."""
import base64
import asyncio
import json
from google import genai
from google.genai import types

SYSTEM_PROMPT = """You are documenting a user's e-commerce session step-by-step for requirements analysis.

FOCUS ONLY ON:
1. **Shopping Cart** - Adding items, viewing cart, modifying quantities, removing items
2. **Checkout Process** - All steps from cart to order completion
3. **Authentication** - Login, logout, account creation, password reset
4. **Support/Help** - Customer support, help pages, contact forms within checkout/cart context

IGNORE: search, browse, product listings, navigation, filters - unless directly leading to cart/checkout/auth/support.

STRUCTURE - Each interaction has THREE levels:
- **LOA 1 (Visual State)**: What CHANGED visually - new images, logos, icons, banners, colors, expanded sections
- **LOA 2 (Content State)**: Text, prices, product info, messages, form states currently displayed
- **LOA 3 (Available Actions)**: DETAILED list of ALL interactive elements user could click/type/select

RULES:
- Return COMPLETE tree with ALL previous interactions intact
- Add NEW interaction only if page/state changed from last one
- Number sequentially: "Interaction 1", "Interaction 2", etc.
- NEVER modify previous interactions
- ALWAYS note visual changes (new logo appeared, image changed, section expanded, etc.)

Return ONLY valid JSON:
{
  "name": "User Session",
  "children": [
    {
      "name": "Interaction 1",
      "children": [
        {
          "name": "LOA 1: Visual State",
          "children": [
            {"name": "Product image: [description]"},
            {"name": "Brand logo: [brand name] visible"},
            {"name": "Banner/header: [description]"}
          ]
        },
        {
          "name": "LOA 2: Content State",
          "children": [
            {"name": "Product: [product name]"},
            {"name": "Price: $XX.XX"},
            {"name": "Description: [key details]"}
          ]
        },
        {
          "name": "LOA 3: Available Actions",
          "children": [
            {"name": "Click 'Add to Cart' button"},
            {"name": "Select quantity (dropdown: 1-10)"},
            {"name": "Click 'Apple Support' link"}
          ]
        }
      ]
    },
    {
      "name": "Interaction 2",
      "children": [
        {
          "name": "LOA 1: Visual State",
          "children": [
            {"name": "CHANGED: Apple Support logo now displayed"},
            {"name": "CHANGED: Support banner appeared at top"},
            {"name": "Support icon visible in header"}
          ]
        },
        {
          "name": "LOA 2: Content State",
          "children": [
            {"name": "Page title: 'Apple Support'"},
            {"name": "Support options listed"},
            {"name": "Contact info displayed"}
          ]
        },
        {
          "name": "LOA 3: Available Actions",
          "children": [
            {"name": "Click 'Chat with us' button"},
            {"name": "Click 'Call support' link"},
            {"name": "Enter issue in search field"}
          ]
        }
      ]
    }
  ]
}

LOA 1 (Visual) - Note ALL visual changes:
- Images that appeared/changed
- Logos/branding visible
- Icons, banners, headers
- Color/theme changes
- Expanded/collapsed sections
- Modals/popups

LOA 3 (Actions) - List EVERY interactive element:
- Button with exact label
- Text field with label
- Dropdown with options
- Checkbox with label
- Link with text"""

class GeminiTreeAnalyzer:
    """Handles Gemini API calls and tree structure generation."""
    
    def __init__(self, api_key: str, initial_tree: dict = None):
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.model_name = "gemini-2.5-flash"
        self.current_tree = initial_tree or {"name": "User Session", "children": []}

    async def analyze_screenshot(self, screenshot_b64: str, metadata: list) -> dict:
        """Send screenshot to Gemini and get tree structure output."""
        if not self.client:
            print("[ERROR] Gemini client not initialized - missing API key")
            return self.current_tree
        try:
            image_data = base64.b64decode(screenshot_b64)
            
            num_interactions = len(self.current_tree.get('children', []))
            next_num = num_interactions + 1
            
            # Ask Gemini for ONLY the new interaction, we'll append it ourselves
            single_interaction_prompt = f"""{SYSTEM_PROMPT}

You are on Interaction {next_num}. Return ONLY this single interaction as JSON:
{{
  "name": "Interaction {next_num}",
  "children": [
    {{"name": "LOA 1: Visual State", "children": [...]}},
    {{"name": "LOA 2: Content State", "children": [...]}},
    {{"name": "LOA 3: Available Actions", "children": [...]}}
  ]
}}

Analyze this screenshot and return the interaction JSON:"""
            
            print(f"[API] Gemini request - analyzing for Interaction {next_num}")
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    single_interaction_prompt,
                    types.Part.from_bytes(data=image_data, mime_type="image/png")
                ],
                config=types.GenerateContentConfig(temperature=0.2)
            ))
            
            new_interaction = self._extract_json(response.text)
            if new_interaction and self._validate_interaction(new_interaction):
                # Append new interaction to existing tree
                self.current_tree['children'].append(new_interaction)
                print(f"[API] Added Interaction {next_num} - total: {len(self.current_tree.get('children', []))}")
            return self.current_tree
        except Exception as e:
            print(f"[ERROR] Gemini: {e}")
            return self.current_tree
    
    def _validate_interaction(self, interaction: dict) -> bool:
        """Validate a single interaction has required structure."""
        if not isinstance(interaction, dict):
            return False
        if "name" not in interaction:
            return False
        if "children" not in interaction or not isinstance(interaction["children"], list):
            return False
        return True

    def _extract_json(self, text: str) -> dict:
        """Extract JSON from Gemini response."""
        try:
            start = text.find("{")
            if start == -1:
                return None
            depth = 0
            for i, c in enumerate(text[start:]):
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        json_str = text[start:start+i+1]
                        return json.loads(json_str)
            return None
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON parse: {e}")
            return None

    def _validate_tree(self, tree: dict) -> bool:
        """Validate tree structure has required fields."""
        if not isinstance(tree, dict):
            return False
        if "name" not in tree:
            return False
        if "children" in tree and not isinstance(tree["children"], list):
            return False
        return True

    def _merge_trees(self, existing: dict, new: dict) -> dict:
        """Merge new tree into existing tree, preserving unique nodes."""
        if not existing.get("children"):
            return new
        if not new.get("children"):
            return existing
        
        # Build map of existing children by name
        existing_children = {c["name"]: c for c in existing.get("children", [])}
        
        # Merge new children
        for child in new.get("children", []):
            name = child["name"]
            if name in existing_children:
                # Recursively merge
                existing_children[name] = self._merge_trees(existing_children[name], child)
            else:
                existing_children[name] = child
        
        return {
            "name": new.get("name", existing.get("name", "Root")),
            "children": list(existing_children.values())
        }

# Alias for backwards compatibility
GeminiGraphviz = GeminiTreeAnalyzer

