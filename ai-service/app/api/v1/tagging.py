import torch
from fastapi import APIRouter
from app.schemas.tagging import TagRequest, TagResponse
from app.core.models import ModelRegistry
from app.core.config import settings

router = APIRouter()

@router.post("/tags", response_model=TagResponse)
def predict_tags(req: TagRequest):
    text = f"{req.title} {req.body}"
    inputs = ModelRegistry.tagger_tokenizer(
        text, req.code,
        return_tensors="pt",
        truncation=True,
        max_length=settings.TAGGER_MAX_LENGTH
    ).to(ModelRegistry.device)

    with torch.no_grad():
        logits = ModelRegistry.tagger_model(**inputs).logits
        probs = torch.sigmoid(logits.squeeze().cpu())

    predictions = (probs > settings.TAGGER_THRESHOLD).int().numpy()
    tags = ModelRegistry.mlb.inverse_transform(predictions.reshape(1, -1))

    return TagResponse(tags=list(tags[0]))