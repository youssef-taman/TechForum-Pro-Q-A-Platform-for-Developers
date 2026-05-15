
CREATE INDEX idx_threads_hnsw_embedding
ON thread_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
SET hnsw.ef_search = 60;