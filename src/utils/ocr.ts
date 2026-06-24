/**
 * Chandra-OCR-2 OCR Engine (via Ollama)
 * 
 * This module handles text extraction from images using the fredrezones55/chandra-ocr-2 model
 * via a local Ollama server running on port 11434.
 * 
 * Chandra-OCR-2 provides superior accuracy for:
 * - Medical documents
 * - Legal documents
 * - Government forms
 * - Complex layouts
 * 
 * Requirements:
 * - Ollama installed and running: ollama serve
 * - Model pulled: ollama pull fredrezones55/chandra-ocr-2
 */

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
  // Convert image to base64 if it's a File object
  let base64Image: string;
  if (imageData instanceof File) {
    base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageData);
    });
  } else {
    base64Image = imageData;
  }

  // Call Ollama API with the OCR model
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'fredrezones55/chandra-ocr-2',
      prompt: 'Extract all text from this image. Return only the text content.',
      images: [base64Image.split(',')[1]], // Remove data:image/...;base64, prefix
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const result = await response.json();
  const text = result.response || '';

  // Chandra-OCR-2 returns plain text without granular word-level data
  // This is sufficient for PII detection and masking purposes
  return {
    text,
    confidence: 100,
    words: [],
    lines: [],
  };
}
