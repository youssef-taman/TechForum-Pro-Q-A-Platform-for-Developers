from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HF_TOKEN: str
    TAGGER_MODEL_ID: str = "ahmedosama2003/techforum-tagger"
    TAGGER_THRESHOLD: float = 0.6
    TAGGER_MAX_LENGTH: int = 512

    class Config:
        env_file = ".env"

settings = Settings()