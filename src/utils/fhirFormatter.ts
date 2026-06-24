import { MaskedResult } from './piiEngine';

function uid(): string {
  return Math.random().toString(36).substring(2, 14);
}

function isoNow(): string {
  return new Date().toISOString();
}

export interface FHIRDocumentReference {
  resourceType: string;
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
    security: Array<{ system: string; code: string; display: string }>;
  };
  status: string;
  type: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string; display: string };
  date: string;
  description: string;
  content: Array<{
    attachment: { contentType: string; language: string; data: string };
  }>;
  context: { period: { start: string } };
  extension: Array<{ url: string; valueString: string }>;
}

export function generateFHIR(masked: MaskedResult): FHIRDocumentReference {
  const types = [...new Set(masked.detections.map(d => d.label))];

  return {
    resourceType: 'DocumentReference',
    id: uid(),
    meta: {
      versionId: '1',
      lastUpdated: isoNow(),
      security: [
        { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'MASK', display: 'PII Masked' },
        { system: 'http://terminology.hl7.org/CodeSystem/v3-Confidentiality', code: 'R', display: 'Restricted' },
      ],
    },
    status: 'current',
    type: {
      coding: [{ system: 'http://loinc.org', code: '34117-2', display: 'History and Physical Note' }],
    },
    subject: { reference: 'Patient/[REDACTED]', display: '[NAME MASKED]' },
    date: isoNow(),
    description: `Clinical document with PII masked. ${masked.detections.length} field(s) redacted: ${types.join(', ')}`,
    content: [
      {
        attachment: {
          contentType: 'text/plain',
          language: 'en-IN',
          data: btoa(unescape(encodeURIComponent(masked.maskedText))),
        },
      },
    ],
    context: { period: { start: isoNow() } },
    extension: [
      {
        url: 'https://example.org/fhir/StructureDefinition/pii-redaction-report',
        valueString: JSON.stringify({
          totalDetections: masked.detections.length,
          detectionTypes: types,
          byType: masked.detections.reduce<Record<string, number>>((acc, d) => {
            acc[d.type] = (acc[d.type] || 0) + 1;
            return acc;
          }, {}),
          redactions: masked.maskMap.map(m => ({
            type: m.type,
            hash: simpleHash(m.original),
            maskedWith: m.masked,
          })),
          timestamp: isoNow(),
        }),
      },
    ],
  };
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h &= h;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}
