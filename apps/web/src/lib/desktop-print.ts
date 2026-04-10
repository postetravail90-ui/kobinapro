/**
 * Desktop printing utility for KOBINA PRO
 * Handles receipt printing for both web and Tauri desktop
 */

import { isTauri } from './platform';

interface PrintOptions {
  title?: string;
  html: string;
  width?: number;
}

/**
 * Print HTML content — works in both web and desktop
 * Uses a hidden iframe approach for clean printing
 */
export function printHTML({ title = 'KOBINA PRO - Reçu', html, width = 300 }: PrintOptions): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { margin: 4mm; size: ${width}px auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: ${width}px; color: #000; }
        .receipt-container { padding: 8px; }
      </style>
    </head>
    <body>
      <div class="receipt-container">${html}</div>
    </body>
    </html>
  `);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  };
}

/**
 * Save receipt as file (desktop: Tauri save dialog, web: print-to-PDF)
 */
export async function saveReceiptPDF(html: string, _filename: string = 'recu.pdf'): Promise<void> {
  if (isTauri()) {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri?.dialog?.save && tauri?.fs?.writeTextFile) {
        const path = await tauri.dialog.save({
          defaultPath: _filename.replace('.pdf', '.html'),
          filters: [{ name: 'HTML', extensions: ['html'] }],
        });
        if (path) {
          await tauri.fs.writeTextFile(path, `<!DOCTYPE html><html><body>${html}</body></html>`);
          return;
        }
      }
    } catch {
      // Fallback to print
    }
  }

  printHTML({ html });
}
