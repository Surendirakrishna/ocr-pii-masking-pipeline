# OCR PII Masking Pipeline (Ollama OCR Integration)

A powerful web-based application that extracts text from images using **Ollama-powered OCR**, detects personally identifiable information (PII), and automatically masks/redacts sensitive data with visual feedback.

> **Chandra-OCR-2 Powered**: This project uses Ollama with the Chandra-OCR-2 model for superior OCR accuracy on complex document layouts.

## 🎯 Features

- **Optical Character Recognition (OCR)**: Extract text from images using Ollama with the `fredrezones55/chandra-ocr-2` model
- **PII Detection**: Automatically identify 16+ types of sensitive information including:
  - Patient names, dates of birth, ages
  - Medical identifiers (MRN, Aadhaar)
  - Contact information (phone, email, addresses)
  - Financial data (credit cards, SSN)
  - Relationship indicators (W/O, D/O, S/O)
  - Professional roles (doctors, consultants, occupations)
  - Gender/sex information

- **Multiple Masking Styles**:
  - **Label**: Replace with category labels (e.g., [PATIENT_NAME])
  - **Solid**: Cover with solid black boxes
  - **Pixelate**: Blur with pixelation effect
  - **Blur**: Apply Gaussian blur

- **Multi-View Interface**:
  - Original image
  - Masked image
  - Extracted text
  - Comparison view
  - FHIR-formatted output

- **FHIR Compliance**: Generate FHIR DocumentReference objects for healthcare interoperability

- **Sample Generation**: Load a pre-built sample medical document for testing

