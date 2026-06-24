/**
 * Generates a realistic Indian medical OPD document image.
 * Uses large, clean, high-contrast fonts optimized for Tesseract OCR.
 * Includes: Patient Name, Occupation, W/O, D/O, S/O, Address, Sex, Consultant
 */
export function generateSampleDocumentImage(): string {
  const canvas = document.createElement('canvas');
  const W = 1000;
  const H = 1200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const M = 60;
  let y = 0;

  // ── White background ──
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── Hospital Header ──
  ctx.fillStyle = '#1a365d';
  ctx.fillRect(0, 0, W, 65);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial, Helvetica, sans-serif';
  ctx.fillText('Sri Ramakrishna Hospital', M, 42);
  y = 80;

  ctx.fillStyle = '#64748b';
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('45, Sarojini Street, Ram Nagar, Coimbatore 641009', M, y);
  y += 18;
  ctx.fillText('OPD CONSULTATION SHEET', M, y);
  ctx.fillText('Date: 12/08/2024', W - M - 180, y);
  y += 25;

  drawHR(ctx, M, y, W - M, 2, '#1a365d');
  y += 20;

  // ── PATIENT 1: Adult female ──
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillText('PATIENT DETAILS', M, y);
  y += 30;

  const labelFont = '15px Arial, sans-serif';
  const valueFont = 'bold 15px Arial, sans-serif';
  const c1 = M;
  const c2 = M + 420;

  // Each row: label + value on left, label + value on right
  drawRow(ctx, 'Name:', 'Priya Sharma', c1, 'MRN:', 'SRH-2024-88412', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'W/O:', 'Rakesh Sharma', c1, 'Age:', '34 Yrs', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'Occupation:', 'Software Engineer', c1, 'Sex:', 'Female', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'Address:', 'No. 23, 5th Cross, KR Puram, Bangalore, Karnataka 560036', c1, '', '', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'Phone:', '9876543210', c1, 'Email:', 'priya.s@gmail.com', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'Consultant:', 'Dr. Arun Krishnan', c1, 'Dept:', 'General Medicine', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'DOB:', '15/03/1990', c1, 'Aadhaar:', '4829 1037 5562', c2, y, labelFont, valueFont);
  y += 38;

  drawHR(ctx, M, y, W - M, 1, '#cbd5e1');
  y += 15;

  // ── Clinical Notes ──
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillText('CLINICAL NOTES', M, y);
  y += 28;

  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  const notes = [
    'Chief Complaint: Recurring headache and fatigue for 3 weeks.',
    '',
    'History: Patient reports intermittent frontal headache,',
    'worse in the mornings. No history of migraine.',
    '',
    'Examination: BP 120/80 mmHg. No neurological deficit.',
    'Throat mildly congested.',
    '',
    'Advice: CBC, ESR, Thyroid Profile.',
    'Tab. Paracetamol 500mg SOS. Review after reports.',
  ];
  for (const l of notes) {
    ctx.fillText(l, M, y);
    y += 24;
  }
  y += 15;

  drawHR(ctx, M, y, W - M, 1, '#cbd5e1');
  y += 15;

  // ── Signature ──
  ctx.font = '14px Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Consultant Signature:', M, y);
  y += 28;
  ctx.font = 'bold italic 18px Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Dr. Arun Krishnan', M, y);
  y += 20;
  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('MBBS, MD (General Medicine)  |  MCI Reg: 45678', M, y);
  y += 35;

  // ── PATIENT 2: Paediatric (shows S/O and D/O) ──
  drawHR(ctx, M, y, W - M, 2, '#1a365d');
  y += 10;
  ctx.fillStyle = '#1a365d';
  ctx.fillRect(M, y, W - 2 * M, 32);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('PATIENT 2  —  PAEDIATRIC RECORD', M + 12, y + 22);
  y += 48;

  drawRow(ctx, 'Name:', 'Arjun Patel', c1, 'Age:', '12 Yrs', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'S/O:', 'Vikram Patel', c1, 'Sex:', 'Male', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'D/O:', 'Meera Patel', c1, 'Occupation:', 'Student', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'Address:', '14, MG Road, Indiranagar, Chennai, TN 600020', c1, '', '', c2, y, labelFont, valueFont);
  y += 30;

  drawRow(ctx, 'Consultant:', 'Dr. Sunita Reddy', c1, 'Dept:', 'Paediatrics', c2, y, labelFont, valueFont);
  y += 30;

  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Diagnosis: Acute bronchitis. Rx: Amoxicillin 250mg TID x 5 days.', M, y);

  // ── Footer ──
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Arial, sans-serif';
  ctx.fillText('Contains Protected Health Information (PHI) — Handle per HIPAA / DISHA guidelines', M, H - 25);

  return canvas.toDataURL('image/png');
}

function drawHR(
  ctx: CanvasRenderingContext2D,
  x1: number, y: number, x2: number,
  width: number, color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  label1: string, value1: string, x1: number,
  label2: string, value2: string, x2: number,
  y: number,
  labelFont: string, valueFont: string
) {
  // Left column
  if (label1) {
    ctx.font = labelFont;
    ctx.fillStyle = '#64748b';
    ctx.fillText(label1, x1, y);
    const lw = ctx.measureText(label1).width;
    ctx.font = valueFont;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(value1, x1 + lw + 8, y);
  }

  // Right column
  if (label2) {
    ctx.font = labelFont;
    ctx.fillStyle = '#64748b';
    ctx.fillText(label2, x2, y);
    const lw = ctx.measureText(label2).width;
    ctx.font = valueFont;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(value2, x2 + lw + 8, y);
  }
}
