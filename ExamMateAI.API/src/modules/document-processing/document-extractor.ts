import mammoth from 'mammoth';
import path from 'path';
import { BadRequestError } from '../../common/errors.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { extractTextFromPdf } from './pdf-parser.js';

export interface ExtractedSection {
  unitNumber: number;
  sectionRef: string; // e.g. "Page 1", "Slide 3", "Section 2"
  content: string;
}

export interface DocumentExtractionResult {
  fullText: string;
  unitCount: number;
  sections: ExtractedSection[];
  title?: string;
  author?: string;
}

export class DocumentExtractor {
  public static async extract(buffer: Buffer, originalName: string): Promise<DocumentExtractionResult> {
    const ext = path.extname(originalName).toLowerCase();

    switch (ext) {
      case '.pdf':
        return await this.extractPdf(buffer);
      case '.docx':
      case '.doc':
        return await this.extractDocx(buffer);
      case '.txt':
      case '.md':
      case '.markdown':
        return this.extractTextFile(buffer, originalName);
      case '.csv':
        return this.extractCsv(buffer);
      case '.pptx':
      case '.ppt':
        return this.extractPptx(buffer);
      default:
        throw new BadRequestError(`Unsupported document format: ${ext}`);
    }
  }

  private static async extractPdf(buffer: Buffer): Promise<DocumentExtractionResult> {
    const pdfData = await extractTextFromPdf(buffer);
    const sections: ExtractedSection[] = pdfData.pages.map((p) => ({
      unitNumber: p.pageNumber,
      sectionRef: `Page ${p.pageNumber}`,
      content: p.text,
    }));

    return {
      fullText: pdfData.fullText,
      unitCount: pdfData.pageCount,
      sections,
      title: pdfData.info?.Title,
      author: pdfData.info?.Author,
    };
  }

  private static async extractDocx(buffer: Buffer): Promise<DocumentExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value || '';

      // Split paragraphs into sections
      const paragraphs = rawText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const sections: ExtractedSection[] = [];
      let currentSectionText = '';
      let sectionIndex = 1;

      for (const para of paragraphs) {
        if (currentSectionText.length + para.length > 1200 && currentSectionText.length > 0) {
          sections.push({
            unitNumber: sectionIndex,
            sectionRef: `Section ${sectionIndex}`,
            content: currentSectionText.trim(),
          });
          sectionIndex++;
          currentSectionText = para + '\n\n';
        } else {
          currentSectionText += para + '\n\n';
        }
      }

      if (currentSectionText.trim().length > 0) {
        sections.push({
          unitNumber: sectionIndex,
          sectionRef: `Section ${sectionIndex}`,
          content: currentSectionText.trim(),
        });
      }

      if (sections.length === 0) {
        sections.push({
          unitNumber: 1,
          sectionRef: 'Section 1',
          content: rawText,
        });
      }

      return {
        fullText: rawText,
        unitCount: sections.length,
        sections,
      };
    } catch (err: any) {
      logger.error({ error: err.message }, '[DocumentExtractor] DOCX extraction error');
      throw new BadRequestError(`Failed to parse DOCX document: ${err.message}`);
    }
  }

  private static extractTextFile(buffer: Buffer, filename: string): DocumentExtractionResult {
    const content = buffer.toString('utf-8');
    // Split by markdown headers (# Header) or double newlines
    const chunks = content
      .split(/(?=^#{1,3}\s)/m)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const sections: ExtractedSection[] = chunks.map((chunk, idx) => {
      const firstLine = chunk.split('\n')[0].replace(/^#+\s*/, '').trim();
      const title = firstLine.length > 0 && firstLine.length < 40 ? firstLine : `Section ${idx + 1}`;
      return {
        unitNumber: idx + 1,
        sectionRef: title,
        content: chunk,
      };
    });

    if (sections.length === 0) {
      sections.push({
        unitNumber: 1,
        sectionRef: 'Section 1',
        content,
      });
    }

    return {
      fullText: content,
      unitCount: sections.length,
      sections,
      title: path.parse(filename).name,
    };
  }

  private static extractCsv(buffer: Buffer): DocumentExtractionResult {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const header = lines[0] || '';

    const sections: ExtractedSection[] = [];
    const batchSize = 25;

    for (let i = 1; i < lines.length; i += batchSize) {
      const slice = lines.slice(i, i + batchSize);
      const content = `Headers: ${header}\n` + slice.join('\n');
      const unitNumber = Math.floor(i / batchSize) + 1;
      sections.push({
        unitNumber,
        sectionRef: `Rows ${i}-${Math.min(i + batchSize - 1, lines.length - 1)}`,
        content,
      });
    }

    if (sections.length === 0) {
      sections.push({
        unitNumber: 1,
        sectionRef: 'Data Sheet',
        content: text,
      });
    }

    return {
      fullText: text,
      unitCount: sections.length,
      sections,
    };
  }

  private static extractPptx(buffer: Buffer): DocumentExtractionResult {
    // PPTX XML slide text extraction
    const raw = buffer.toString('binary');
    const slideMatches = raw.match(/<a:t>([^<]+)<\/a:t>/g);

    if (slideMatches && slideMatches.length > 0) {
      const texts = slideMatches.map((m) => m.replace(/<\/?a:t>/g, '').trim()).filter(Boolean);
      const fullText = texts.join(' ');

      // Split into approximate slides (e.g. 15 text elements per slide)
      const sections: ExtractedSection[] = [];
      const perSlide = 15;
      for (let i = 0; i < texts.length; i += perSlide) {
        const slideNum = Math.floor(i / perSlide) + 1;
        const slideText = texts.slice(i, i + perSlide).join(' ');
        sections.push({
          unitNumber: slideNum,
          sectionRef: `Slide ${slideNum}`,
          content: slideText,
        });
      }

      return {
        fullText,
        unitCount: sections.length,
        sections,
      };
    }

    // Fallback: clean ASCII printable characters
    const cleanAscii = buffer
      .toString('utf-8')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return {
      fullText: cleanAscii,
      unitCount: 1,
      sections: [{ unitNumber: 1, sectionRef: 'Presentation', content: cleanAscii }],
    };
  }
}
