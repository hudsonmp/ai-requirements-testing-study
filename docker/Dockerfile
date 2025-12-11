FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    tigervnc-standalone-server \
    tigervnc-common \
    novnc \
    websockify \
    chromium-browser \
    xfce4 \
    xfce4-terminal \
    dbus-x11 \
    fonts-liberation \
    fonts-noto-color-emoji \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

ENV DISPLAY=:1
ENV VNC_PORT=5901
ENV NOVNC_PORT=6080

RUN mkdir -p ~/.vnc && \
    echo "password" | vncpasswd -f > ~/.vnc/passwd && \
    chmod 600 ~/.vnc/passwd

# Set Chromium as default browser
RUN mkdir -p ~/.config/xfce4 && \
    echo "[Default Applications]" > ~/.config/xfce4/helpers.rc && \
    echo "WebBrowser=chromium" >> ~/.config/xfce4/helpers.rc

COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

EXPOSE 5901 6080

CMD ["/startup.sh"]

