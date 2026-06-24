// Ollama OCR integration using fredrezones55/chandra-ocr-2 model

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

  // Ollama doesn't provide word-level confidence or bounding boxes like Tesseract
  // Return a simplified result structure
  return {
    text,
    confidence: 100, // Ollama doesn't provide confidence scores
    words: [], // Ollama doesn't provide word-level data
    lines: [], // Ollama doesn't provide line-level data
  };
}
