FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    tigervnc-standalone-server \
    tigervnc-common \
    novnc \
    websockify \
    chromium \
    openbox \
    tint2 \
    dbus-x11 \
    fonts-liberation \
    fonts-noto-color-emoji \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    procps \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

ENV DISPLAY=:1
ENV VNC_PORT=5901
ENV NOVNC_PORT=6080

# Set up VNC password
RUN mkdir -p ~/.vnc && \
    echo "password" | vncpasswd -f > ~/.vnc/passwd && \
    chmod 600 ~/.vnc/passwd

# Create xstartup for VNC - run openbox and tint2 panel
RUN printf '#!/bin/bash\ntint2 &\nexec openbox-session\n' > ~/.vnc/xstartup && \
    chmod +x ~/.vnc/xstartup

# Create Chromium launcher script
RUN printf '#!/bin/bash\n/usr/bin/chromium --no-sandbox --disable-dev-shm-usage --disable-gpu --no-first-run --start-maximized &\n' > /usr/local/bin/launch-chromium && \
    chmod +x /usr/local/bin/launch-chromium

# Configure tint2 panel with Chromium launcher
RUN mkdir -p ~/.config/tint2 && \
    printf 'panel_items = L\nlauncher_item_app = /usr/share/applications/chromium.desktop\n' > ~/.config/tint2/tint2rc

# Create Chromium desktop file
RUN mkdir -p /usr/share/applications && \
    printf '[Desktop Entry]\nName=Chromium\nExec=/usr/local/bin/launch-chromium\nIcon=chromium\nType=Application\n' > /usr/share/applications/chromium.desktop

COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

EXPOSE 5901 6080

CMD ["/startup.sh"]
