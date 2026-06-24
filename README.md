# OCR PII Masking Pipeline

A powerful web-based application that extracts text from images using OCR, detects personally identifiable information (PII), and automatically masks/redacts sensitive data with visual feedback.

## 🎯 Features

- **Optical Character Recognition (OCR)**: Extract text from images using Tesseract.js
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
│       ├── ocr.ts             # OCR processing with Tesseract.js
│       ├── piiEngine.ts        # PII detection patterns & logic
│       └── sampleImage.ts      # Sample document generation
├── index.html                 # HTML entry point
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
└── README.md                  # This file
```

## 🏗️ Architecture

### Processing Pipeline

The application follows a step-by-step pipeline:

1. **Image Input**: User uploads an image or loads sample
2. **OCR Extraction**: Tesseract.js extracts text and bounding boxes
3. **PII Detection**: Pattern matching + NER-style detection identifies sensitive data
4. **Image Masking**: Draws masks over detected PII regions
5. **FHIR Output**: Generates healthcare-compliant metadata

### Key Components

#### `src/utils/ocr.ts`
Handles OCR processing using Tesseract.js. Returns structured results with:
- Full extracted text
- Per-word confidence scores
- Bounding box coordinates for spatial mapping
- Line and word-level segmentation

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
| **Tesseract.js** | OCR engine | 5.1.1 |
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

### OCR Language

Default language is English. To add other languages, modify [src/utils/ocr.ts](src/utils/ocr.ts):

```typescript
const result = await Tesseract.recognize(imageData, 'eng', {
  // 'eng' = English
  // 'fra' = French
  // 'deu' = German
  // etc.
  logger: () => {},
});
```

## 🔐 Privacy & Security

- **Client-side Processing**: All image processing and PII detection happens locally in your browser
- **No Server Transmission**: Images are never sent to external servers
- **No Data Storage**: All data is cleared when you refresh or close the page
- **Open Source**: Code is transparent and auditable

## ⚠️ Limitations

- **OCR Accuracy**: Depends on image quality, resolution, and document clarity
- **PII Detection**: Pattern-based detection may have false positives/negatives
- **Language**: Currently configured for English text only
- **File Size**: Large images may take longer to process
- **Browser Resources**: Heavy processing on low-end devices may be slow

## 🐛 Known Issues & Troubleshooting

### OCR Takes a Long Time
- First use downloads Tesseract models (~80MB) - this is normal
- Clear browser cache to force re-download if needed
- Large/high-resolution images take longer to process

### Masked Regions Look Offset
- May occur with rotated or skewed documents
- Try rotating image to straight orientation before uploading

### PII Not Detected
- Detection uses pattern matching - unusual formats may not match
- Context matters - "Name: John" is detected differently than just "John"
- Check the extracted text view to verify OCR accuracy

### Application Crashes on Large Images
- Browser memory limitations
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

- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [FHIR Specification](https://www.hl7.org/fhir/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## 📧 Support

For issues, questions, or suggestions, please open an issue in the repository or contact the development team.

---

**Last Updated**: June 2026  
**Version**: 0.0.0
