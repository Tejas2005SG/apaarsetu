"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "./ui";

export function verifyUrl(token: string) {
  return `${window.location.origin}/verify?t=${encodeURIComponent(token)}`;
}

export function QrImage({ value, size = 260, downloadName }: { value: string; size?: number; downloadName?: string }) {
  const big = useRef<HTMLDivElement>(null);
  const save = () => {
    const canvas = big.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = downloadName ?? "apaar-setu-qr.png";
    a.click();
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-md border border-line bg-white p-2">
        <QRCodeCanvas value={value} size={size} level="L" marginSize={2} />
      </div>
      <div ref={big} className="hidden">
        <QRCodeCanvas value={value} size={720} level="L" marginSize={4} />
      </div>
      {downloadName && <button onClick={save} className="text-[12.5px] font-medium text-brand-700 hover:underline">Download QR image</button>}
    </div>
  );
}

export async function decodeQrFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    for (const max of [1000, 700, 1400]) {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      const code = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
      if (code?.data) return code.data;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CameraScanner({ onResult }: { onResult: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setActive(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not allow camera access. Upload a QR image instead.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.current = s;
      setActive(true);
      const v = video.current!;
      v.srcObject = s;
      await v.play();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const tick = () => {
        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          ctx.drawImage(v, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) {
            stop();
            onResult(code.data);
            return;
          }
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch {
      stop();
      setError("Camera permission was refused or no camera was found. Upload a QR image instead.");
    }
  };

  return (
    <div>
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-line bg-slate-900">
        <video ref={video} muted playsInline className={active ? "h-full w-full object-cover" : "hidden"} />
        {active && <div className="pointer-events-none absolute inset-[18%] rounded-md border-2 border-white/80" />}
        {!active && <Camera size={30} className="text-slate-500" />}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {active ? (
          <Button size="sm" variant="secondary" onClick={stop}><CameraOff size={14} /> Stop camera</Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={start}><Camera size={14} /> Start camera</Button>
        )}
        <span className="text-[12px] text-muted">Hold the student&apos;s QR inside the frame.</span>
      </div>
      {error && <div className="mt-2 text-[12.5px] text-red-700">{error}</div>}
    </div>
  );
}
