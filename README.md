# Requirements Analysis Tool

Research tool for documenting user interactions with web applications via browser-in-browser recording.

## Setup

### 1. Environment
```bash
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### 2. Docker (VNC Server)
```bash
docker-compose up -d
```

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Open http://localhost:3000
2. VNC session loads in center panel (password: `password`)
3. Navigate to target site (e.g., Amazon) in VNC browser
4. Interactions auto-captured and analyzed via Gemini API
5. Left panel: Research notes (markdown)
6. Right panel: Interaction flowchart (auto-updated)

## Architecture

| Component | Port | Purpose |
|-----------|------|---------|
| Frontend  | 3000 | React UI |
| Backend   | 8000 | FastAPI + WebSocket |
| noVNC     | 6080 | Browser-in-browser |
| VNC       | 5901 | TigerVNC server |
