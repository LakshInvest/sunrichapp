import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCw, X } from "lucide-react";

/** Full-screen photo cropper: circular mask, pinch/slider zoom (1–3x),
 * drag, 90° rotation, dark overlay. onSave receives the cropped 512×512
 * JPEG blob (~0.85 quality, compressed under 300 KB). */

const OUT_SIZE = 512;
const MAX_BYTES = 300 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

const radianAngle = (deg: number) => (deg * Math.PI) / 180;

/**
 * Draws the (rotated) image onto its bounding box — the same coordinate space
 * react-easy-crop reports croppedAreaPixels in — then scales exactly the
 * chosen square into a 512×512 canvas on a white background (JPEG has no
 * transparency, so unfilled pixels would turn black).
 */
async function renderCrop(src: string, crop: Area, rotation: number): Promise<HTMLCanvasElement | null> {
  const image = await loadImage(src);
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const rad = radianAngle(rotation);
  const bw = Math.abs(Math.cos(rad) * w) + Math.abs(Math.sin(rad) * h);
  const bh = Math.abs(Math.sin(rad) * w) + Math.abs(Math.cos(rad) * h);
  // Phones cap canvas size; shrink huge camera photos first and scale the crop with them.
  const scale = Math.min(1, 4096 / Math.max(bw, bh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bw * scale);
  canvas.height = Math.round(bh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(rad);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);

  const out = document.createElement("canvas");
  out.width = out.height = OUT_SIZE;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;
  outCtx.fillStyle = "#ffffff";
  outCtx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(
    canvas,
    crop.x * scale,
    crop.y * scale,
    crop.width * scale,
    crop.height * scale,
    0,
    0,
    OUT_SIZE,
    OUT_SIZE,
  );
  return out;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

export function PhotoCrop({
  src,
  busy,
  onCancel,
  onSave,
}: {
  src: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const cropArea = useRef<Area | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(src);
  }, [src]);

  const save = async () => {
    if (busy) return;
    const area = cropArea.current;
    if (!area) return;
    const canvas = await renderCrop(src, area, rotation);
    if (!canvas) return;
    let blob = await canvasToBlob(canvas);
    // Re-encode at lower quality until the blob fits under 300 KB.
    for (const q of [0.7, 0.55, 0.4]) {
      if (!blob || blob.size <= MAX_BYTES) break;
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    }
    if (!blob) return;
    onSave(blob);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t("account.cropTitle")} className="fixed inset-0 z-50 flex flex-col bg-black">
      <header className="flex items-center justify-between px-4 pb-2 pt-4 text-white">
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("account.cancel")}
          className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-base font-bold">{t("account.cropTitle")}</p>
        <button
          type="button"
          onClick={() => setRotation((r) => r + 90)}
          disabled={busy}
          aria-label={t("account.rotate")}
          className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-50"
        >
          <RotateCw className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          minZoom={1}
          maxZoom={3}
          restrictPosition={false}
          style={{ containerStyle: { backgroundColor: "#000" } }}
          classes={{}}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, area) => {
            cropArea.current = area;
          }}
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
          </div>
        )}
      </div>

      <div className="px-5 pb-2 pt-4">
        <label htmlFor="photo-zoom" className="mb-1.5 block text-xs font-medium text-white/70">
          {t("account.zoom")}
        </label>
        <input
          id="photo-zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          disabled={busy}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-11 w-full accent-white"
        />
      </div>

      <div className="flex gap-3 px-5 pb-8 pt-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-12 flex-1 rounded-xl border border-white/40 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {t("account.cancel")}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="min-h-12 flex-1 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? t("account.saving") : t("account.save")}
        </button>
      </div>
    </div>
  );
}
