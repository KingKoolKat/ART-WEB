export default function GalleryRoom({ title, subtitle, status, error, children }) {
  return (
    <section className="gallery-room">
      <header className="gallery-header">
        <p className="gallery-kicker">Art Style Museum Gallery</p>
        <h1 className="gallery-title">{title}</h1>
        {subtitle ? <p className="gallery-subtitle">{subtitle}</p> : null}
        {status ? <p className="gallery-status">{status}</p> : null}
        {error ? <p className="gallery-error">{error}</p> : null}
      </header>
      {children}
    </section>
  );
}
