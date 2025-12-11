#!/bin/bash

# Kill any existing VNC sessions
vncserver -kill :1 2>/dev/null || true
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1 2>/dev/null || true

# Start VNC server (this runs xstartup which launches openbox)
vncserver :1 -geometry 1280x720 -depth 24

# Wait for VNC/X to initialize
sleep 3

# Disable terminal bell
DISPLAY=:1 xset b off

# Launch Chromium
echo "Starting Chromium..."
DISPLAY=:1 /usr/bin/chromium \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --disable-software-rasterizer \
  --no-first-run \
  --disable-features=VizDisplayCompositor \
  --start-maximized \
  "https://www.google.com" &

echo "Chromium started with PID $!"

# Start noVNC websocket proxy (blocking)
websockify --web=/usr/share/novnc/ 6080 localhost:5901
