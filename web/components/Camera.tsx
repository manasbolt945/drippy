"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OCCASIONS, type OccasionId } from "@/lib/occasions";
import { Flash, Flip, Gallery, HistoryIcon } from "./icons";

type CamState = "starting" | "live" | "blocked" | "unsupported";
type Facing = "environment" | "user";

interface Props {
  occasion: OccasionId | null;
  onOccasion: (o: OccasionId | null) => void;
  onPhoto: (photo: Blob) => void;
  onUpload: () => void;
  onHistory: () => void;
}

export default function Camera({ occasion, onOccasion, onPhoto, onUpload, onHistory }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>("starting");
  const [facing, setFacing] = useState<Facing>("environment");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    setState("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchAvailable(!!caps.torch);
        setTorchOn(false);
        if (videoRef.current) videoRef.current.srcObject = stream;
        setState("live");
      })
      .catch((err: DOMException) => {
        if (!cancelled) setState(err.name === "NotAllowedError" || err.name === "SecurityError" ? "blocked" : "unsupported");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || state !== "live" || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") {
      // Keep the photo the way the user saw it in the mirrored preview.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onPhoto(blob), "image/jpeg", 0.92);
  }, [facing, onPhoto, state]);

  return (
    <div className="screen" style={{ background: "#0B1026" }}>
      <video
        ref={videoRef}
        className={`viewfinder${facing === "user" ? " mirror" : ""}`}
        autoPlay
        playsInline
        muted
        aria-label="Camera viewfinder"
      />

      {state === "live" && (
        <svg className="frame-guides" viewBox="0 0 390 844" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M70 150 v-30 h30 M320 150 v-30 h-30 M70 690 v30 h30 M320 690 v30 h-30"
            fill="none" stroke="#F4EFE3" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {state !== "live" && state !== "starting" && (
        <div style={{ position: "absolute", inset: 0, background: "var(--sky)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 36px", textAlign: "center" }}>
          <span className="display" style={{ fontSize: 24 }}>
            {state === "blocked" ? "Camera is off" : "Camera isn't available here"}
          </span>
          <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
            {state === "blocked"
              ? "Allow camera access for this site in your browser settings, or upload a photo of your fit."
              : "This browser can't open the camera. You can still upload a photo of your fit."}
          </p>
          <button type="button" className="btn btn-gold" style={{ marginTop: 8, width: "100%" }} onClick={onUpload}>
            Upload a photo
          </button>
        </div>
      )}

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "calc(12px + var(--safe-top)) 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" className="icon-btn" aria-label="Your past fits" onClick={onHistory}><HistoryIcon /></button>
        <span className="display" style={{ fontSize: 20 }}>Drippy</span>
        {torchAvailable ? (
          <button
            type="button"
            className="icon-btn"
            aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
            aria-pressed={torchOn}
            onClick={toggleTorch}
            style={torchOn ? { background: "var(--gold-grad)", color: "var(--on-gold)" } : undefined}
          >
            <Flash />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      {state === "live" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "calc(70px + var(--safe-top))", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ padding: "8px 14px", borderRadius: 999, background: "var(--scrim)", fontSize: 13, fontWeight: 600 }}>
            Fit your whole outfit in the frame
          </div>
        </div>
      )}

      <div className="bottom-fade" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "72px 0 calc(24px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#D9D9DE" }}>Where are you headed?</span>
          <div className="chips" role="radiogroup" aria-label="Where are you headed?">
            <button type="button" role="radio" aria-checked={occasion === null} className={`chip${occasion === null ? " on" : ""}`} onClick={() => onOccasion(null)}>
              Anywhere
            </button>
            {OCCASIONS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={occasion === o.id} className={`chip${o.featured ? " glow" : ""}${occasion === o.id ? " on" : ""}`} onClick={() => onOccasion(o.id)}>
                {o.featured && <Diya />}
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
          <button type="button" className="round-tool square" aria-label="Pick a photo from your gallery" onClick={onUpload}><Gallery /></button>
          <button type="button" className="shutter" aria-label="Take photo" onClick={capture} disabled={state !== "live"}><span /></button>
          <button
            type="button"
            className="round-tool"
            aria-label="Switch camera"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            disabled={state === "blocked" || state === "unsupported"}
          >
            <Flip />
          </button>
        </div>
      </div>
    </div>
  );
}

/** A little diya (oil lamp) for the Diwali chip. */
function Diya() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path className="diya-flame" d="M12 2.5c1.9 2.3 2.7 3.9 2.7 5.4A2.7 2.7 0 0 1 12 10.6a2.7 2.7 0 0 1-2.7-2.7c0-1.5.8-3.1 2.7-5.4z" fill="#FFB547" />
      <path d="M2.5 12.5h19c-.7 4.2-4.6 7.5-9.5 7.5s-8.8-3.3-9.5-7.5z" fill="currentColor" />
    </svg>
  );
}
