from pydantic import BaseModel
from typing import List

class TagRequest(BaseModel):
    title: str
    body: str
    code: str = ""

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Segmentation fault in C++",
                "body": "Getting a segfault when freeing memory.",
                "code": "delete[] data;"
            }
        }

class TagResponse(BaseModel):
    tags: List[str]