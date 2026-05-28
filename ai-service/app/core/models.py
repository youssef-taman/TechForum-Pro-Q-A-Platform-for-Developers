import torch
import joblib
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from huggingface_hub import hf_hub_download
from app.core.config import settings

class ModelRegistry:
    tagger_model: AutoModelForSequenceClassification = None
    tagger_tokenizer: AutoTokenizer = None
    mlb = None
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    @classmethod
    def load_all(cls):
        print("Loading tagger...")
        cls.tagger_tokenizer = AutoTokenizer.from_pretrained(
            settings.TAGGER_MODEL_ID,
            token=settings.HF_TOKEN
        )
        cls.tagger_model = AutoModelForSequenceClassification.from_pretrained(
            settings.TAGGER_MODEL_ID,
            token=settings.HF_TOKEN
        )
        cls.tagger_model.to(cls.device)
        cls.tagger_model.eval()

        mlb_path = hf_hub_download(
            repo_id=settings.TAGGER_MODEL_ID,
            filename="mlb.pkl",
            token=settings.HF_TOKEN
        )
        cls.mlb = joblib.load(mlb_path)