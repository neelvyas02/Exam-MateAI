import pdf from 'pdf-parse';
import { logger } from '../../infrastructure/logging/logger.js';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PdfExtractionResult {
  fullText: string;
  pageCount: number;
  pages: ExtractedPage[];
  info?: any;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const pages: ExtractedPage[] = [];

  let currentPageNumber = 0;

  const pagerRender = (pageData: any) => {
    return pageData.getTextContent().then((textContent: any) => {
      currentPageNumber++;
      let lastY: number | null = null;
      let text = '';

      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      pages.push({
        pageNumber: currentPageNumber,
        text: text.trim(),
      });

      return text;
    });
  };

  try {
    const data = await pdf(buffer, {
      pagerender: pagerRender,
    });

    // If custom pagerender didn't populate pages properly (e.g. single page or format mismatch)
    if (pages.length === 0 && data.text) {
      pages.push({
        pageNumber: 1,
        text: data.text.trim(),
      });
    }

    return {
      fullText: data.text || '',
      pageCount: data.numpages || pages.length || 1,
      pages,
      info: data.info,
    };
  } catch (err: any) {
    logger.error({ error: err.message }, '[PDF Parser] Failed to parse PDF with pagerender, trying default extraction');
    // Simple fallback
    try {
      const simpleData = await pdf(buffer);
      return {
        fullText: simpleData.text || '',
        pageCount: simpleData.numpages || 1,
        pages: [
          {
            pageNumber: 1,
            text: simpleData.text || '',
          },
        ],
        info: simpleData.info,
      };
    } catch (fallbackErr: any) {
      logger.error({ error: fallbackErr.message }, '[PDF Parser Fallback] Complete extraction failure');
      throw new Error(`Unable to extract text from PDF: ${fallbackErr.message}`);
    }
  }
}
