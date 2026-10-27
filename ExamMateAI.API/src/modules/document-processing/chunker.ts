import { ExtractedSection } from './document-extractor.js';

export interface ChunkItem {
  chunkIndex: number;
  chunkText: string;
  pageNumber: number;
  sectionRef: string;
}

export function createDocumentChunks(
  sections: ExtractedSection[],
  chunkSize: number = 1000,
  overlap: number = 200
): ChunkItem[] {
  const chunks: ChunkItem[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const text = section.content?.trim();
    if (!text) continue;

    const sectionHeader = `--- ${section.sectionRef} ---`;

    if (text.length <= chunkSize) {
      chunks.push({
        chunkIndex: chunkIndex++,
        chunkText: `${sectionHeader}\n${text}`,
        pageNumber: section.unitNumber,
        sectionRef: section.sectionRef,
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      const length = Math.min(chunkSize, text.length - start);
      const subText = text.substring(start, start + length).trim();

      if (subText.length > 0) {
        chunks.push({
          chunkIndex: chunkIndex++,
          chunkText: `${sectionHeader}\n${subText}`,
          pageNumber: section.unitNumber,
          sectionRef: section.sectionRef,
        });
      }

      start += chunkSize - overlap;
      if (start <= 0 || start >= text.length) break;
    }
  }

  return chunks;
}
