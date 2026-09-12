# Echo Guard: Global Codebase Rules

This file defines the strict constraints for the Echo Guard project. All future agents must consult this file before suggesting architecture changes.

## Tech Stack
*   Python 3.11 (FastAPI, asyncpg)
*   PostgreSQL with pgvector
*   C++ (memory-safe edge simulation)
*   React.js

## Verification Loop
All Python code must include `pytest` unit tests. You must autonomously run the local test command to verify your work before submitting changes.

## Architecture
Strict separation of concerns between the API routing layer, database models, and external ML inference logic.
