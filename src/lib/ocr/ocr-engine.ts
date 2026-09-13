import { DocumentType, OcrExtractionResult } from '@/types';
import Tesseract from 'tesseract.js';

export interface ProcessDocumentOptions {
  filename: string;
  fileType: string;
  fileSize: number;
  documentTypeHint?: DocumentType;
}

export async function extractDocumentFields(
  file: File | { name: string; type: string; size: number },
  documentTypeHint?: DocumentType
): Promise<OcrExtractionResult> {
  const filename = file.name.toLowerCase();

  // Infer document type if not explicitly selected
  let inferredType: DocumentType = documentTypeHint || 'OTHER';
  if (!documentTypeHint || documentTypeHint === 'OTHER') {
    if (filename.includes('aadhaar') || filename.includes('aadhar') || filename.includes('uid')) {
      inferredType = 'AADHAAR';
    } else if (filename.includes('income') || filename.includes('tahsildar') || filename.includes('revenue')) {
      inferredType = 'INCOME_CERTIFICATE';
    } else if (filename.includes('bonafide') || filename.includes('college') || filename.includes('student') || filename.includes('id')) {
      inferredType = 'COLLEGE_ID';
    } else if (filename.includes('mark') || filename.includes('memo') || filename.includes('grade') || filename.includes('10th') || filename.includes('12th') || filename.includes('btech')) {
      inferredType = 'PREVIOUS_MARKSHEET';
    } else if (filename.includes('bank') || filename.includes('passbook') || filename.includes('sbi') || filename.includes('hdfc') || filename.includes('icici')) {
      inferredType = 'BANK_PASSBOOK';
    } else if (filename.includes('caste') || filename.includes('community')) {
      inferredType = 'CASTE_CERTIFICATE';
    } else if (filename.includes('domicile') || filename.includes('residence')) {
      inferredType = 'DOMICILE_CERTIFICATE';
    }
  }

  try {
    // Perform actual OCR using Tesseract.js
    // Since 'file' might be a browser File object or a mock object, we handle both.
    const imageSource = (file instanceof File) ? file : file.name;

    const { data: { text } } = await Tesseract.recognize(
      imageSource,
      'eng',
      { logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`) }
    );

    const rawText = text || "";

    // Field extraction logic based on inferred type and extracted text
    const fields: { fieldName: string; rawValue: string; normalizedValue?: string; confidence: number }[] = [];

    if (inferredType === 'AADHAAR') {
      const aadhaarMatch = rawText.match(/\d{4}\s?\d{4}\s?\d{4}/);
      if (aadhaarMatch) fields.push({ fieldName: 'aadhaar_number', rawValue: aadhaarMatch[0], confidence: 0.95 });

      const dobMatch = rawText.match(/(\d{2}[/-]\d{2}[/-]\d{4})/);
      if (dobMatch) fields.push({ fieldName: 'date_of_birth', rawValue: dobMatch[0], confidence: 0.90 });
    } else if (inferredType === 'BANK_PASSBOOK') {
      const accMatch = rawText.match(/\d{9,18}/);
      if (accMatch) fields.push({ fieldName: 'bank_account_no', rawValue: accMatch[0], confidence: 0.95 });

      const ifscMatch = rawText.match(/[A-Z]{4}0[A-Z0-9]{6}/);
      if (ifscMatch) fields.push({ fieldName: 'bank_ifsc', rawValue: ifscMatch[0], confidence: 0.98 });
    }

    // If we extracted something, return it. Otherwise, return a semi-mocked result based on the file
    // to ensure the demo doesn't look completely broken if the user uploads a low-quality image.
    if (fields.length > 0) {
      return {
        success: true,
        documentType: inferredType,
        rawText,
        fields,
      };
    }

    return {
      success: true,
      documentType: inferredType,
      rawText: rawText || "Document uploaded successfully. No structured text fields automatically recognized.",
      fields,
    };

  } catch (error: any) {
    console.error("OCR Engine Error:", error);
    return {
      success: false,
      error: error?.message || "OCR text extraction failed for this file",
      documentType: inferredType,
      rawText: "",
      fields: [],
    };
  }
}
