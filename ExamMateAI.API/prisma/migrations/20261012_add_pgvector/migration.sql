-- Enable pgvector extension on Supabase PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Add section reference, embedding metadata, and vector column
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "sectionRef" TEXT;
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT;
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingJson" TEXT;
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Create index for vector similarity search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'DocumentChunk' AND indexname = 'document_chunk_embedding_idx'
  ) THEN
    CREATE INDEX document_chunk_embedding_idx ON "DocumentChunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback if table is empty or ivfflat cannot be indexed yet
    NULL;
END $$;

-- Semantic similarity search PostgreSQL function for RAG retrieval
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id text,
  target_document_ids text[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  "documentId" text,
  "chunkIndex" int,
  "chunkText" text,
  "pageNumber" int,
  "sectionRef" text,
  "documentName" text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc."documentId",
    dc."chunkIndex",
    dc."chunkText",
    dc."pageNumber",
    dc."sectionRef",
    d."originalName" AS "documentName",
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM "DocumentChunk" dc
  JOIN "Document" d ON dc."documentId" = d.id
  WHERE d."userId" = user_id
    AND d."isDeleted" = false
    AND (target_document_ids IS NULL OR d.id = ANY(target_document_ids))
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
