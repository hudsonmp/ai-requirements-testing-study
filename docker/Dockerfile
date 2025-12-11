FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    tigervnc-standalone-server \
    tigervnc-common \
    novnc \
    websockify \
    chromium \
    openbox \
    dbus-x11 \
    fonts-liberation \
    fonts-noto-color-emoji \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

ENV DISPLAY=:1
ENV VNC_PORT=5901
ENV NOVNC_PORT=6080

# Set up VNC password
RUN mkdir -p ~/.vnc && \
    echo "password" | vncpasswd -f > ~/.vnc/passwd && \
    chmod 600 ~/.vnc/passwd

# Create xstartup for VNC - just run openbox
RUN printf '#!/bin/bash\nexec openbox-session\n' > ~/.vnc/xstartup && \
    chmod +x ~/.vnc/xstartup

COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

EXPOSE 5901 6080

CMD ["/startup.sh"]
