import { describe, expect, it } from 'vitest';
import { createDocumentChunks } from '../src/modules/document-processing/chunker.js';

describe('Document Chunker', () => {
  it('should preserve page numbers and format headings correctly', () => {
    const sections = [
      { unitNumber: 1, sectionRef: 'Page 1', content: 'This is page one introductory content on computer networking.' },
      { unitNumber: 2, sectionRef: 'Page 2', content: 'This is page two detailing the transport layer and TCP protocol.' },
    ];

    const chunks = createDocumentChunks(sections, 1000, 200);

    expect(chunks.length).toBe(2);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].sectionRef).toBe('Page 1');
    expect(chunks[0].chunkText).toContain('--- Page 1 ---');
    expect(chunks[0].chunkText).toContain('introductory content');

    expect(chunks[1].pageNumber).toBe(2);
    expect(chunks[1].sectionRef).toBe('Page 2');
    expect(chunks[1].chunkText).toContain('--- Page 2 ---');
    expect(chunks[1].chunkText).toContain('transport layer');
  });

  it('should split long pages with configurable overlap', () => {
    const longText = 'word '.repeat(300); // ~1500 chars
    const sections = [{ unitNumber: 1, sectionRef: 'Page 1', content: longText }];

    const chunks = createDocumentChunks(sections, 500, 100);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.pageNumber).toBe(1);
      expect(chunk.chunkText).toContain('--- Page 1 ---');
    }
  });
});
