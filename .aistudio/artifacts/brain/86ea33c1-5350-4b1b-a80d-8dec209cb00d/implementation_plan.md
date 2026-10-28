# ARIA Desktop: Improvements & CNJ PDF Export

Enhancing ARIA Desktop with local-first OCR processing, CNJ-certified PDF report generation, and a professional legal dark theme (Slate & Cyan) adhering strictly to Provimento CNJ nº 149/2023 and LGPD compliance.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your preferences, the application will use **Local-first Tesseract OCR** (no external API dependency, complete privacy), a **CNJ Certified PDF Report Export** feature, and a **Professional Legal Dark Theme (Slate/Cyan)**.

- **Confirmed Decision 1**: Local OCR Engine (On-device processing with zero external API calls for maximum data privacy and LGPD compliance).
- **Confirmed Decision 2**: CNJ Certified PDF Report Export (Generate official PDF summaries with case metadata, confidence scores, and legal compliance notes).
- **Confirmed Decision 3**: Professional Legal Dark Theme (`bg-slate-950` / `bg-slate-900` with crisp Cyan/Emerald accents and tabular monospace metrics).

---

## 1. Overview & Core Concept

- **What It Does**: ARIA Desktop is a specialized desktop shell for processing death declarations (D.O.), extracting structured data via local OCR, validating layout compatibility, and generating official CNJ-compliant PDF records.
- **Target Audience / Persona**: Civil registrars, legal clerks, and medical records officers in Brazilian cartórios.
- **Key Value**: Secure, offline-capable document analysis and certified PDF export with zero external data transmission.

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. Upload/select document file (D.O. fisica, Livro C, or RG).
  2. Run local OCR engine with real-time progress bar.
  3. Inspect extracted fields and optical bounding boxes in the comparative visualizer.
  4. Generate and download official **CNJ Certified PDF Report** with tamper-evident cryptographic hash signature simulation.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Professional legal dark mode (`slate-950` canvas, `slate-900` structural panels, `cyan-400` / `emerald-400` accents).
  - *Typography & Hierarchy*: Clean sans-serif headings (`Plus Jakarta Sans` style), monospace tabular numerals for bounding box coordinates and timestamps.
  - *Component Styling*: Single-elevation flat design with 1px hairline borders (`border-slate-800`), clean unboxed metadata, and zero AI slop clutter.

## 3. Key Product Decisions & Trade-Offs

- **Decision 1**: Local Tesseract OCR vs. Cloud Vision LLM
  - *Chosen Approach*: Local client-side OCR execution.
  - *Why*: Absolute adherence to LGPD privacy mandates for civil registration data without dependency on external cloud APIs or rate limits.
- **Decision 2**: CNJ Certified PDF Export
  - *Chosen Approach*: Client-side jsPDF / printable PDF report generation featuring official metadata seals.
  - *Why*: Instant generation of archival-grade PDF documents directly in the desktop workspace.

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   ARIA Desktop Shell                   │
│  (React SPA + Vite + Tailwind CSS + Local OCR Engine)  │
└───────────────────────────┬────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│ Local Tesseract │                   │   CNJ Certified │
│   OCR Pipeline  │                   │    PDF Export   │
└─────────────────┘                   └─────────────────┘
```

- **Data Model & State**: `OCRDocumentState`, `DeathRecordData`, `OCRFieldExtraction` managed via React state and local storage.
- **Interactive Component Mapping**:
  - `ComparativePanel`: Side-by-side document viewer with bounding box overlay and entity inspector.
  - `CNJReportModal`: Official PDF certificate generator and export tool.
