import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.db.database import get_db as get_db_app
import app.core.database as core_db
import app.db.database as db_database
from typing import AsyncGenerator
from unittest.mock import AsyncMock

@pytest_asyncio.fixture
async def mock_db_session():
    mock_session = AsyncMock(spec=AsyncSession)
    yield mock_session

@pytest_asyncio.fixture
async def async_client(mock_db_session) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield mock_db_session

    app.dependency_overrides[get_db_app] = override_get_db
    app.dependency_overrides[core_db.get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
