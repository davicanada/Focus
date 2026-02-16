// Client-side PDF text extraction using pdfjs-dist (Mozilla PDF.js)
// PDF never leaves the browser (LGPD compliant)

import type { TextItem } from 'pdfjs-dist/types/src/display/api';

/**
 * Extract text from a PDF file, returning an array of strings (one per page).
 * Runs entirely client-side using pdfjs-dist.
 * Uses CDN worker to avoid Next.js bundling issues with import.meta.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  // Dynamic import to keep bundle small
  const pdfjsLib = await import('pdfjs-dist');

  // Use CDN worker matching the installed version to avoid import.meta bundling issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.624/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages: string[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    pages.push(pageText);
    onProgress?.(i, totalPages);
  }

  return pages;
}
