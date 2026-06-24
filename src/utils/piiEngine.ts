export interface PIIDetection {
  type: string;
  label: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  source: 'regex' | 'ner';
}

export interface MaskedResult {
  maskedText: string;
  detections: PIIDetection[];
  maskMap: Array<{ original: string; masked: string; type: string }>;
}

// ── NER Patterns (context-based — these detect the VALUE after a keyword) ──
// Order matters: more specific patterns first to claim ranges first.
const NER_PATTERNS: Array<{
  type: string;
  label: string;
  pattern: RegExp;
  confidence: number;
}> = [
  {
    type: 'CONSULTANT',
    label: 'Consultant',
    // "Consultant: Dr. Name" or "Consultant: Name"
    pattern: /(?:Consultant|Cons\.?|Ref\.?\s*Doctor|Attending)\s*[:;.\-]?\s*(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g,
    confidence: 0.85,
  },
  {
    type: 'PATIENT_NAME',
    label: 'Patient Name',
    // "Name: John Smith" or "Patient Name: John Smith" or "Pt. Name: John Smith"
    pattern: /(?:Patient\s*(?:Name)?|Name|Pt\.?\s*Name)\s*[:;.\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g,
    confidence: 0.9,
  },
  {
    // W/O = Wife Of  — "W/O: Jane Smith" or "W/O Jane Smith"
    type: 'WIFE_OF',
    label: 'W/O (Wife Of)',
    pattern: /W\/O\s*[:;.\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g,
    confidence: 0.9,
  },
  {
    // D/O = Daughter Of
    type: 'DAUGHTER_OF',
    label: 'D/O (Daughter Of)',
    pattern: /D\/O\s*[:;.\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g,
    confidence: 0.9,
  },
  {
    // S/O = Son Of
    type: 'SON_OF',
    label: 'S/O (Son Of)',
    pattern: /S\/O\s*[:;.\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g,
    confidence: 0.9,
  },
  {
    type: 'OCCUPATION',
    label: 'Occupation',
    pattern: /(?:Occupation|Occ\.?|Profession|Job)\s*[:;.\-]\s*([A-Za-z][A-Za-z\s&\-]{2,30})/g,
    confidence: 0.85,
  },
  {
    type: 'SEX',
    label: 'Sex',
    pattern: /(?:Sex|Gender)\s*[:;.\-]\s*(Male|Female|M|F|Other|Transgender)/gi,
    confidence: 0.9,
  },
  {
    type: 'ADDRESS',
    label: 'Address',
    pattern: /(?:Address|Addr|Residence|Home\s*Address|Street)\s*[:;.\-]\s*([^\n]{5,80}?)(?=\s*(?:\n|$|Phone|Mobile|Email|City|State|Pin|ZIP))/gi,
    confidence: 0.8,
  },
  {
    type: 'DOCTOR_NAME',
    label: 'Doctor Name',
    pattern: /(?:Dr\.?|Doctor)\s*[:;.\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g,
    confidence: 0.8,
  },
];

// ── Regex Patterns (pattern-based — no keyword context needed) ──
const REGEX_PATTERNS: Array<{
  type: string;
  label: string;
  pattern: RegExp;
  confidence: number;
}> = [
  {
    type: 'SSN',
    label: 'SSN / Aadhaar',
    pattern: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
    confidence: 0.9,
  },
  {
    type: 'AADHAAR',
    label: 'Aadhaar Number',
    pattern: /\b\d{4}\s\d{4}\s\d{4}\b/g,
    confidence: 0.9,
  },
  {
    type: 'PHONE',
    label: 'Phone Number',
    pattern: /(?:\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4})\b/g,
    confidence: 0.85,
  },
  {
    type: 'MOBILE',
    label: 'Mobile Number',
    pattern: /(?:Mobile|Cell|Contact)\s*[:;.\-]?\s*\+?\d[\d\s\-]{9,14}/gi,
    confidence: 0.85,
  },
  {
    type: 'EMAIL',
    label: 'Email Address',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    confidence: 0.95,
  },
  {
    type: 'DOB',
    label: 'Date of Birth',
    pattern: /(?:DOB|Date\s*of\s*Birth|Born|D\.O\.B\.?)\s*[:;.\-]?\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/gi,
    confidence: 0.9,
  },
  {
    type: 'AGE',
    label: 'Age',
    pattern: /(?:Age)\s*[:;.\-]?\s*\d{1,3}\s*(?:years?|yrs?|Y)?/gi,
    confidence: 0.75,
  },
  {
    type: 'MRN',
    label: 'MRN / Patient ID',
    pattern: /(?:MRN|Medical\s*Record|Patient\s*ID|UHID|Reg\.?\s*No|Regn)\s*[:;.#]?\s*[A-Z0-9][-A-Z0-9]{3,}/gi,
    confidence: 0.85,
  },
  {
    type: 'CREDIT_CARD',
    label: 'Credit Card',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    confidence: 0.8,
  },
];

// ── Detection Pipeline ──────────────────────────────────────────

export function detectPII(text: string): PIIDetection[] {
  const detections: PIIDetection[] = [];
  const occupied: Array<{ start: number; end: number }> = [];

  function overlaps(start: number, end: number): boolean {
    return occupied.some(
      (r) => start < r.end && end > r.start
    );
  }

  // NER first (higher priority — context-based)
  for (const p of NER_PATTERNS) {
    const regex = new RegExp(p.pattern.source, p.pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        const gText = match[1].trim();
        if (gText.length < 2) continue;
        const gOffset = match[0].indexOf(gText);
        const gStart = match.index + gOffset;
        const gEnd = gStart + gText.length;
        if (!overlaps(gStart, gEnd)) {
          detections.push({
            type: p.type,
            label: p.label,
            value: gText,
            start: gStart,
            end: gEnd,
            confidence: p.confidence,
            source: 'ner',
          });
          occupied.push({ start: gStart, end: gEnd });
        }
      }
    }
  }

  // Regex patterns next
  for (const p of REGEX_PATTERNS) {
    const regex = new RegExp(p.pattern.source, p.pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!overlaps(start, end)) {
        detections.push({
          type: p.type,
          label: p.label,
          value: match[0],
          start,
          end,
          confidence: p.confidence,
          source: 'regex',
        });
        occupied.push({ start, end });
      }
    }
  }

  detections.sort((a, b) => a.start - b.start);
  return detections;
}

// ── Masking ─────────────────────────────────────────────────────

const MASKS: Record<string, string> = {
  PATIENT_NAME:   '[NAME MASKED]',
  CONSULTANT:     '[CONSULTANT MASKED]',
  DOCTOR_NAME:    '[DOCTOR MASKED]',
  WIFE_OF:        '[W/O MASKED]',
  DAUGHTER_OF:    '[D/O MASKED]',
  SON_OF:         '[S/O MASKED]',
  OCCUPATION:     '[OCCUPATION MASKED]',
  SEX:            '[SEX MASKED]',
  ADDRESS:        '[ADDRESS MASKED]',
  SSN:            '***-**-****',
  AADHAAR:        '****-****-****',
  PHONE:          '***-***-****',
  MOBILE:         '***-***-****',
  EMAIL:          '[EMAIL MASKED]',
  DOB:            '[DOB MASKED]',
  AGE:            '[AGE MASKED]',
  MRN:            '[MRN MASKED]',
  CREDIT_CARD:    '****-****-****-****',
};

export function maskPII(text: string, detections: PIIDetection[]): MaskedResult {
  const maskMap: Array<{ original: string; masked: string; type: string }> = [];
  let maskedText = text;
  const sorted = [...detections].sort((a, b) => b.start - a.start);

  for (const d of sorted) {
    const mask = MASKS[d.type] || `[${d.type} MASKED]`;
    maskedText = maskedText.substring(0, d.start) + mask + maskedText.substring(d.end);
    maskMap.push({ original: d.value, masked: mask, type: d.label });
  }

  maskMap.reverse();
  return { maskedText, detections, maskMap };
}
