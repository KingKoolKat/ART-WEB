import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import ArtworkModal from "./components/ArtworkModal";
import UploadPanel from "./components/UploadPanel";
import WheelCarousel from "./components/WheelCarousel";
import styleDescriptions from "../wikiart_style_descriptions.json";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const GALLERY_LIMIT = 24;
const TOP_K = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PREDICT_MAX_BYTES = 300 * 1024;
const PREDICT_QUALITY_STEPS = [0.92, 0.85, 0.78, 0.72, 0.66, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35];
const PREDICT_SCALE_STEPS = [1, 0.85, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2];

const formatStyleName = (style) =>
  style ? style.replace(/_/g, " ").replace(/\s+/g, " ").trim() : "";

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read the image file."));
    };
    img.src = url;
  });

const loadImage = async (file) => {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch (error) {
      return loadImageElement(file);
    }
  }
  return loadImageElement(file);
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to encode the image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

const buildPredictFileName = (file) => {
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const safeBase = baseName || "upload";
  return `${safeBase}-predict.jpg`;
};

const compressForPrediction = async (file) => {
  if (file.size <= PREDICT_MAX_BYTES) {
    return file;
  }
  const image = await loadImage(file);
  try {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const outputName = buildPredictFileName(file);

    for (const scale of PREDICT_SCALE_STEPS) {
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas is not available in this browser.");
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, width, height);

      for (const quality of PREDICT_QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, "image/jpeg", quality);
        if (blob.size <= PREDICT_MAX_BYTES) {
          return new File([blob], outputName, { type: blob.type });
        }
      }
    }
  } finally {
    if (image && typeof image.close === "function") {
      image.close();
    }
  }

  throw new Error("Unable to compress image below 300KB.");
};

const STYLE_LOOKUP = Object.entries(styleDescriptions).reduce((acc, [key, value]) => {
  acc[key.toLowerCase()] = value;
  return acc;
}, {});

