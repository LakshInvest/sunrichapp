import { useEffect, useRef, useState } from "react";

/** Renders every PDF page as a canvas (browser only; lazy-loaded by the bill viewer). */
export default function PdfPages({ url, onError }: { url: string; onError: () => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const doc = await pdfjs.getDocument({ url }).promise;
        const el = box.current;
        if (!live || !el) return;
        el.innerHTML = "";
        const width = el.clientWidth || 360;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / base.width) * ratio });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          c.style.width = "100%"; c.className = "rounded-lg bg-card shadow-sm";
          el.appendChild(c);
          const ctx = c.getContext("2d");
          if (ctx) await page.render({ canvasContext: ctx, viewport: vp }).promise;
          if (!live) return;
        }
        setLoading(false);
      } catch (e) {
        console.warn("[sunrich] bill pdf", e);
        if (live) onError();
      }
    })();
    return () => { live = false; };
  }, [url, onError]);
  return (
    <>
      {loading && <div className="h-[70vh] animate-pulse rounded-lg bg-muted" />}
      <div ref={box} className="space-y-3" />
    </>
  );
}
