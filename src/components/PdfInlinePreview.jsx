import React, { useEffect, useRef, useState } from 'react';

const base64ToUint8Array = (base64String) => {
  try {
    const base64Parts = base64String.split(',');
    const rawBase64 = (base64Parts.length > 1 ? base64Parts[1] : base64Parts[0])
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/\s/g, ''); // Remove all whitespace/newlines
    
    // Dynamic padding correction
    let paddedBase64 = rawBase64;
    while (paddedBase64.length % 4 !== 0) {
      paddedBase64 += '=';
    }

    const binaryString = atob(paddedBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    throw new Error('Failed to decode file contents (base64 invalid): ' + e.message);
  }
};

export default function PdfInlinePreview({ pdfData }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);

  useEffect(() => {
    let active = true;
    async function renderPdf() {
      if (!window.pdfjsLib) {
        // Wait a bit to let script mount in window
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!window.pdfjsLib) {
        setError('PDF viewer engine is downloading. Please wait a second and reopen.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // WORKAROUND FOR SAME-ORIGIN WORKER POLICY:
        // Browsers block direct cross-origin workers (e.g. cloud CDN URL on a local IP site).
        // Creating a Blob worker and calling importScripts bypasses this perfectly!
        const workerCode = `importScripts("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js");`;
        const blob = new Blob([workerCode], { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(blob);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        
        const bytes = base64ToUint8Array(pdfData);
        const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        
        if (!active) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error rendering PDF:', err);
        if (active) {
          setError(`Could not render PDF inline: ${err.message || err.toString()}`);
          setLoading(false);
        }
      }
    }

    renderPdf();
    return () => { active = false; };
  }, [pdfData]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    
    let active = true;
    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (!active || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        // 1. Get natural dimensions at 1.0 scale
        const baseViewport = page.getViewport({ scale: 1.0 });
        
        // 2. Identify the target container width
        const containerWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 360;
        
        // 3. Crisp High-DPI multiplier: scale to minimum 3x for crystal-clear text readability
        const dpr = window.devicePixelRatio || 2.0;
        const renderScale = (containerWidth / baseViewport.width) * Math.max(dpr, 3.0);
        const highResViewport = page.getViewport({ scale: renderScale });
        
        // 4. Set high-resolution canvas drawing buffer size
        canvas.width = highResViewport.width;
        canvas.height = highResViewport.height;
        
        // 5. Constraint physical rendering dimensions to compress the canvas buffer into standard view sizes
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        const renderContext = {
          canvasContext: context,
          viewport: highResViewport
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    }
    
    renderPage();
    return () => { active = false; };
  }, [pdfDoc, currentPage]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
        ⏳ Formatting and loading digital document preview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--mobile-danger)', fontSize: '0.85rem' }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%', 
        marginBottom: '10px', 
        fontSize: '0.8rem',
        padding: '0 4px'
      }}>
        <button 
          type="button"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
          disabled={currentPage <= 1}
          style={{ 
            padding: '4px 10px', 
            borderRadius: '6px', 
            border: '1px solid #ccc', 
            backgroundColor: '#fff',
            color: '#333',
            fontSize: '0.75rem',
            fontWeight: '600',
            opacity: currentPage <= 1 ? 0.4 : 1,
            cursor: currentPage <= 1 ? 'default' : 'pointer'
          }}
        >
          ◀ Previous
        </button>
        <span style={{ fontWeight: '700', color: '#555' }}>Page {currentPage} of {numPages}</span>
        <button 
          type="button"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages))} 
          disabled={currentPage >= numPages}
          style={{ 
            padding: '4px 10px', 
            borderRadius: '6px', 
            border: '1px solid #ccc', 
            backgroundColor: '#fff',
            color: '#333',
            fontSize: '0.75rem',
            fontWeight: '600',
            opacity: currentPage >= numPages ? 0.4 : 1,
            cursor: currentPage >= numPages ? 'default' : 'pointer'
          }}
        >
          Next ▶
        </button>
      </div>
      <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
      </div>
    </div>
  );
}
