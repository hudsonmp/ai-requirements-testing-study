"""VNC framebuffer capture utility."""
import base64
import hashlib
import subprocess
from io import BytesIO
from PIL import Image

# URL bar region: top 80 pixels of the screen
URL_BAR_HEIGHT = 80

def capture_vnc_screenshot() -> str | None:
    """Capture VNC framebuffer and return as base64 PNG."""
    try:
        result = subprocess.run(
            ["docker", "exec", "ai-requirements-testing-study-vnc-1", 
             "sh", "-c", "DISPLAY=:1 import -window root png:-"],
            capture_output=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout:
            return base64.b64encode(result.stdout).decode('utf-8')
    except subprocess.TimeoutExpired:
        print("[ERROR] VNC capture timeout")
    except FileNotFoundError:
        print("[ERROR] Docker not available")
    except Exception as e:
        print(f"[ERROR] VNC capture: {e}")
    return None

def get_url_bar_hash(screenshot_b64: str) -> str:
    """Extract URL bar region and return its hash for change detection."""
    try:
        img_data = base64.b64decode(screenshot_b64)
        img = Image.open(BytesIO(img_data))
        # Crop to URL bar region (top 80px, full width)
        url_bar = img.crop((0, 0, img.width, URL_BAR_HEIGHT))
        # Convert to bytes and hash
        buf = BytesIO()
        url_bar.save(buf, format='PNG')
        return hashlib.sha256(buf.getvalue()).hexdigest()[:16]
    except Exception as e:
        print(f"[ERROR] URL bar hash: {e}")
        return ""

def capture_via_websocket(vnc_host: str = "localhost", vnc_port: int = 5901) -> str | None:
    """
    Alternative: capture via VNC protocol directly.
    Requires vncdotool or similar library.
    """
    # Placeholder - would need vncdotool installed
    return None

