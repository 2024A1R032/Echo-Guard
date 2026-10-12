# Echo Guard: Global Codebase Rules

This file defines the strict constraints and architecture for the Echo Guard project. All future agents must consult this file before suggesting architecture changes.

## Tech Stack
*   **Backend & APIs**: Python 3.11+ (FastAPI, asyncpg, SQLAlchemy Async)
*   **Bioacoustic ML Engine**: TensorFlow Hub (Google YAMNet 521-class AudioSet model, 16kHz mono inference, 128-dim pgvector embeddings)
*   **Incident Multi-Agent Graph**: LangGraph StateGraph pipeline (`retrieve_context` -> `correlate_nearby` -> `draft_report` LLM -> `output`)
*   **Vector Database**: PostgreSQL with `pgvector` extension (128-dimensional cosine distance similarity search)
*   **Sensor Fusion & Clustering**: Spatial-temporal multi-sensor deduplication and triangulation engine
*   **Edge Telemetry Simulator**: C++ (memory-safe WinSock2 telemetry ingestion)
*   **Frontend Dashboard**: React.js, Vite, React-Leaflet (Geospatial Tactical Map), Tactical Canvas Radar, Web Audio API acoustic alarm synthesizer

## Verification Loop
All Python code must include `pytest` unit tests. You must autonomously run the local test command to verify your work before submitting changes.

## Architecture
Strict separation of concerns between the API routing layer, database models, LangGraph orchestration, and external ML inference logic.
