import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { X, Upload, Plus } from "../icons";

function stopStream(streamRef: MutableRefObject<MediaStream | null>): void {
  const stream = streamRef.current;
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

interface CameraOverlayProps {
  onClose?: () => void;
  onCapture?: (dataUrl: string) => void;
  onUpload?: () => void;
  onAddManual?: () => void;
  processing?: boolean;
}

export default function CameraOverlay({
  onClose,
  onCapture,
  onUpload,
  onAddManual,
  processing = false,
}: CameraOverlayProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [ready, setReady] = useState<boolean>(false);

  const captureDisabled = processing || !ready || !!error;

  useEffect(() => {
    let mounted = true;
    const constraints = {
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    };

    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera permissions error:", err);
        setError("Camera unavailable. Please allow access or use Upload instead.");
      }
    };

    if ("mediaDevices" in navigator && typeof navigator.mediaDevices.getUserMedia === "function") {
      initStream();
    } else {
      setError("Camera not supported on this device.");
    }

    return () => {
      mounted = false;
      stopStream(streamRef);
    };
  }, []);

  const handleCapture = async (): Promise<void> => {
    if (captureDisabled || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    onCapture?.(dataUrl);
  };

  const cornerClass = useMemo(
    () =>
      "absolute h-20 w-20 border-2 border-white/80 mix-blend-screen",
    []
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 text-white">
      <button
        type="button"
        className="absolute left-5 top-[calc(env(safe-area-inset-top,0px)+1.25rem)] z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white transition hover:bg-white/15"
        onClick={() => {
          stopStream(streamRef);
          onClose?.();
        }}
        aria-label="Close camera"
      >
        <X size={20} />
      </button>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          autoPlay
          muted
          onLoadedMetadata={() => setReady(true)}
        />
        <div className={`${cornerClass} left-6 top-[18%] rounded-tl-3xl border-r-0 border-b-0`} />
        <div className={`${cornerClass} right-6 top-[18%] rounded-tr-3xl border-l-0 border-b-0`} />
        <div className={`${cornerClass} bottom-[18%] left-6 rounded-bl-3xl border-r-0 border-t-0`} />
        <div className={`${cornerClass} bottom-[18%] right-6 rounded-br-3xl border-l-0 border-t-0`} />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm font-medium text-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="relative flex flex-col gap-6 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] pt-6">
        <div className="flex justify-center">
          <button
            type="button"
            className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 transition ${
              captureDisabled ? "opacity-40" : "hover:bg-white/30"
            }`}
            onClick={handleCapture}
            disabled={captureDisabled}
            aria-label="Capture receipt"
          >
            <div className="absolute inset-[9px] rounded-full border border-white/90 bg-white/80" />
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              </div>
            )}
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <h3 className="text-center text-sm font-semibold tracking-wide text-white/90">
            Capture or choose another option
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                onUpload?.();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Upload size={18} />
              Upload bill
            </button>
            <button
              type="button"
              onClick={() => {
                onAddManual?.();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/15"
            >
              <Plus size={18} />
              Add manually
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
