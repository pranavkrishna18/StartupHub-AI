const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Decodes a base64 string and writes it to disk.
 * Supports data URI format (e.g. data:application/pdf;base64,...)
 * Returns a relative URL path to be saved in the DB (e.g., /uploads/resumes/filename.pdf)
 */
exports.saveBase64Pdf = async (base64Str) => {
  if (!base64Str) return null;

  // 1. Check if it's already a saved file URL path
  if (base64Str.startsWith('/uploads/')) {
    return base64Str;
  }

  // 2. Parse MIME type and extract base64 data
  let mimeType = 'application/pdf';
  let base64Data = base64Str;

  if (base64Str.includes(';base64,')) {
    const parts = base64Str.split(';base64,');
    mimeType = parts[0].replace('data:', '');
    base64Data = parts[1];
  }

  // 3. Verify it is a PDF
  if (mimeType !== 'application/pdf') {
    throw new Error('Only PDF resume files are supported');
  }

  // 4. Decode base64 buffer
  const buffer = Buffer.from(base64Data, 'base64');

  // 5. Ensure target uploads folder exists
  const uploadsDir = path.join(__dirname, '../../uploads/resumes');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 6. Generate a secure, unique filename
  const fileHash = crypto.randomBytes(16).toString('hex');
  const filename = `resume-${Date.now()}-${fileHash}.pdf`;
  const filePath = path.join(uploadsDir, filename);

  // 7. Write buffer to disk asynchronously
  await fs.promises.writeFile(filePath, buffer);

  // 8. Return standard relative resource URL path
  return `/uploads/resumes/${filename}`;
};
