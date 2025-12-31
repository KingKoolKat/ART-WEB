export default function ArtworkCard({ item, isCenter, onClick }) {
  const artist = item.artist?.trim();
  const displayTitle = artist || "Unknown Artist";
  const altText = artist || "Artwork";

  return (
    <button
      type="button"
      className={`artwork-card ${isCenter ? "is-center" : ""}`}
      onClick={() => onClick?.(item)}
    >
      <div className="artwork-frame">
        <div className="artwork-matte">
          <img src={item.image_url} alt={altText} loading="lazy" />
        </div>
      </div>
      <div className="artwork-plaque">
        <span className="plaque-title">{displayTitle}</span>
      </div>
    </button>
  );
}
