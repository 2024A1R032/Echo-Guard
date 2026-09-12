from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# Connection pooling strategy configured for high-concurrency C++ edge nodes.
# - pool_size: 100 concurrent connections baseline.
# - max_overflow: up to 50 additional temporary connections.
# - pool_timeout: wait up to 30s for a connection.
# - pool_recycle: refresh connections every 30 mins to avoid stale drops.
engine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    pool_size=100,
    max_overflow=50,
    pool_timeout=30,
    pool_recycle=1800,
    echo=False
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autoflush=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
