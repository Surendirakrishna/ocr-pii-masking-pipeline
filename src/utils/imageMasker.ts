import type { PIIDetection } from './piiEngine';

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  charStart: number;
  charEnd: number;
}

export interface MaskedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  piiType: string;
  piiLabel: string;
  originalText: string;
}

/**
 * Reconstructs the full text from OCR lines and words, tracking
 * EXACT character positions for each word.
 *
 * Key: we NEVER use Tesseract's full text. We build our own so
 * character positions are guaranteed to align with word boxes.
 */
export interface OCRLineInfo {
  charStart: number;
  charEnd: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export function buildTextFromOCR(
  rawLines: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    words: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
  }>
): { fullText: string; allWords: OCRWord[]; lineInfos: OCRLineInfo[] } {
  const allWords: OCRWord[] = [];
  const lineInfos: OCRLineInfo[] = [];
  let fullText = '';

  for (let li = 0; li < rawLines.length; li++) {
    const rawLine = rawLines[li];

    // Filter to non-empty words, trim each word
    const meaningful = rawLine.words
      .map(w => ({ ...w, text: w.text.trimEnd() }))
      .filter(w => w.text.trim().length > 0);

    if (meaningful.length === 0) {
      // Empty line — just add newline
      fullText += '\n';
      continue;
    }

    const lineCharStart = fullText.length;

    for (let wi = 0; wi < meaningful.length; wi++) {
      const rawWord = meaningful[wi];
      const wordText = rawWord.text;

      const charStart = fullText.length;
      fullText += wordText;
      const charEnd = fullText.length;

      allWords.push({
        text: wordText,
        confidence: rawWord.confidence,
        bbox: rawWord.bbox,
        charStart,
        charEnd,
      });

      // Space between words on the same line
      if (wi < meaningful.length - 1) {
        fullText += ' ';
      }
    }

    const lineCharEnd = fullText.length;

    lineInfos.push({
      charStart: lineCharStart,
      charEnd: lineCharEnd,
      bbox: rawLine.bbox,
    });

    // Newline between lines (not after last line)
    if (li < rawLines.length - 1) {
      fullText += '\n';
    }
  }

  return { fullText, allWords, lineInfos };
}

/**
 * Given PII detections (with character positions) and OCR words with
 * character positions, find the image regions that correspond to PII.
 */
export function findPIIRegions(
  detections: PIIDetection[],
  words: OCRWord[],
  lineInfos: OCRLineInfo[] = []
): MaskedRegion[] {
  const regions: MaskedRegion[] = [];

  for (const detection of detections) {
    // Strategy 1: Match by overlapping character ranges
    let matchingWords = words.filter(
      (w) => w.charStart < detection.end && w.charEnd > detection.start
    );

    // Strategy 2: If no overlap match, try substring search
    if (matchingWords.length === 0) {
      const detValue = detection.value.trim().toLowerCase();
      matchingWords = words.filter((w) => {
        const wText = w.text.trim().toLowerCase();
        return wText.length > 1 && (
          detValue.includes(wText) ||
          wText.includes(detValue)
        );
      });
    }

    // Strategy 3: Try finding individual words from the detection value
    if (matchingWords.length === 0) {
      const valueParts = detection.value.trim().split(/\s+/);
      matchingWords = words.filter((w) => {
        const wLower = w.text.trim().toLowerCase();
        return valueParts.some(vp => vp.toLowerCase() === wLower && wLower.length > 1);
      });
    }

    // Strategy 4: Fall back to line-level bounding box
    if (matchingWords.length === 0 && lineInfos.length > 0) {
      const matchingLines = lineInfos.filter(
        (l) => l.charStart < detection.end && l.charEnd > detection.start
      );
      if (matchingLines.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const l of matchingLines) {
          minX = Math.min(minX, l.bbox.x0);
          minY = Math.min(minY, l.bbox.y0);
          maxX = Math.max(maxX, l.bbox.x1);
          maxY = Math.max(maxY, l.bbox.y1);
        }
        const pad = 10;
        regions.push({
          x: minX - pad,
          y: minY - pad,
          width: maxX - minX + pad * 2,
          height: maxY - minY + pad * 2,
          piiType: detection.type,
          piiLabel: detection.label,
          originalText: detection.value,
        });
        continue;
      }
    }

    if (matchingWords.length === 0) continue;

    // Also include "Dr." / "Dr" prefix word if detection is a doctor/consultant name
    if (detection.type === 'CONSULTANT' || detection.type === 'DOCTOR_NAME') {
      const firstMatch = matchingWords[0];
      const idx = words.indexOf(firstMatch);
      if (idx > 0) {
        const prev = words[idx - 1];
        if (prev.text.trim().match(/^Dr\.?$/i)) {
          matchingWords.unshift(prev);
        }
      }
    }

    const merged = mergeWordBoxes(matchingWords);
    regions.push({
      ...merged,
      piiType: detection.type,
      piiLabel: detection.label,
      originalText: detection.value,
    });
  }

  return mergeOverlappingRegions(regions);
}

