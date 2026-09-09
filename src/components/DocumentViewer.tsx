import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, Minus, Plus, RotateCcw, ExternalLink } from "lucide-react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type ViewerFile = {
  title: string;
  fileName: string;
  fileType: string | null;
  /** A ready-to-use URL (signed or public) for the file. */
  url: string;
};

/**
 * Full-screen preview with zoom in / zoom out for any document in the portal.
 * Images and PDFs render inline; anything else offers a download.
 */
export function DocumentViewer({
  file,
  open,
  onOpenChange,
  onDownload,
}: {
  file: ViewerFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, file?.url, reset]);

  /** Zoom around a point in container coordinates, keeping it stationary. */
  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
    const k = next / z;
    setZoom(next);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  const zoomFromCenter = useCallback(
    (factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      zoomAt(factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
    },
    [zoomAt],
  );

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(Math.exp(-dy * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, file?.url]);

  // Drag to pan while zoomed in
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const type = file?.fileType ?? "";
  const isImage = type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file?.fileName ?? "");
  const isPdf = type.includes("pdf") || /\.pdf$/i.test(file?.fileName ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-3 p-4 sm:max-w-[96vw]">
        <DialogHeader className="pr-10">
          <DialogTitle className="truncate text-left font-serif text-xl">{file?.title ?? "Document"}</DialogTitle>
          <p className="truncate text-left text-xs text-muted-foreground">{file?.fileName}</p>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-1">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => zoomFromCenter(1 / 1.25)} aria-label="Zoom out">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" className="px-2" onClick={() => zoomFromCenter(1.25)} aria-label="Zoom in">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => zoomFromCenter(2)}>
            <Maximize2 className="h-3.5 w-3.5" /> Zoom 2x
          </Button>
          {onDownload && (
            <Button variant="outline" size="sm" className="gap-1" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          )}
          {file?.url && (
            <Button asChild variant="outline" size="sm" className="gap-1">
              <a href={file.url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </a>
            </Button>
          )}
          <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
            Scroll or pinch to zoom · drag to move
          </span>
        </div>

        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="relative flex-1 overflow-hidden rounded-md border border-border bg-muted/30"
          style={{ touchAction: "none", cursor: zoom > 1 ? "grab" : "default" }}
        >
          {!file ? null : isImage ? (
            <img
              src={file.url}
              alt={file.title}
              draggable={false}
              className="absolute left-0 top-0 max-w-none select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                width: "100%",
                objectFit: "contain",
              }}
            />
          ) : isPdf ? (
            <div
              className="absolute left-0 top-0 h-full w-full"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            >
              <iframe src={file.url} title={file.title} className="h-full w-full border-0 bg-background" />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                This file type can’t be previewed in the browser. Download it to open in Word, Excel or PowerPoint.
              </p>
              {onDownload && (
                <Button onClick={onDownload} className="gap-1">
                  <Download className="h-4 w-4" /> Download {file.fileName}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
