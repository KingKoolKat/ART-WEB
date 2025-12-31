import { useEffect } from "react";

const formatStyle = (style) =>
  style ? style.replace(/_/g, " ").replace(/\s+/g, " ").trim() : "";

export default function ArtworkModal({ artwork, onClose }) {
  useEffect(() => {
    if (!artwork) {
      return undefined;
    }

    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [artwork, onClose]);

  if (!artwork) {
    return null;
  }

  const artist = artwork.artist?.trim();
  const displayTitle = artist || "Unknown Artist";
  const style = formatStyle(artwork.style);
  const altText = artist || "Artwork";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
        <div className="modal-image">
          <img src={artwork.image_url} alt={altText} />
        </div>
        <div className="modal-meta">
          <h2>{displayTitle}</h2>
          {style ? <span className="modal-style">{style}</span> : null}
        </div>
      </div>
    </div>
  );
}
