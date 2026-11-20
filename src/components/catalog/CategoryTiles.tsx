import { useEffect, useState } from "react";
import { sizedUrl } from "@/components/SmartImage";

/** Fixed soft pastel palette (never dark), assigned by position. */
export const TILE_TINTS = ["#E3F4F9", "#E6EEFB", "#FBF4DC", "#E3F5EC", "#FCEBE1"] as const;

const verdict = new Map<string, boolean>();

/** True when the image has transparent corners (a real cutout). Unknown (CORS) → false. */
export function isCutout(url: string): Promise<boolean> {
  if (verdict.has(url)) return Promise.resolve(verdict.get(url)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let ok = false;
      try {
        const c = document.createElement("canvas");
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 16, 16);
          const px = ctx.getImageData(0, 0, 16, 16).data;
          ok = [0, 15, 240, 255].every((i) => px[i * 4 + 3]! < 40);
        }
      } catch {
        ok = false;
      }
      verdict.set(url, ok);
      resolve(ok);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export type Tile = { id: string; code: string; name: string; imageUrl: string | null; fallbackImage: string | null };

function TileArt({ tile }: { tile: Tile }) {
  const [src, setSrc] = useState<{ url: string; multiply: boolean } | null>(
    tile.imageUrl ? null : tile.fallbackImage ? { url: tile.fallbackImage, multiply: true } : null,
  );
  useEffect(() => {
    if (!tile.imageUrl) return;
    let live = true;
    // Small (WebP-negotiated) copy for both the transparency check and display.
    const small = sizedUrl(tile.imageUrl, 240);
    void isCutout(small).then((cut) => {
      if (!live) return;
      if (cut) setSrc({ url: small, multiply: false });
      else if (tile.fallbackImage) setSrc({ url: tile.fallbackImage, multiply: true });
      else setSrc({ url: small, multiply: true });
    });
    return () => {
      live = false;
    };
  }, [tile.imageUrl, tile.fallbackImage]);
  if (!src) return null;
  return (
    <img
      src={src.url}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-[80%] w-[80%] object-contain"
      style={src.multiply ? { mixBlendMode: "multiply" } : undefined}
      onError={(e) => {
        const img = e.currentTarget;
        if (src.url !== tile.imageUrl && tile.imageUrl && !img.dataset["plain"]) { img.dataset["plain"] = "1"; img.src = tile.imageUrl; }
        else img.hidden = true;
      }}
    />
  );
}

export function CategoryTiles({ tiles, onOpen }: { tiles: Tile[]; onOpen: (code: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto bg-background px-3 pb-3 pt-1">
      {tiles.map((tile, i) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onOpen(tile.code)}
          className="flex w-[calc((100vw-1.5rem-2.25rem)/4)] max-w-[88px] shrink-0 flex-col items-center gap-1.5 text-center transition active:scale-95"
        >
          <span
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl"
            style={{ backgroundColor: TILE_TINTS[i % TILE_TINTS.length] }}
          >
            <TileArt tile={tile} />
          </span>
          <span className="w-full truncate text-[13px] font-medium leading-tight text-foreground">{tile.name}</span>
        </button>
      ))}
    </div>
  );
}