const getStyleMeta = (style) => {
  if (!style) {
    return null;
  }
  return STYLE_LOOKUP[style.toLowerCase()] || null;
};

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [predictedStyle, setPredictedStyle] = useState("");
  const [galleryItems, setGalleryItems] = useState([]);
  const [predictStatus, setPredictStatus] = useState({ loading: false, error: "" });
  const [galleryStatus, setGalleryStatus] = useState({ loading: false, error: "" });
  const [activeArtwork, setActiveArtwork] = useState(null);
  const requestIdRef = useRef(0);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const { wheelItems, wheelStartIndex } = useMemo(() => {
    if (!previewUrl || galleryItems.length === 0) {
      return { wheelItems: [], wheelStartIndex: 0 };
    }
    const trimmed = galleryItems.slice(0, GALLERY_LIMIT);
    const splitIndex = Math.floor(trimmed.length / 2);
    const userArtwork = {
      id: "user-upload",
      title: null,
      artist: "You",
      style: predictedStyle,
      image_url: previewUrl,
      isUser: true,
    };
    return {
      wheelItems: [
        ...trimmed.slice(0, splitIndex),
        userArtwork,
        ...trimmed.slice(splitIndex),
      ],
      wheelStartIndex: splitIndex,
    };
  }, [galleryItems, previewUrl, predictedStyle]);

  const formattedStyle = predictedStyle ? formatStyleName(predictedStyle) : "";
  const galleryTitle = formattedStyle ? formattedStyle.toUpperCase() : "Awaiting Style";
  const styleMeta = getStyleMeta(predictedStyle);
  const galleryDescription = predictedStyle
    ? styleMeta?.description ||
      `A curated carousel that echoes the color, rhythm, and mood of ${formattedStyle || "your artwork"}.`
    : "Submit an artwork above to reveal the style and unlock the gallery.";
  const gallerySources = styleMeta?.sources || [];
  const introTitle = "The Art Institute of the Internet";
  const introInstruction = "Find out what style-based exhibit your artwork would be in.";

  const statusLine = predictStatus.loading
    ? "Identifying style from your upload..."
    : galleryStatus.loading
      ? "Gathering 24 works from the collection..."
      : "";

  const combinedError = predictStatus.error || galleryStatus.error;

  const handleFileSelected = (nextFile) => {
    requestIdRef.current += 1;
    setPredictedStyle("");
    setGalleryItems([]);
    setGalleryStatus({ loading: false, error: "" });
    setActiveArtwork(null);
    if (nextFile && !nextFile.type.startsWith("image/")) {
      setFile(null);
      setPredictStatus({
        loading: false,
        error: "Please upload a JPG, PNG, or WebP image file.",
      });
      return;
    }
    if (nextFile && nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setPredictStatus({
        loading: false,
        error: "That file is too large. Please choose an image under 10MB.",
      });
      return;
    }
    setFile(nextFile || null);
    setPredictStatus({ loading: false, error: "" });
  };

  const fetchGallery = async (style, requestId = requestIdRef.current) => {
    if (!API_BASE_URL) {
      setGalleryStatus({
        loading: false,
        error: "Missing API URL. Set VITE_API_URL in .env and restart the dev server.",
      });
      return;
    }

    setGalleryStatus({ loading: true, error: "" });
    console.info("[gallery] request", {
      style,
      limit: GALLERY_LIMIT,
      url: `${API_BASE_URL}/gallery?style=${encodeURIComponent(style)}&limit=${GALLERY_LIMIT}`,
    });
    try {
      const res = await fetch(
        `${API_BASE_URL}/gallery?style=${encodeURIComponent(style)}&limit=${GALLERY_LIMIT}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Gallery request failed (${res.status})`);
      }
      const data = await res.json();
      if (requestIdRef.current !== requestId) {
        return;
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      console.info("[gallery] response", {
        style: data?.style,
        count: items.length,
        sample: items.slice(0, 3),
      });
      setGalleryItems(items.slice(0, GALLERY_LIMIT));
      setGalleryStatus({ loading: false, error: "" });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setGalleryStatus({
        loading: false,
        error: error?.message || "Gallery request failed. Please try again.",
      });
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setPredictStatus({ loading: false, error: "Select an artwork to analyze." });
      return;
    }
    if (galleryRef.current) {
      galleryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!API_BASE_URL) {
      setPredictStatus({
        loading: false,
        error: "Missing API URL. Set VITE_API_URL in .env and restart the dev server.",
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setPredictStatus({ loading: true, error: "" });
    setGalleryStatus({ loading: false, error: "" });
    setGalleryItems([]);

    try {
      const payloadFile = await compressForPrediction(file);
      if (requestIdRef.current !== requestId) {
        return;
      }
      const form = new FormData();
      form.append("file", payloadFile);

      console.info("[predict] request", {
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        payloadName: payloadFile?.name,
        payloadSize: payloadFile?.size,
        payloadType: payloadFile?.type,
        url: `${API_BASE_URL}/predict-style?top_k=${TOP_K}`,
      });
      const res = await fetch(`${API_BASE_URL}/predict-style?top_k=${TOP_K}`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Predict request failed (${res.status})`);
      }

      const data = await res.json();
      if (requestIdRef.current !== requestId) {
        return;
      }
      console.info("[predict] response", data);
      const style = data?.predicted?.style || data?.top_k?.[0]?.style;
      if (!style) {
        throw new Error("No style returned from prediction.");
      }
      setPredictedStyle(style);
      setPredictStatus({ loading: false, error: "" });
      fetchGallery(style, requestId);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setPredictStatus({
        loading: false,
        error: error?.message || "Prediction failed. Please try again.",
      });
    }
  };

  return (
    <main className="gallery-room">
      <section className="intro-section">
        <header className="intro-header">
          <p className="intro-kicker">JON HOGG PRESENTS</p>
          <h1 className="intro-title">{introTitle}</h1>
          <p className="intro-instruction">{introInstruction}</p>
        </header>
        <div className="intro-upload">
          <UploadPanel
            previewUrl={previewUrl}
            fileName={file?.name}
            onFileSelected={handleFileSelected}
            onAnalyze={handleAnalyze}
            isLoading={predictStatus.loading}
            error={predictStatus.error}
            disabled={!file}
            variant="hero"
          />
        </div>
      </section>

      <section className="gallery-section" ref={galleryRef}>
        <header className="gallery-header">
          <p className="gallery-kicker">Exhibit Gallery</p>
          <h2 className="gallery-title">{galleryTitle}</h2>
          <p className="gallery-description">{galleryDescription}</p>
          {gallerySources.length ? (
            <div className="gallery-sources">
              <span className="gallery-sources-label">Sources</span>
              <div className="gallery-sources-links">
                {gallerySources.map((source) => (
                  <a
                    key={source.url || `${source.org}-${source.title}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.org}: {source.title}
                  </a>
                ))}
              </div>
              {styleMeta?.accessed ? (
                <span className="gallery-sources-accessed">Accessed {styleMeta.accessed}</span>
              ) : null}
            </div>
          ) : null}
          {statusLine ? <p className="gallery-status">{statusLine}</p> : null}
          {combinedError ? <p className="gallery-error">{combinedError}</p> : null}
        </header>

        <div className="gallery-stage">
          {galleryStatus.loading ? (
            <div className="gallery-loading">
              <span className="gallery-loading-title">Hanging the exhibit</span>
              <span>Arranging a curated set from the vault...</span>
            </div>
          ) : wheelItems.length ? (
            <WheelCarousel
              items={wheelItems}
              startIndex={wheelStartIndex}
              onArtworkClick={setActiveArtwork}
            />
          ) : (
            <div className="gallery-empty">
              <span className="gallery-empty-title">The wall awaits</span>
              <span>Upload an artwork to build your gallery room.</span>
              {predictedStyle && galleryStatus.error ? (
                <button
                  type="button"
                  className="gallery-retry"
                  onClick={() => fetchGallery(predictedStyle)}
                >
                  Retry gallery load
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <ArtworkModal artwork={activeArtwork} onClose={() => setActiveArtwork(null)} />
    </main>
  );
}
