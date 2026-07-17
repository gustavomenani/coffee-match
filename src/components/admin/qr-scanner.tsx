"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DetectedBarcode = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type Props = {
  onCode: (code: string) => void;
};

export function QrScanner({ onCode }: Props) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stoppedRef = useRef(false);

  const stopCamera = useCallback(() => {
    stoppedRef.current = true;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function startCamera() {
    setMessage(null);

    if (!("BarcodeDetector" in window)) {
      setMessage(
        "Leitura por câmera não suportada neste navegador — use o campo de código.",
      );
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
    } catch {
      setMessage(
        "Não foi possível acessar a câmera. Verifique a permissão de câmera do navegador e tente novamente — ou use o campo de código.",
      );
      return;
    }

    streamRef.current = stream;
    stoppedRef.current = false;
    setScanning(true);

    // Wait for the <video> element to mount before attaching the stream.
    requestAnimationFrame(async () => {
      const video = videoRef.current;
      if (!video || stoppedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // play() can reject if the user closes the camera immediately.
      }

      const Detector = (
        window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }
      ).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });

      const tick = async () => {
        if (stoppedRef.current || !videoRef.current) return;
        if (videoRef.current.readyState >= 2) {
          try {
            const codes = await detector.detect(videoRef.current);
            const text = codes[0]?.rawValue?.trim();
            if (text) {
              stopCamera();
              onCode(text);
              return;
            }
          } catch {
            // Detection can fail transiently on some frames — keep looping.
          }
        }
        if (!stoppedRef.current) {
          setTimeout(tick, 150);
        }
      };
      void tick();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {scanning ? (
        <>
          <div className="w-full max-w-sm overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="block h-auto w-full"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-secondary btn-sm"
            >
              Fechar câmera
            </button>
          </div>
        </>
      ) : (
        <div>
          <button
            type="button"
            onClick={startCamera}
            className="btn btn-secondary btn-sm"
          >
            Escanear QR
          </button>
        </div>
      )}

      {message ? (
        <p
          role="status"
          className="flash-warning rounded-[var(--radius-sm)] px-3 py-3 text-sm"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
