import { useRef, useState } from "react";

export default function UploadPanel({
  previewUrl,
  fileName,
  onFileSelected,
  onAnalyze,
  isLoading,
  error,
  disabled,
  variant = "panel",
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasPreview = Boolean(previewUrl);
  const showMeta = Boolean(fileName || error || isLoading);
  const showAnalyze = Boolean(fileName || isLoading);
  const panelClassName =
    variant === "hero" ? "upload-panel upload-panel--hero" : "upload-panel";
  const dropClassName = `upload-drop ${hasPreview ? "has-preview" : "is-empty"}${
    isDragging ? " is-dragging" : ""
  }`;

  function handleBrowse() {
    inputRef.current?.click();
  }

  function handleFiles(files) {
    const nextFile = files?.[0];
    if (!nextFile) {
      return;
    }
    onFileSelected(nextFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer?.files);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  return (
    <aside className={panelClassName}>
      <div
        className={dropClassName}
        onClick={handleBrowse}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            handleBrowse();
          }
        }}
      >
        <input
          ref={inputRef}
          className="upload-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="upload-drop-content">
          <p className="upload-title">Drop an artwork</p>
          <p className="upload-subtitle">or click to browse your files</p>
        </div>
        {hasPreview ? (
          <div className="upload-preview">
            <img src={previewUrl} alt="Uploaded artwork preview" />
          </div>
        ) : null}
      </div>
      {showMeta ? (
        <div className="upload-meta">
          {fileName ? (
            <div className="upload-filename">
              <span>{fileName}</span>
            </div>
          ) : null}
          {showAnalyze ? (
            <button
              type="button"
              className="upload-action"
              onClick={onAnalyze}
              disabled={disabled || isLoading}
            >
              {isLoading ? "Analyzing style..." : "Analyze style"}
            </button>
          ) : null}
          {error ? <p className="upload-error">{error}</p> : null}
          {hasPreview ? (
            <p className="upload-hint">JPG, PNG, or WebP. Keep it under 10MB.</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
