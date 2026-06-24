import { useState, useRef, useCallback, useEffect } from 'react';
import { performOCR, type OCRResult } from './utils/ocr';
import { detectPII, maskPII, type PIIDetection, type MaskedResult } from './utils/piiEngine';
import { generateFHIR, type FHIRDocumentReference } from './utils/fhirFormatter';
import {
  buildTextFromOCR,
  findPIIRegions,
  drawMaskedImage,
} from './utils/imageMasker';
import { generateSampleDocumentImage } from './utils/sampleImage';

// ── Types ──
type Step = 'idle' | 'ocr' | 'detect' | 'mask' | 'done';
type ViewMode = 'compare' | 'original' | 'masked' | 'text' | 'fhir';



// PII types the user wants masked — shown as a legend
const PII_CATEGORIES = [
  { type: 'PATIENT_NAME', label: 'Patient Name', color: '#ef4444' },
  { type: 'OCCUPATION', label: 'Occupation', color: '#f59e0b' },
  { type: 'WIFE_OF', label: 'W/O (Wife Of)', color: '#8b5cf6' },
  { type: 'DAUGHTER_OF', label: 'D/O (Daughter Of)', color: '#a855f7' },
  { type: 'SON_OF', label: 'S/O (Son Of)', color: '#6366f1' },
  { type: 'ADDRESS', label: 'Address', color: '#ec4899' },
  { type: 'SEX', label: 'Sex / Gender', color: '#14b8a6' },
  { type: 'CONSULTANT', label: 'Consultant', color: '#3b82f6' },
  { type: 'DOCTOR_NAME', label: 'Doctor Name', color: '#2563eb' },
  { type: 'PHONE', label: 'Phone Number', color: '#f97316' },
  { type: 'MRN', label: 'MRN / Patient ID', color: '#64748b' },
  { type: 'DOB', label: 'Date of Birth', color: '#dc2626' },
  { type: 'EMAIL', label: 'Email', color: '#0891b2' },
  { type: 'AADHAAR', label: 'Aadhaar', color: '#059669' },
  { type: 'CREDIT_CARD', label: 'Credit Card', color: '#7c3aed' },
  { type: 'SSN', label: 'SSN', color: '#be123c' },
  { type: 'AGE', label: 'Age', color: '#0d9488' },
];

function getCategoryColor(type: string): string {
  return PII_CATEGORIES.find(c => c.type === type)?.color || '#94a3b8';
}

