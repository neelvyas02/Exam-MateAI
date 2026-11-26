import { embeddingService } from '../infrastructure/ai/embedding.service.js';
import { prisma } from '../infrastructure/database/prisma.js';
import { logger } from '../infrastructure/logging/logger.js';

export async function backfillEmbeddings() {
  console.log('[Backfill] Starting embedding generation for un-embedded chunks...');

  const chunksWithoutEmbeddings = await prisma.documentChunk.findMany({
    where: {
      OR: [
        { embeddingGenerated: false },
        { embeddingJson: null },
      ],
    },
    select: {
      id: true,
      documentId: true,
      chunkIndex: true,
      chunkText: true,
    },
    orderBy: [
      { documentId: 'asc' },
      { chunkIndex: 'asc' },
    ],
  });

  console.log(`[Backfill] Found ${chunksWithoutEmbeddings.length} chunks needing embeddings.`);
  if (chunksWithoutEmbeddings.length === 0) {
    console.log('[Backfill] All chunks already have embeddings.');
    return;
  }

  const batchSize = 25;
  let processed = 0;

  for (let i = 0; i < chunksWithoutEmbeddings.length; i += batchSize) {
    const batch = chunksWithoutEmbeddings.slice(i, i + batchSize);
    const texts = batch.map((c) => c.chunkText);

    try {
      const embeddings = await embeddingService.generateChunkEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const emb = embeddings[j];
        if (!emb || emb.length === 0) continue;

        const vectorStr = `[${emb.join(',')}]`;
        const embJson = JSON.stringify(emb);

        await prisma.documentChunk.update({
          where: { id: chunk.id },
          data: {
            embeddingGenerated: true,
            embeddingModel: embeddingService.embeddingModel,
            embeddingJson: embJson,
          },
        });

        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "DocumentChunk" SET embedding = '${vectorStr}'::vector WHERE id = '${chunk.id}'`
          );
        } catch (pgErr: any) {
          logger.warn({ error: pgErr.message }, '[Backfill] pgvector raw update failed, embeddingJson kept.');
        }
      }

      processed += batch.length;
      console.log(`[Backfill] Processed ${processed}/${chunksWithoutEmbeddings.length} chunks...`);

      // Sleep a bit between batches to be gentle on API rate limit
      if (i + batchSize < chunksWithoutEmbeddings.length) {
        await new Promise((res) => setTimeout(res, 500));
      }
    } catch (batchErr: any) {
      console.error(`[Backfill] Failed batch starting at index ${i}:`, batchErr.message);
      // Wait longer on error before continuing
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  const finalCount = await prisma.documentChunk.count({
    where: { embeddingGenerated: true },
  });
  console.log(`[Backfill] Completed! Total chunks with embeddings: ${finalCount}`);
}

// Allow standalone execution
if (process.argv[1]?.includes('backfill-embeddings')) {
  backfillEmbeddings()
    .catch(console.error)
    .finally(() => process.exit(0));
}
