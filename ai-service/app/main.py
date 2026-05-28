from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.models import ModelRegistry
from app.api.v1 import tagging

@asynccontextmanager
async def lifespan(app: FastAPI):
    ModelRegistry.load_all()
    yield

app = FastAPI(
    title="TechForum AI Service",
    version="1.0.0",
    lifespan=lifespan
)


app.include_router(tagging.router,   prefix="/api/v1", tags=["Tagging"])

@app.get("/health")
def health():
    return {"status": "ok"}