function mergeWordBoxes(words: OCRWord[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of words) {
    if (w.bbox.x0 < minX) minX = w.bbox.x0;
    if (w.bbox.y0 < minY) minY = w.bbox.y0;
    if (w.bbox.x1 > maxX) maxX = w.bbox.x1;
    if (w.bbox.y1 > maxY) maxY = w.bbox.y1;
  }
  // Generous padding to fully cover text
  const pad = 8;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

function mergeOverlappingRegions(regions: MaskedRegion[]): MaskedRegion[] {
  if (regions.length <= 1) return regions;

  const result: MaskedRegion[] = [...regions];
  let changed = true;
  let iters = 0;

  while (changed && iters < 20) {
    changed = false;
    iters++;
    const next: MaskedRegion[] = [];

    for (let i = 0; i < result.length; i++) {
      let merged = false;
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        if (
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y
        ) {
          const nx = Math.min(a.x, b.x);
          const ny = Math.min(a.y, b.y);
          next.push({
            x: nx,
            y: ny,
            width: Math.max(a.x + a.width, b.x + b.width) - nx,
            height: Math.max(a.y + a.height, b.y + b.height) - ny,
            piiType: a.piiType,
            piiLabel: `${a.piiLabel} + ${b.piiLabel}`,
            originalText: `${a.originalText} | ${b.originalText}`,
          });
          result.splice(j, 1);
          changed = true;
          merged = true;
          break;
        }
      }
      if (!merged) next.push(result[i]);
    }

    result.length = 0;
    result.push(...next);
  }

  return result;
}

/**
 * Draws the original image on a canvas, then overlays redaction
 * rectangles over detected PII regions. Returns a data URL.
 */
