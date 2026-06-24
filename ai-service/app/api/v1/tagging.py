import numpy as np
import torch
from fastapi import APIRouter
from app.schemas.tagging import TagRequest, TagResponse
from app.core.models import ModelRegistry
from app.core.config import settings

router = APIRouter()

@router.post("/tags", response_model=TagResponse)
def predict_tags(req: TagRequest):
    text = f"{req.title.strip()} {req.body.strip()}"
    code_block = req.code if req.code else ""
    

    inputs = ModelRegistry.tagger_tokenizer(
        text, 
        code_block,
        return_tensors="pt",
        truncation=True,
        max_length=settings.TAGGER_MAX_LENGTH
    ).to(ModelRegistry.device)

    with torch.no_grad():
        logits = ModelRegistry.tagger_model(**inputs).logits
        probs = torch.sigmoid(logits.squeeze(0)).cpu().numpy()

    predictions = (probs >= ModelRegistry.thresholds).astype(int)
    tags = list(ModelRegistry.mlb.inverse_transform(predictions.reshape(1, -1))[0])

    if not tags:
        tags = [ModelRegistry.mlb.classes_[i] for i in np.argsort(probs)[::-1][:3]]

    prob_map = {tag_name: prob for tag_name, prob in zip(ModelRegistry.mlb.classes_, probs)}
    sorted_tags = sorted(tags, key=lambda t: -prob_map[t])

    return TagResponse(tags=sorted_tags)
