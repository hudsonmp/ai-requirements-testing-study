"""VNC framebuffer capture utility."""
import base64
import subprocess
from io import BytesIO

def capture_vnc_screenshot() -> str | None:
    """
    Capture VNC framebuffer and return as base64 PNG.
    Uses xwd/convert or vncsnapshot via the VNC server.
    Returns None if capture fails.
    """
    print("[VNC] Attempting to capture screenshot...")
    try:
        # Use subprocess to capture via xwd on the VNC display
        # This requires the VNC container to have xwd installed or we use vnc2png
        print("[VNC] Running docker exec command...")
        result = subprocess.run(
            ["docker", "exec", "ai-requirements-testing-study-vnc-1", 
             "sh", "-c", "DISPLAY=:1 import -window root png:-"],
            capture_output=True,
            timeout=5
        )
        print(f"[VNC] Docker exec returned code: {result.returncode}")
        if result.stderr:
            print(f"[VNC] stderr: {result.stderr.decode()}")
        if result.returncode == 0 and result.stdout:
            b64 = base64.b64encode(result.stdout).decode('utf-8')
            print(f"[VNC] ✓ Screenshot captured: {len(b64)} chars")
            return b64
        else:
            print(f"[VNC] ⚠ Command failed or no output")
    except subprocess.TimeoutExpired:
        print("[VNC] ✗ Capture timeout (>5s)")
    except FileNotFoundError:
        print("[VNC] ✗ Docker not available")
    except Exception as e:
        print(f"[VNC] ✗ Capture error: {e}")
        import traceback
        traceback.print_exc()
    return None

def capture_via_websocket(vnc_host: str = "localhost", vnc_port: int = 5901) -> str | None:
    """
    Alternative: capture via VNC protocol directly.
    Requires vncdotool or similar library.
    """
    # Placeholder - would need vncdotool installed
    return None

