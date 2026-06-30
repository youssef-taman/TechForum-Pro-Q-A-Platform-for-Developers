from fastapi import APIRouter
from app.schemas.embedding import EmbedRequest, EmbedResponse
from app.core.models import ModelRegistry

router = APIRouter()

@router.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    vector = ModelRegistry.duplicate_model.encode(req.text).tolist()
    return EmbedResponse(embedding=vector)