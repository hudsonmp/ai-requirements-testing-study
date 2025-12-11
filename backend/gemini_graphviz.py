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

IGNORE: search, browse, product listings, navigation, filters - unless directly leading to cart/checkout/auth.

STRUCTURE - Each interaction has TWO levels:
- **LOA 1 (Page Context)**: Brief description of what page/screen is shown
- **LOA 2 (User Interactions)**: DETAILED list of ALL possible actions user could take - be VERY thorough

RULES:
- Return COMPLETE tree with ALL previous interactions intact
- Add NEW interaction only if page/state changed from last one
- Number sequentially: "Interaction 1", "Interaction 2", etc.
- NEVER modify previous interactions

Return ONLY valid JSON:
{
  "name": "User Session",
  "children": [
    {
      "name": "Interaction 1",
      "children": [
        {
          "name": "LOA 1: Product Page - Add to Cart Section",
          "children": [
            {"name": "Product: [product name] displayed"},
            {"name": "Price: $XX.XX shown"},
            {"name": "Add to Cart button visible"}
          ]
        },
        {
          "name": "LOA 2: Available User Actions",
          "children": [
            {"name": "Click 'Add to Cart' button"},
            {"name": "Select quantity (dropdown: 1-10)"},
            {"name": "Choose variant (size/color) if available"},
            {"name": "Check 'Add protection plan' checkbox"},
            {"name": "Click 'Buy Now' for instant checkout"},
            {"name": "Click 'Add to Wishlist' link"}
          ]
        }
      ]
    },
    {
      "name": "Interaction 2",
      "children": [
        {
          "name": "LOA 1: Shopping Cart Page",
          "children": [
            {"name": "Cart contains 1 item"},
            {"name": "Subtotal: $XX.XX"},
            {"name": "Checkout button prominent"}
          ]
        },
        {
          "name": "LOA 2: Available User Actions",
          "children": [
            {"name": "Click '+' to increase quantity"},
            {"name": "Click '-' to decrease quantity"},
            {"name": "Click 'Remove' to delete item"},
            {"name": "Click 'Save for Later' link"},
            {"name": "Enter promo code in text field"},
            {"name": "Click 'Apply' to submit promo code"},
            {"name": "Click 'Proceed to Checkout' button"},
            {"name": "Click product link to return to product"},
            {"name": "Click 'Continue Shopping' link"}
          ]
        }
      ]
    },
    {
      "name": "Interaction 3",
      "children": [
        {
          "name": "LOA 1: Checkout - Sign In / Guest",
          "children": [
            {"name": "Login form displayed"},
            {"name": "Guest checkout option available"}
          ]
        },
        {
          "name": "LOA 2: Available User Actions",
          "children": [
            {"name": "Enter email in 'Email' text field"},
            {"name": "Enter password in 'Password' text field"},
            {"name": "Click 'Sign In' button"},
            {"name": "Click 'Forgot Password?' link"},
            {"name": "Click 'Create Account' button"},
            {"name": "Click 'Continue as Guest' button"},
            {"name": "Check 'Remember me' checkbox"},
            {"name": "Click Google/Facebook social login buttons"}
          ]
        }
      ]
    }
  ]
}

LOA 2 MUST be VERY detailed - list EVERY:
- Button with exact label ("Click 'Add to Cart' button")
- Text field with label ("Enter email in 'Email' field")  
- Dropdown with options ("Select quantity from dropdown (1-10)")
- Checkbox with label ("Check 'Add protection' checkbox")
- Link with text ("Click 'Forgot Password?' link")
- Decision point ("Choose: Sign In vs Continue as Guest")"""

class GeminiTreeAnalyzer:
    """Handles Gemini API calls and tree structure generation."""
    
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.model_name = "gemini-2.5-flash"
        self.current_tree = {"name": "User Session", "children": []}

    async def analyze_screenshot(self, screenshot_b64: str, metadata: list) -> dict:
        """Send screenshot to Gemini and get tree structure output."""
        if not self.client:
            print("[Gemini] ⚠ Client not initialized - missing API key")
            return self.current_tree
        print(f"[Gemini] Starting analysis (screenshot: {len(screenshot_b64)} chars, metadata: {len(metadata)} items)")
        try:
            image_data = base64.b64decode(screenshot_b64)
            print(f"[Gemini] Decoded image: {len(image_data)} bytes")
            context = f"Recent actions: {metadata}" if metadata else ""
            
            # Include current tree as context - count existing interactions
            num_interactions = len([child for child in self.current_tree.get('children', []) if 'Interaction' in child.get('name', '')])
            current_tree_context = f"\n\nCURRENT TREE (with {num_interactions} interactions already documented):\n{json.dumps(self.current_tree, indent=2)}\n\nIf this screenshot shows a NEW interaction in cart/checkout/auth, add it as 'Interaction {num_interactions + 1}'. Otherwise, return the tree unchanged."
            
            prompt = f"{SYSTEM_PROMPT}\n\n{context}{current_tree_context}\n\nAnalyze this screenshot:"
            
            # Run sync call in executor since google-genai doesn't have native async
            print(f"[Gemini] Calling API with model: {self.model_name}")
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_data, mime_type="image/png")
                ],
                config=types.GenerateContentConfig(temperature=0.2)
            ))
            
            print(f"[Gemini] ✓ Got response: {len(response.text)} chars")
            new_tree = self._extract_json(response.text)
            if new_tree and self._validate_tree(new_tree):
                print("[Gemini] ✓ Tree validated, using new tree")
                self.current_tree = new_tree
            else:
                print("[Gemini] ⚠ Tree validation failed, keeping existing")
            print(f"[Gemini] Current tree: {json.dumps(self.current_tree)[:200]}...")
            return self.current_tree
        except Exception as e:
            print(f"[Gemini] ✗ Error: {e}")
            import traceback
            traceback.print_exc()
            return self.current_tree

    def _extract_json(self, text: str) -> dict:
        """Extract JSON from Gemini response."""
        try:
            # Try to find JSON in response
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
            print(f"[Gemini] JSON parse error: {e}")
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