- **Real-time Processing**: Interactive pipeline with status updates

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)
- **Ollama** installed and running locally (see [Ollama Setup](#ollama-setup) below)

### Ollama Setup

This application requires Ollama to be running locally with the `fredrezones55/chandra-ocr-2` model.

#### 1. Install Ollama

- **macOS/Linux**: Download from [ollama.ai](https://ollama.ai)
- **Windows**: Download from [ollama.ai](https://ollama.ai)
- Or build from source: https://github.com/ollama/ollama

#### 2. Start Ollama Server

```bash
ollama serve
```

The Ollama API will be available at `http://localhost:11434`

#### 3. Pull the OCR Model

```bash
ollama pull fredrezones55/chandra-ocr-2
```

This downloads the Chandra OCR 2 model (~2-3GB). You only need to do this once.

#### 4. Verify Installation

```bash
curl http://localhost:11434/api/tags
```

You should see `fredrezones55/chandra-ocr-2` in the list of available models.

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ocr-pii-masking-pipeline
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

### Build for Production

```bash
npm run build
```

This creates an optimized single-file HTML bundle in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
ocr-pii-masking-pipeline/
├── src/
│   ├── App.tsx                 # Main React component & UI logic
│   ├── index.css              # Global styles
│   ├── main.tsx               # React entry point
│   └── utils/
│       ├── cn.ts              # CSS class merging utility
│       ├── fhirFormatter.ts    # FHIR document generation
│       ├── imageMasker.ts      # Image masking & rendering
│       ├── ocr.ts             # OCR processing with Ollama (Chandra-OCR-2)
│       ├── piiEngine.ts        # PII detection patterns & logic
│       └── sampleImage.ts      # Sample document generation
├── index.html                 # HTML entry point
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
└── README.md                  # This file
```

## 🏗️ Architecture

### OCR Engine

This project exclusively uses **Ollama with Chandra-OCR-2** model:
- ✅ Superior accuracy for complex document layouts
- ✅ Excellent performance with GPU acceleration (5-10x faster)
- ✅ Local processing - no cloud dependency
- ✅ Supports multiple languages via Ollama ecosystem
- ✅ Text extraction optimized for medical/legal documents

### Processing Pipeline

The application follows a step-by-step pipeline:

1. **Image Input**: User uploads an image or loads sample
2. **OCR Extraction**: Ollama with Chandra-OCR-2 extracts text
3. **PII Detection**: Pattern matching + NER-style detection identifies sensitive data
4. **Image Masking**: Draws masks over detected PII regions (approximate positioning)
5. **FHIR Output**: Generates healthcare-compliant metadata

### Key Components

#### `src/utils/ocr.ts`
Handles OCR processing using Ollama with Chandra-OCR-2 model. Features:
- Converts images to base64 format for API transmission
- Calls local Ollama API at `http://localhost:11434/api/generate`
- Returns extracted text with high accuracy
- Optimized for medical, legal, and government documents

#### `src/utils/piiEngine.ts`
Contains regex patterns and context-based NER logic for detecting:
- Medical identifiers (MRN, Aadhaar, DOB)
- Personal identifiers (names, addresses, phone, email)
- Financial data (credit cards, SSN)
- Relationship indicators
- Professional roles

**Detection Methods:**
- **Regex Patterns**: Context-aware patterns for high-confidence matches
- **NER-Style**: Pattern matching with keyword lookups

#### `src/utils/imageMasker.ts`
Renders masks on the image canvas with support for:
- Spatial region mapping from OCR bounding boxes
- Multiple masking styles (solid, pixelate, blur, label)
- Color-coded visualization per PII type

#### `src/utils/fhirFormatter.ts`
Generates FHIR DocumentReference objects compliant with healthcare standards:
- Document metadata
- PII detection summary
- Masking audit trail

#### `src/utils/sampleImage.ts`
Generates a synthetic medical document image for testing and demonstration.

## 💡 Usage

### Upload Your Own Image

1. Click **"Upload Image"** button
2. Select a document image (PNG, JPG, etc.)
3. Click **"Run Full Pipeline"** to process

### Use Sample Document

Click **"Load Sample"** to generate and process a pre-built medical document.

### View Results

Switch between views using the top navigation:
- **Compare**: Side-by-side original and masked images
- **Original**: Full resolution original
- **Masked**: PII-redacted version
- **Text**: Extracted raw text with highlighting
- **FHIR**: Healthcare metadata output

### Change Masking Style

Use the **"Masking Style"** selector to toggle between:
- **Label**: Shows PII category names
- **Solid**: Black boxes over sensitive data
- **Pixelate**: Pixel-based obfuscation
- **Blur**: Gaussian blur effect

## 🔧 Technologies Used

| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI framework | 19.2.6 |
| **TypeScript** | Type-safe JavaScript | 5.9.3 |
| **Vite** | Build tool & dev server | 7.3.2 |
| **Tailwind CSS** | Utility-first styling | 4.1.17 |
| **Ollama** | Local OCR engine | Latest |
| **Chandra-OCR-2** | OCR model (fredrezones55) | Latest |
| **Tailwind Merge** | CSS class optimization | 3.4.0 |
| **clsx** | Conditional classnames | 2.1.1 |

## 📊 Supported PII Types

The system detects and masks 16+ types of sensitive information:

| Type | Label | Examples |
|------|-------|----------|
| PATIENT_NAME | Patient Name | John Smith, Jane Doe |
| OCCUPATION | Occupation | Doctor, Engineer, Manager |
| WIFE_OF | W/O (Wife Of) | Names after "W/O:" |
| DAUGHTER_OF | D/O (Daughter Of) | Names after "D/O:" |
| SON_OF | S/O (Son Of) | Names after "S/O:" |
| ADDRESS | Address | Street addresses, locations |
| SEX | Sex / Gender | Male, Female, M, F |
| CONSULTANT | Consultant | Dr. name, Consultant name |
| DOCTOR_NAME | Doctor Name | Physician names |
| PHONE | Phone Number | 10-digit numbers, formats |
| MRN | MRN / Patient ID | Medical record identifiers |
| DOB | Date of Birth | Dates in various formats |
| EMAIL | Email | Email addresses |
| AADHAAR | Aadhaar | 12-digit Aadhaar IDs |
| CREDIT_CARD | Credit Card | Card numbers (16 digits) |
| SSN | SSN | Social security numbers |
| AGE | Age | Years, age ranges |

## 🎨 Masking Styles

### Label
Replaces sensitive text with category labels in brackets:
```
[PATIENT_NAME], [DOB], [PHONE]
```

### Solid
Covers regions with solid black boxes, preserving document layout.

### Pixelate
Applies pixel-based obfuscation, making text unreadable while showing approximate position.

### Blur
Applies Gaussian blur effect to sensitive regions.

## 📝 Configuration

### Development Server

Edit `vite.config.ts` to customize:
- Hot module replacement behavior
- Tailwind CSS integration
- React plugin settings
- Alias paths (@/ for src/)

### TypeScript

Adjust compilation settings in `tsconfig.json`:
- Target ES version
- Module resolution
- Strict type checking
- Module system

### OCR Configuration

The application uses Ollama for OCR processing. To change settings, modify [src/utils/ocr.ts](src/utils/ocr.ts):

**Default Configuration:**
```typescript
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'fredrezones55/chandra-ocr-2',  // Model name
    prompt: 'Extract all text from this image. Return only the text content.',
    images: [base64Image.split(',')[1]],
    stream: false,
  }),
});
```

**To use a different OCR model:**
1. Pull the model in Ollama: `ollama pull <model-name>`
2. Update the `model` field in the fetch request above

**Popular OCR Models for Ollama:**
- `fredrezones55/chandra-ocr-2` - General purpose OCR (recommended)
- `fredrezones55/chandra-ocr` - Lighter alternative
- Other vision models with text extraction capability

## 🔐 Privacy & Security

- **Client-side Processing**: All image processing and PII detection happens locally in your browser
- **Local Ollama Server**: OCR processing happens on your local machine (no cloud transmission)
- **No Remote APIs**: Never sends data to external services (except local Ollama)
- **No Data Storage**: All data is cleared when you refresh or close the page
- **Open Source**: Code is transparent and auditable

## ⚡ Performance Optimization

### GPU Acceleration

Ollama supports GPU acceleration for significantly faster OCR:

**NVIDIA GPUs (CUDA)**:
```bash
# NVIDIA GPUs will be detected automatically
ollama serve
```

**Apple Metal (macOS)**:
- Automatically detected on Mac with Apple Silicon
- Requires Metal support

**AMD GPUs (ROCm)**:
```bash
# For AMD GPUs
rocm-smi  # Verify ROCm installation
ollama serve
```

Performance typically improves 5-10x with GPU acceleration.

### System Recommendations

| Component | Minimum | Recommended | Optimal |
|-----------|---------|------------|---------|
| CPU | Quad-core | 8+ cores | 12+ cores |
| RAM | 4GB | 8GB | 16GB |
| GPU | None | NVIDIA/AMD | High-end GPU (12GB+) |
| Storage | 3GB | 10GB | 20GB+ (multiple models) |

Performance will vary based on your hardware. GPU acceleration makes a significant difference.

## ⚠️ Limitations

- **Ollama Requirement**: Requires Ollama to be running locally on port 11434
- **Processing Speed**: Ollama models are slower than Tesseract.js (30+ seconds typical, depending on hardware)
- **GPU Recommended**: Performance significantly improves with GPU acceleration (CUDA/Metal)
- **Memory Requirements**: Requires 4-8GB+ RAM for the Chandra-OCR-2 model
- **PII Detection**: Pattern-based detection may have false positives/negatives
- **Language**: Currently configured for English text only
- **Approximate Positioning**: Text extraction uses approximate positioning for masking (sufficient for redaction purposes)
- **File Size**: Large images may timeout before OCR completes
- **Browser Resources**: Heavy processing on low-end devices may be slow

## 🐛 Known Issues & Troubleshooting

### Ollama Connection Error
**Error**: "Failed to connect to Ollama at http://localhost:11434"

**Solution**:
- Ensure Ollama is installed: https://ollama.ai
- Start Ollama server: `ollama serve`
- Verify with: `curl http://localhost:11434/api/tags`
- Check firewall settings - Ollama needs port 11434

### Model Not Found
**Error**: "Error: model not found"

**Solution**:
- Pull the required model: `ollama pull fredrezones55/chandra-ocr-2`
- List available models: `ollama list`
- Ensure you have enough disk space (~2-3GB for Chandra-OCR-2)

### Slow OCR Processing
**Symptoms**: OCR takes 30+ seconds per image

**Solutions**:
- Enable GPU acceleration (CUDA/Metal/ROCm) for 5-10x performance improvement
- Upgrade GPU VRAM if available (improves processing speed)
- Reduce image resolution before processing
- Ensure sufficient RAM is available (~8GB recommended)

### Ollama Takes a Long Time on First Run
- First inference with Ollama loads the model into memory
- This is normal and takes 30-60 seconds depending on your system
- Subsequent requests are faster as the model stays loaded

### OCR Results Are Incomplete or Incorrect
- Different OCR models have different accuracy levels
- Try adjusting the prompt in `ocr.ts`
- Ensure image quality is good (high resolution, clear text)
- Different Ollama models may work better for your use case

### Out of Memory Errors
- Ollama models require significant RAM (4-8GB+ for Chandra-OCR-2)
- Close other applications to free up memory
- Consider using a lighter OCR model: `ollama pull fredrezones55/chandra-ocr`

### Application Crashes on Large Images
- Browser memory limitations
- Large images may timeout before OCR completes
- Try using smaller images or lower resolution
- Close other browser tabs to free memory

## 📚 FHIR Output

When generating FHIR output, the application creates a DocumentReference object containing:

- Document metadata (title, status, type)
- PII detection results
- Masking information
- Content summary

Example FHIR output:
```json
{
  "resourceType": "DocumentReference",
  "status": "current",
  "type": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "34108-1",
      "display": "Outpatient Note"
    }]
  },
  "content": [{
    "attachment": {
      "title": "PII-Masked Medical Document"
    }
  }]
}
```

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Additional language support
- Improved PII detection patterns
- Performance optimization
- Additional masking styles
- Enhanced FHIR compliance
- Unit tests & integration tests
- UI/UX improvements

## 📄 License

This project is provided as-is. Please check for any specific license file in the repository.

## 🔗 Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Ollama Official Website](https://ollama.ai)
- [Chandra-OCR-2 Model](https://ollama.ai/library/fredrezones55/chandra-ocr-2)
- [FHIR Specification](https://www.hl7.org/fhir/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## 📧 Support

For issues, questions, or suggestions, please open an issue in the repository or contact the development team.

---

**Last Updated**: June 2026  
**Version**: 0.0.0
