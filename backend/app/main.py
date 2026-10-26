import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import alerts, reports, incidents, audio, simulation
from app.core.config import settings
from app.services.audio_classifier import get_yamnet_classifier


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly initialize and verify YAMNet model on startup
    print("\n[ECHO-GUARD STARTUP] Initializing YAMNet Audio Classifier...", flush=True)
    classifier = get_yamnet_classifier()
    classifier._load_model()
    if classifier._is_loaded:
        print(f"[ECHO-GUARD STARTUP] Real YAMNet successfully loaded ({len(classifier._class_names)} classes). Status: ONLINE\n", flush=True)
    else:
        print(f"[ECHO-GUARD STARTUP WARNING] Real YAMNet is NOT loaded: {classifier.load_error}. Status: FALLBACK\n", file=sys.stderr, flush=True)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Bioacoustic edge AI threat detection & LangGraph tactical defense platform",
    lifespan=lifespan,
)

# CORS setup for React.js dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Telemetry & Threat Alerts API
app.include_router(
    alerts.router,
    prefix=f"{settings.API_V1_STR}/alerts",
    tags=["alerts"]
)

# Backward-compatibility alias for /telemetry
app.include_router(
    alerts.router,
    prefix=f"{settings.API_V1_STR}/telemetry",
    tags=["telemetry"]
)

# LangGraph Multi-Agent Tactical Incident Reports
app.include_router(
    reports.router,
    prefix=f"{settings.API_V1_STR}/reports",
    tags=["reports"]
)

# Spatial-Temporal Incident Clusters & Forensics
app.include_router(
    incidents.router,
    prefix=f"{settings.API_V1_STR}/incidents",
    tags=["incidents"]
)

# Real Audio Classification ML Pipeline
app.include_router(
    audio.router,
    tags=["audio"]
)

# Audio Drop Simulation: drop a real clip in the forest and let the nodes listen
app.include_router(
    simulation.router,
    tags=["simulation"]
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "EchoGuard Backend", "version": settings.VERSION}
