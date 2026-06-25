import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import jsPDF from 'jspdf';
import * as pdfjs from 'pdfjs-dist';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '5.6.205'}/build/pdf.worker.min.mjs`;

/**
 * Gets the number of pages in a PDF file.
 */
export const getPdfPageCount = async (file: File): Promise<number> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    return pdf.getPageCount();
  } catch (error) {
    console.error('Error getting page count:', error);
    return 0;
  }
};

/**
 * Merges multiple PDF files into a single PDF.
 */
export const mergePdfs = async (files: File[], options: { addPageNumbers?: boolean, watermarkText?: string } = {}): Promise<Uint8Array> => {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    if (options.addPageNumbers) {
      await addPageNumbers(mergedPdf);
    }

    if (options.watermarkText) {
      await addWatermark(mergedPdf, options.watermarkText);
    }

    return await mergedPdf.save();
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw new Error('فشل دمج ملفات PDF. تأكد من أن الملفات غير تالفة.');
  }
};

/**
 * Adds page numbers to a PDF document.
 */
async function addPageNumbers(pdfDoc: PDFDocument) {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  for (let i = 0; i < pages.length; i++) {
    const { width } = pages[i].getSize();
    pages[i].drawText(`${i + 1} / ${pages.length}`, {
      x: width / 2 - 10,
      y: 20,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
}

/**
 * Adds a watermark to a PDF document.
 */
async function addWatermark(pdfDoc: PDFDocument, text: string) {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: 50,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
      rotate: degrees(45),
    });
  }
}

/**
 * Splits a PDF into multiple files (one for each page).
 */
export const splitPdf = async (file: File): Promise<Uint8Array[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const pageCount = pdf.getPageCount();
  const results: Uint8Array[] = [];

  for (let i = 0; i < pageCount; i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);
    results.push(await newPdf.save());
  }

  return results;
};

/**
 * Extracts specific pages from a PDF.
 */
export const extractPages = async (file: File, pageNumbers: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  
  // pageNumbers are 1-based from UI
  const indices = pageNumbers.map(n => n - 1).filter(n => n >= 0 && n < pdf.getPageCount());
  
  const copiedPages = await newPdf.copyPages(pdf, indices);
  copiedPages.forEach(p => newPdf.addPage(p));
  
  return await newPdf.save();
};

/**
 * Deletes specific pages from a PDF.
 */
export const deletePages = async (file: File, pageNumbersToDelete: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  // Sort descending to avoid index shifting problems
  const indicesToDelete = pageNumbersToDelete.map(n => n - 1).sort((a, b) => b - a);
  
  for (const index of indicesToDelete) {
    if (index >= 0 && index < pdf.getPageCount()) {
      pdf.removePage(index);
    }
  }
  
  return await pdf.save();
};

/**
 * Advanced PDF compression by rendering pages as optimized images.
 */
export const compressPdf = async (
  file: File,
  options: { level?: 'low' | 'medium' | 'high' } = { level: 'medium' }
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Define scale and quality settings based on compression level
  // Low: original scale, high quality. Medium: balanced scale, medium quality. High: smaller scale, lower quality.
  let scale = 0.85;
  let quality = 0.55;
  
  if (options.level === 'low') {
    scale = 1.0;
    quality = 0.75;
  } else if (options.level === 'high') {
    scale = 0.7;
    quality = 0.35;
  }

  try {
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Get the first page to initialize the document size
    const firstPage = await pdf.getPage(1);
    const initialViewport = firstPage.getViewport({ scale: 1.0 });
    
    // Determine maximum dimension to prevent out-of-memory or oversized canvas
    let initialScale = scale;
    const maxDim = Math.max(initialViewport.width, initialViewport.height);
    if (maxDim > 2000) {
      initialScale = (1500 / maxDim) * scale;
    }
    
    const firstViewport = firstPage.getViewport({ scale: initialScale });
    
    const doc = new jsPDF({
      orientation: firstViewport.width > firstViewport.height ? 'l' : 'p',
      unit: 'pt',
      format: [firstViewport.width, firstViewport.height],
      compress: true
    });

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      
      let pageScale = scale;
      const pageMaxDim = Math.max(unscaledViewport.width, unscaledViewport.height);
      if (pageMaxDim > 2000) {
        pageScale = (1500 / pageMaxDim) * scale;
      }
      
      const viewport = page.getViewport({ scale: pageScale });
      
      if (i > 1) {
        doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
      }
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        // Paint white background to prevent transparency turning black in JPEG
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        const imgData = canvas.toDataURL('image/jpeg', quality);
        
        // Fit perfectly inside the page width and height
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }
    }

    const outputBlob = doc.output('blob');
    
    // If compressed version is somehow larger than the original file, fallback to structure optimization
    if (outputBlob.size >= file.size) {
      console.log(`Rasterized compression (${outputBlob.size} bytes) was larger than original (${file.size} bytes). Falling back to structural optimization.`);
      const pdfLibDoc = await PDFDocument.load(arrayBuffer);
      return await pdfLibDoc.save({ useObjectStreams: true, addDefaultPage: false });
    }
    
    return new Uint8Array(await outputBlob.arrayBuffer());
  } catch (error) {
    console.error('Compression error, falling back to basic optimization:', error);
    // Fallback to structure-only compression in case of errors
    const pdf = await PDFDocument.load(arrayBuffer);
    return await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  }
};

/**
 * Converts PDF pages to array of base64 images.
 */
export const pdfToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.8));
    }
  }

  return images;
};

/**
 * Converts multiple images into a single PDF with options.
 */
export const imagesToPdfAdvanced = async (
  files: File[], 
  options: { 
    orientation?: 'p' | 'l', 
    format?: string, 
    quality?: number,
    addPageNumbers?: boolean 
  } = {}
): Promise<Blob> => {
  const { orientation = 'p', format = 'a4' } = options;
  
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (i > 0) {
      doc.addPage();
    }

    try {
      const imgData = await readFileAsDataURL(file);
      const imgProps = await getImageProperties(imgData);

      const widthRatio = usableWidth / imgProps.width;
      const heightRatio = usableHeight / imgProps.height;
      const ratio = Math.min(widthRatio, heightRatio, 1); 

      const finalWidth = imgProps.width * ratio;
      const finalHeight = imgProps.height * ratio;

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      let imgFormat = file.type.split('/')[1]?.toUpperCase();
      if (imgFormat === 'JPEG') imgFormat = 'JPG';
      if (!['JPG', 'PNG', 'WEBP', 'BMP'].includes(imgFormat)) imgFormat = 'JPEG';

      doc.addImage(imgData, imgFormat, x, y, finalWidth, finalHeight, undefined, 'FAST');
      
      if (options.addPageNumbers) {
        doc.setFontSize(10);
        doc.text(`${i + 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    } catch (err) {
      console.warn(`Failed to process image ${file.name}, skipping...`, err);
      continue;
    }
  }

  return doc.output('blob');
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
};

const getImageProperties = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('فشل تحميل خصائص الصورة'));
    img.src = url;
  });
};

