from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

Base = declarative_base()

# Connection pooling strategy configured for high-concurrency C++ edge nodes.
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
