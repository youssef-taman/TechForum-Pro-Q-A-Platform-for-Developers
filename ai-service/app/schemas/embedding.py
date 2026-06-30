from pydantic import BaseModel
from typing import List

class EmbedRequest(BaseModel):
    text: str

    class Config:
        json_schema_extra = {
            "example": {"text": "How to sort a list in Python?"}
        }

class EmbedResponse(BaseModel):
    embedding: List[float]