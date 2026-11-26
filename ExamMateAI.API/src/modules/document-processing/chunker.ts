import { ExtractedSection } from './document-extractor.js';

export interface ChunkItem {
  chunkIndex: number;
  chunkText: string;
  pageNumber: number;
  sectionRef: string;
}

/**
 * Cleans raw text for optimal embedding and RAG retrieval
 */
export function cleanChunkText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\0/g, '') // Strip null bytes
    .replace(/\r\n/g, '\n') // Normalize Windows newlines
    .replace(/[ \t]+/g, ' ') // Collapse multiple spaces/tabs
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
    .trim();
}

/**
 * Creates clean, non-redundant document chunks preserving unit and page boundaries
 */
export function createDocumentChunks(
  sections: ExtractedSection[],
  chunkSize: number = 1000,
  overlap: number = 200
): ChunkItem[] {
  const chunks: ChunkItem[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const rawText = cleanChunkText(section.content || '');
    if (!rawText || rawText.length < 15) continue; // Skip meaningless or empty content

    const sectionHeader = `--- ${section.sectionRef} ---`;

    if (rawText.length <= chunkSize) {
      chunks.push({
        chunkIndex: chunkIndex++,
        chunkText: `${sectionHeader}\n${rawText}`,
        pageNumber: section.unitNumber,
        sectionRef: section.sectionRef,
      });
      continue;
    }

    let start = 0;
    while (start < rawText.length) {
      const length = Math.min(chunkSize, rawText.length - start);
      const subText = rawText.substring(start, start + length).trim();

      if (subText.length >= 20) {
        chunks.push({
          chunkIndex: chunkIndex++,
          chunkText: `${sectionHeader}\n${subText}`,
          pageNumber: section.unitNumber,
          sectionRef: section.sectionRef,
        });
      }

      start += chunkSize - overlap;
      if (start <= 0 || start >= rawText.length) break;
    }
  }

  return chunks;
}
