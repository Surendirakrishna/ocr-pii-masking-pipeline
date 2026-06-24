import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    words: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
  }>;
}

export async function performOCR(imageData: string | File): Promise<OCRResult> {
  const result = await Tesseract.recognize(imageData, 'eng', {
    logger: () => {},
  });

  const lines = result.data.lines.map((line) => ({
    text: line.text,
    confidence: line.confidence,
    bbox: line.bbox,
    words: line.words.map((w) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: w.bbox,
    })),
  }));

  const words = result.data.words.map((w) => ({
    text: w.text,
    confidence: w.confidence,
    bbox: w.bbox,
  }));

  return {
    text: result.data.text,
    confidence: result.data.confidence,
    words,
    lines,
  };
}