// ── Main App ──
export default function App() {
  const [step, setStep] = useState<Step>('idle');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [detections, setDetections] = useState<PIIDetection[]>([]);
  const [maskedResult, setMaskedResult] = useState<MaskedResult | null>(null);
  const [maskedRegions, setMaskedRegions] = useState<import('./utils/imageMasker').MaskedRegion[]>([]);
  const [maskStyle, setMaskStyle] = useState<'solid' | 'pixelate' | 'blur' | 'label'>('label');
  const [maskedImageUrl, setMaskedImageUrl] = useState<string | null>(null);
  const [fhirOutput, setFhirOutput] = useState<FHIRDocumentReference | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-render masked image when style changes
  useEffect(() => {
    if (imageSrc && maskedRegions.length > 0) {
      drawMaskedImage(imageSrc, maskedRegions, maskStyle).then(setMaskedImageUrl).catch(() => {});
    }
  }, [maskStyle, imageSrc, maskedRegions]);

  const reset = useCallback(() => {
    setStep('idle');
    setImageSrc(null);
    setOcrResult(null);
    setDetections([]);
    setMaskedResult(null);
    setMaskedRegions([]);
    setMaskStyle('label');
    setMaskedImageUrl(null);
    setFhirOutput(null);
    setError(null);
    setStatusMsg('');
    setViewMode('compare');
  }, []);

  const handleImage = useCallback((file: File) => {
    reset();
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [reset]);

  const loadSample = useCallback(() => {
    reset();
    setImageSrc(generateSampleDocumentImage());
  }, [reset]);

  const runPipeline = useCallback(async () => {
    if (!imageSrc) return;
    try {
      setError(null);

      // ── Step: OCR (Chandra-OCR-2) ──
      setStep('ocr');
      setStatusMsg('Running Chandra-OCR-2 to extract text from image…');
      const ocrRes = await performOCR(imageSrc);

      // Reconstruct text with precise character tracking from OCR lines/words
      const { fullText, allWords, lineInfos } = buildTextFromOCR(ocrRes.lines);
      setOcrResult({ ...ocrRes, text: fullText });

      if (!fullText.trim()) {
        setError('No text could be extracted. Please try a clearer image with visible text.');
        setStep('idle');
        return;
      }

      // ── Step: Detect PII ──
      setStep('detect');
      setStatusMsg(`Scanning ${fullText.length} characters for personal information…`);
      await delay(300);

      const piiDetections = detectPII(fullText);
      setDetections(piiDetections);

      // ── Step: Mask ──
      setStep('mask');
      setStatusMsg(`Masking ${piiDetections.length} PII field(s) on image…`);
      await delay(200);

      // Find image regions
      const regions = findPIIRegions(piiDetections, allWords, lineInfos);
      setMaskedRegions(regions);

      // Draw masked image
      const maskedImg = await drawMaskedImage(imageSrc, regions, maskStyle);
      setMaskedImageUrl(maskedImg);

      // Text masking
      const masked = maskPII(fullText, piiDetections);
      setMaskedResult(masked);

      // FHIR
      const fhir = generateFHIR(masked);
      setFhirOutput(fhir);

      setStep('done');
      setStatusMsg(`Done! ${piiDetections.length} PII field(s) detected and masked.`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
      setStep('idle');
    }
  }, [imageSrc]);

  const downloadMasked = useCallback(() => {
    if (!maskedImageUrl) return;
    const a = document.createElement('a');
    a.href = maskedImageUrl;
    a.download = 'pii-masked-document.png';
    a.click();
  }, [maskedImageUrl]);

  const isProcessing = step !== 'idle' && step !== 'done';
  const isDone = step === 'done';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ── */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg shadow-lg shadow-red-500/20">
            🛡️
          </div>
          <div>
            <h1 className="text-lg font-bold">PII Image Masker</h1>
            <p className="text-xs text-slate-400">Detect &amp; redact personal information from document images</p>
          </div>
          <div className="ml-auto text-xs">
            <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              HIPAA / DISHA
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Upload Section ── */}
        {!isDone && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Upload Area */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="p-5">
                {!imageSrc ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400/50 hover:bg-blue-500/5 transition group"
                  >
                    <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📤</div>
                    <p className="text-slate-300 font-medium text-lg">Click to upload a document image</p>
                    <p className="text-slate-500 text-sm mt-1">JPG, PNG, BMP, TIFF</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); loadSample(); }}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition"
                    >
                      📄 Try Sample Indian Medical Document
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white">
                    <img src={imageSrc} alt="Input" className="w-full h-auto max-h-[400px] object-contain" />
                    {!isProcessing && !isDone && (
                      <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-xs">Ready to process</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Process button */}
              <button
                onClick={runPipeline}
                disabled={!imageSrc || isProcessing}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  isProcessing
                    ? 'bg-blue-600/50 cursor-not-allowed animate-pulse'
                    : !imageSrc
                      ? 'bg-slate-700/30 cursor-not-allowed text-slate-500'
                      : 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-lg shadow-red-500/25'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2"><Spinner /> {statusMsg}</span>
                ) : '▶ Detect &amp; Mask PII'}
              </button>

              {/* Status */}
              {isProcessing && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
                  {statusMsg}
                </div>
              )}

              {/* PII Categories Legend */}
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-sm">PII Fields to Mask</h3>
                </div>
                <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto">
                  {PII_CATEGORIES.map(c => (
                    <div key={c.type} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-slate-300">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {imageSrc && !isProcessing && (
                <button onClick={reset} className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-slate-400 transition">
                  Clear &amp; Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-3">
            <span className="text-xl shrink-0">⚠️</span>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* ── Results ── */}
        {isDone && (
          <div className="space-y-6">
            {/* Top bar: stats + actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm font-medium">
                ✅ {detections.length} PII field(s) masked
              </div>

              {/* View mode tabs */}
              {(['compare', 'original', 'masked', 'text', 'fhir'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    viewMode === mode
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {mode === 'compare' && '⬅️➡️ Compare'}
                  {mode === 'original' && '🖼️ Original'}
                  {mode === 'masked' && '🔒 Masked'}
                  {mode === 'text' && '📝 Text'}
                  {mode === 'fhir' && '📋 FHIR'}
                </button>
              ))}

              {/* Mask Style Selector */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 mr-1">Style:</span>
                {(['label', 'solid', 'pixelate', 'blur'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setMaskStyle(s)}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      maskStyle === s ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {s === 'label' && '🏷️ Label'}
                    {s === 'solid' && '⬛ Solid'}
                    {s === 'pixelate' && '🟪 Pixel'}
                    {s === 'blur' && '🌫️ Blur'}
                  </button>
                ))}
              </div>

              <button onClick={downloadMasked} className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-sm font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition flex items-center gap-2">
                ⬇️ Download Masked Image
              </button>
              <button onClick={reset} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-slate-400 transition">
                🔄 New Image
              </button>
            </div>

            {/* Detection summary strip */}
            <div className="flex flex-wrap gap-2">
              {detections.map((d, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{
                    backgroundColor: getCategoryColor(d.type) + '15',
                    borderColor: getCategoryColor(d.type) + '40',
                    color: getCategoryColor(d.type),
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(d.type) }} />
                  {d.label}: {d.value}
                </span>
              ))}
            </div>

            {/* ── View Content ── */}
            {viewMode === 'compare' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                    <span className="text-red-400">⚠️</span>
                    <span className="text-sm font-medium text-red-300">Original — PII Visible</span>
                  </div>
                  <div className="p-3">
                    <img src={imageSrc!} alt="Original" className="w-full h-auto rounded-lg border border-white/10 bg-white" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                    <span className="text-green-400">🔒</span>
                    <span className="text-sm font-medium text-green-300">Masked — PII Redacted</span>
                  </div>
                  <div className="p-3">
                    {maskedImageUrl && (
                      <img src={maskedImageUrl} alt="Masked" className="w-full h-auto rounded-lg border border-white/10 bg-white" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'original' && (
              <div className="flex flex-col items-center">
                <img src={imageSrc!} alt="Original" className="max-w-full max-h-[700px] rounded-xl border border-white/10 bg-white" />
              </div>
            )}

            {viewMode === 'masked' && (
              <div className="flex flex-col items-center">
                {maskedImageUrl && (
                  <div className="relative">
                    <img src={maskedImageUrl} alt="Masked" className="max-w-full max-h-[700px] rounded-xl border border-white/10 bg-white" />
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                      🔒 PII REDACTED
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'text' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-red-300">⚠️ Original Text</div>
                  <div className="p-4 max-h-[500px] overflow-y-auto">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {highlightPII(ocrResult?.text || '', detections)}
                    </pre>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-green-300">🔒 Masked Text</div>
                  <div className="p-4 max-h-[500px] overflow-y-auto">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {maskedResult?.maskedText || ''}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'fhir' && <FHIRView fhir={fhirOutput} />}

            {/* Redaction log */}
            {maskedResult && maskedResult.maskMap.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h2 className="font-semibold text-sm">📋 Redaction Log</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 text-xs">
                        <th className="pb-2 pr-4">#</th>
                        <th className="pb-2 pr-4">PII Type</th>
                        <th className="pb-2 pr-4">Original Value</th>
                        <th className="pb-2 pr-4">Replaced With</th>
                        <th className="pb-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maskedResult.maskMap.map((m, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="py-2 pr-4 text-slate-500">{i + 1}</td>
                          <td className="py-2 pr-4">
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                              backgroundColor: getCategoryColor(detections[i]?.type || '') + '20',
                              color: getCategoryColor(detections[i]?.type || ''),
                            }}>
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-red-400 font-mono line-through">{m.original}</td>
                          <td className="py-2 pr-4 text-green-400 font-mono">{m.masked}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${detections[i]?.source === 'ner' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                              {detections[i]?.source?.toUpperCase() || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FHIR View ──
function FHIRView({ fhir }: { fhir: FHIRDocumentReference | null }) {
  const [copied, setCopied] = useState(false);
  if (!fhir) return null;
  const json = JSON.stringify(fhir, null, 2);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-medium text-cyan-300">FHIR R4 DocumentReference</p>
            <p className="text-xs text-cyan-300/60">ID: {fhir.id}</p>
          </div>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition"
        >
          {copied ? '✅ Copied!' : '📋 Copy JSON'}
        </button>
      </div>
      <pre
        className="text-xs text-slate-300 whitespace-pre-wrap font-mono p-4 rounded-xl bg-slate-900/80 border border-white/10 leading-relaxed overflow-auto max-h-[500px]"
        dangerouslySetInnerHTML={{ __html: syntaxHL(json) }}
      />
    </div>
  );
}

// ── Helpers ──
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

function highlightPII(text: string, detections: PIIDetection[]): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  sorted.forEach((d, i) => {
    if (d.start > last) parts.push(text.substring(last, d.start));
    parts.push(
      <span key={i} className="bg-red-500/30 text-red-300 px-0.5 rounded border border-red-500/50" title={d.label}>
        {d.value}
      </span>
    );
    last = d.end;
  });
  if (last < text.length) parts.push(text.substring(last));
  return parts;
}

function syntaxHL(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let c = 'text-cyan-300';
      if (/^"/.test(m)) c = /:$/.test(m) ? 'text-blue-400' : 'text-green-400';
      else if (/true|false/.test(m)) c = 'text-amber-400';
      else if (/null/.test(m)) c = 'text-slate-500';
      return `<span class="${c}">${m}</span>`;
    }
  );
}
