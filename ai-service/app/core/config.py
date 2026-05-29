from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HF_TOKEN: str
    DUPLICATE_MODEL_ID: str = "ahmedosama2003/techforum-duplicate-detector"
    TAGGER_MODEL_ID: str = "ahmedosama2003/techforum-tagger"
    DUPLICATE_MAX_SEQ_LENGTH: int = 256
    TAGGER_THRESHOLD: float = 0.6
    TAGGER_MAX_LENGTH: int = 512

    class Config:
        env_file = ".env"

settings = Settings()