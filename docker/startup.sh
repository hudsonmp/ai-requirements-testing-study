#!/bin/bash
set -e

# Kill any existing VNC sessions
vncserver -kill :1 2>/dev/null || true

# Start VNC server
vncserver :1 -geometry 1280x720 -depth 24 -localhost no

# Wait for VNC to initialize
sleep 3

# Start dbus (required for XFCE)
export DISPLAY=:1
eval $(dbus-launch --sh-syntax)

# Start XFCE desktop environment in background
startxfce4 &

# Wait for desktop to fully load
sleep 5

# Launch Chromium browser with all necessary flags
echo "Starting Chromium..."
/usr/bin/chromium-browser \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --disable-software-rasterizer \
  --disable-setuid-sandbox \
  --no-first-run \
  --disable-features=VizDisplayCompositor \
  --start-maximized \
  "https://www.google.com" &

echo "Chromium started with PID $!"

# Start noVNC websocket proxy (blocking)
websockify --web=/usr/share/novnc/ 6080 localhost:5901

