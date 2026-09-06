import { DocumentType, OcrExtractionResult } from '@/types';

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

  // Simulate OCR pipeline processing
  await new Promise((resolve) => setTimeout(resolve, 1800));

  switch (inferredType) {
    case 'AADHAAR':
      return {
        documentType: 'AADHAAR',
        rawText: `GOVERNMENT OF INDIA\nUnique Identification Authority of India\nEnrollment No: 2049/19284/01928\nName: Sai Sankeerth\nDOB: 14/08/2004\nGender: Male\nAadhaar No: 5492 8173 9012\nAddress: H.No 4-12/A, Madhapur, Hyderabad, Telangana - 500081`,
        fields: [
          { fieldName: 'full_name', rawValue: 'Sai Sankeerth', confidence: 0.99 },
          { fieldName: 'date_of_birth', rawValue: '2004-08-14', normalizedValue: '14/08/2004', confidence: 0.98 },
          { fieldName: 'gender', rawValue: 'Male', confidence: 0.99 },
          { fieldName: 'aadhaar_number', rawValue: '5492 8173 9012', confidence: 0.99 },
          { fieldName: 'location', rawValue: 'Hyderabad, Telangana', confidence: 0.96 },
        ],
      };

    case 'INCOME_CERTIFICATE':
      return {
        documentType: 'INCOME_CERTIFICATE',
        rawText: `GOVERNMENT OF TELANGANA\nREVENUE DEPARTMENT - MEE SEVA\nApplication No: IC2026HYD92831\nName: Sai Sankeerth\nFather: S. Ranga Rao\nAnnual Household Income: Rs. 1,80,000/- (One Lakh Eighty Thousand Only)\nIssued Date: 12/01/2026\nStatus: Digitally Signed & Approved by Tahsildar`,
        fields: [
          { fieldName: 'full_name', rawValue: 'Sai Sankeerth', confidence: 0.97 },
          { fieldName: 'annual_income', rawValue: '180000', normalizedValue: '₹1,80,000 / year', confidence: 0.96 },
          { fieldName: 'father_name', rawValue: 'S. Ranga Rao', confidence: 0.95 },
          { fieldName: 'certificate_no', rawValue: 'IC2026HYD92831', confidence: 0.98 },
        ],
      };

    case 'COLLEGE_ID':
      return {
        documentType: 'COLLEGE_ID',
        rawText: `VIDYA JYOTHI INSTITUTE OF TECHNOLOGY\nRecognized by AICTE & Affiliated to JNTUH\nSTUDENT IDENTITY / BONAFIDE CARD\nName: Sai Sankeerth\nRoll No: 22071A0589\nDegree: B.Tech (Computer Science and Engineering)\nAcademic Year: 2026-27\nIssued by: Office of Dean, Academic Affairs`,
        fields: [
          { fieldName: 'full_name', rawValue: 'Sai Sankeerth', confidence: 0.98 },
          { fieldName: 'college_name', rawValue: 'Vidya Jyothi Institute of Technology', confidence: 0.96 },
          { fieldName: 'roll_number', rawValue: '22071A0589', confidence: 0.97 },
          { fieldName: 'education_degree', rawValue: 'B.Tech (CSE)', confidence: 0.94 },
        ],
      };

    case 'PREVIOUS_MARKSHEET':
      return {
        documentType: 'PREVIOUS_MARKSHEET',
        rawText: `JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY HYDERABAD\nConsolidated Semester Grade Report\nStudent Name: SAI SANKEERTH\nHT No: 22071A0589\nCourse: B.Tech IV-Semester (CSE)\nSGPA: 8.84 | Overall CGPA: 8.72\nResult: PASSED IN FIRST CLASS WITH DISTINCTION`,
        fields: [
          { fieldName: 'full_name', rawValue: 'Sai Sankeerth', confidence: 0.97 },
          { fieldName: 'education_degree', rawValue: 'B.Tech (CSE)', confidence: 0.93 },
          { fieldName: 'marks_percentage', rawValue: '87.2%', normalizedValue: 'CGPA 8.72', confidence: 0.98 },
        ],
      };

    case 'BANK_PASSBOOK':
      return {
        documentType: 'BANK_PASSBOOK',
        rawText: `STATE BANK OF INDIA\nHITEC CITY BRANCH HYDERABAD\nAccount Name: SAI SANKEERTH\nA/C Number: 38491029481\nIFSC Code: SBIN0012948\nMICR: 500002041\nAadhaar Seeding: ACTIVE / YES`,
        fields: [
          { fieldName: 'full_name', rawValue: 'Sai Sankeerth', confidence: 0.98 },
          { fieldName: 'bank_account_no', rawValue: '38491029481', confidence: 0.99 },
          { fieldName: 'bank_ifsc', rawValue: 'SBIN0012948', confidence: 0.99 },
          { fieldName: 'bank_name', rawValue: 'State Bank of India', confidence: 0.98 },
        ],
      };

    case 'CASTE_CERTIFICATE':
      return {
        documentType: 'CASTE_CERTIFICATE',
        rawText: `GOVERNMENT OF TELANGANA - REVENUE DEPARTMENT\nCommunity, Nativity and Date of Birth Certificate\nCertified that Sri Sai Sankeerth belongs to BC-B (Padmashali) Community.\nRecognized under OBC Category list.`,
        fields: [
          { fieldName: 'full_name', rawValue: 'Sai Sankeerth', confidence: 0.96 },
          { fieldName: 'caste_category', rawValue: 'OBC (BC-B Padmashali)', confidence: 0.94 },
        ],
      };

    default:
      return {
        documentType: 'OTHER',
        rawText: `OFFICIAL DOCUMENT\nName: Sai Sankeerth\nReference ID: DOC-${Date.now().toString().slice(-6)}\nVerified & Registered`,
        fields: [
          { fieldName: 'full_name', rawValue: 'Sai Sankeerth', confidence: 0.88 },
          { fieldName: 'reference_number', rawValue: `DOC-${Date.now().toString().slice(-6)}`, confidence: 0.91 },
        ],
      };
  }
}