export function drawMaskedImage(
  imageSrc: string,
  regions: MaskedRegion[],
  style: 'solid' | 'pixelate' | 'blur' | 'label'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }

      // Draw original
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      const W = canvas.width;

      for (const region of regions) {
        const rx = Math.max(0, Math.round(region.x));
        const ry = Math.max(0, Math.round(region.y));
        const rw = Math.min(Math.round(region.width), canvas.width - rx);
        const rh = Math.min(Math.round(region.height), canvas.height - ry);
        if (rw <= 0 || rh <= 0) continue;

        switch (style) {
          case 'solid': {
            ctx.fillStyle = '#000';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = Math.max(2, W / 400);
            ctx.strokeRect(rx, ry, rw, rh);
            break;
          }
          case 'pixelate': {
            applyPixelate(ctx, rx, ry, rw, rh, W);
            ctx.strokeStyle = 'rgba(239,68,68,0.5)';
            ctx.lineWidth = Math.max(1, W / 600);
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.setLineDash([]);
            break;
          }
          case 'blur': {
            applyBlur(ctx, rx, ry, rw, rh);
            ctx.strokeStyle = 'rgba(239,68,68,0.5)';
            ctx.lineWidth = Math.max(1, W / 600);
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.setLineDash([]);
            break;
          }
          case 'label': {
            // Semi-transparent red overlay
            ctx.fillStyle = 'rgba(220, 38, 38, 0.82)';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = Math.max(2, W / 400);
            ctx.strokeRect(rx, ry, rw, rh);

            // Label tag above region
            const fontSize = Math.max(14, Math.round(W / 50));
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            const labelText = `🔒 ${region.piiLabel}`;
            const tm = ctx.measureText(labelText);
            const labelH = fontSize + 12;
            const labelW = tm.width + 18;
            const labelX = rx;
            const labelY = ry - labelH - 4;

            if (labelY > 0) {
              // Rounded label background
              ctx.fillStyle = '#991b1b';
              roundRect(ctx, labelX, labelY, labelW, labelH, 4);
              ctx.fill();
              ctx.strokeStyle = '#dc2626';
              ctx.lineWidth = 1;
              roundRect(ctx, labelX, labelY, labelW, labelH, 4);
              ctx.stroke();
              ctx.fillStyle = '#fff';
              ctx.textBaseline = 'middle';
              ctx.fillText(labelText, labelX + 9, labelY + labelH / 2);
              ctx.textBaseline = 'alphabetic';
            }

            // Show masked text in center of region
            const maskText = getMaskText(region.piiType);
            ctx.font = `bold ${Math.max(11, Math.round(fontSize * 0.8))}px Arial, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(maskText, rx + rw / 2, ry + rh / 2);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
            break;
          }
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

function getMaskText(type: string): string {
  const map: Record<string, string> = {
    PATIENT_NAME: '[NAME]',
    CONSULTANT: '[CONSULTANT]',
    DOCTOR_NAME: '[DOCTOR]',
    WIFE_OF: '[W/O]',
    DAUGHTER_OF: '[D/O]',
    SON_OF: '[S/O]',
    OCCUPATION: '[OCCUPATION]',
    SEX: '[SEX]',
    ADDRESS: '[ADDRESS]',
    SSN: '[SSN]',
    AADHAAR: '[AADHAAR]',
    PHONE: '[PHONE]',
    MOBILE: '[MOBILE]',
    EMAIL: '[EMAIL]',
    DOB: '[DOB]',
    AGE: '[AGE]',
    MRN: '[MRN]',
    CREDIT_CARD: '[CARD]',
  };
  return map[type] || '[MASKED]';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function applyPixelate(
  ctx: CanvasRenderingContext2D,
  rx: number, ry: number, rw: number, rh: number,
  canvasW: number
) {
  const pixelSize = Math.max(8, Math.round(canvasW / 80));
  const imageData = ctx.getImageData(rx, ry, rw, rh);
  const data = imageData.data;

  for (let y = 0; y < rh; y += pixelSize) {
    for (let x = 0; x < rw; x += pixelSize) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < pixelSize && y + dy < rh; dy++) {
        for (let dx = 0; dx < pixelSize && x + dx < rw; dx++) {
          const idx = ((y + dy) * rw + (x + dx)) * 4;
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
        }
      }
      ctx.fillStyle = `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`;
      ctx.fillRect(rx + x, ry + y, pixelSize, pixelSize);
    }
  }
}

function applyBlur(
  ctx: CanvasRenderingContext2D,
  rx: number, ry: number, rw: number, rh: number
) {
  const tmp = document.createElement('canvas');
  const scale = 0.08;
  const sw = Math.max(2, Math.round(rw * scale));
  const sh = Math.max(2, Math.round(rh * scale));
  tmp.width = sw; tmp.height = sh;
  const tc = tmp.getContext('2d');
  if (!tc) return;

  // Multiple passes for stronger blur
  for (let pass = 0; pass < 3; pass++) {
    tc.clearRect(0, 0, sw, sh);
    tc.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(tmp, 0, 0, sw, sh, rx, ry, rw, rh);
  }
  ctx.imageSmoothingQuality = 'high';
}
