"""
One-time database setup for EchoGuard.

Enables the pgvector extension and creates the tables the backend needs.
Safe to run more than once.

Run from the backend/ folder with the venv active:
    python init_db.py
"""
import asyncio

from sqlalchemy import text

from app.db.database import Base, engine
from app.models import alert  # noqa: F401  (importing registers the threat_alerts table)


async def main():
    try:
        async with engine.begin() as connection:
            await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await connection.run_sync(Base.metadata.create_all)
    except Exception as error:  # noqa: BLE001 - show a plain-language hint for any connection problem
        print("Could not set up the database:")
        print(f"  {error}")
        print()
        if "permission denied to create extension" in str(error):
            print("Enabling pgvector needs a database administrator, once. Run this, then run init_db.py again:")
            print('  psql -U postgres -d echoguard -c "CREATE EXTENSION IF NOT EXISTS vector;"')
        else:
            print("Check that PostgreSQL is running and that backend/.env (or the defaults in")
            print("app/core/config.py) match your database name, user, password and server.")
        raise SystemExit(1)
    finally:
        await engine.dispose()

    print("Database ready: pgvector enabled and the threat_alerts table created.")


if __name__ == "__main__":
    asyncio.run(main())
