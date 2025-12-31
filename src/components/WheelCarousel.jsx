import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArtworkCard from "./ArtworkCard";

const MAX_VISIBLE = 3;
const WHEEL_COOLDOWN = 220;
const SWIPE_THRESHOLD = 40;

export default function WheelCarousel({ items, startIndex = 0, onArtworkClick }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [slot, setSlot] = useState(220);
  const wheelLockRef = useRef(0);
  const pointerRef = useRef({
    active: false,
    startX: 0,
    pointerId: null,
  });

  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [items, startIndex]);

  useEffect(() => {
    const updateSlot = () => {
      const width = window.innerWidth;
      const nextSlot = Math.min(280, Math.max(150, width * 0.2));
      setSlot(nextSlot);
    };
    updateSlot();
    window.addEventListener("resize", updateSlot);
    return () => window.removeEventListener("resize", updateSlot);
  }, []);

  const rotate = useCallback(
    (direction) => {
      if (items.length === 0) {
        return;
      }
      setCurrentIndex((prev) => {
        const next = (prev + direction + items.length) % items.length;
        return next;
      });
    },
    [items.length]
  );

  const offsets = useMemo(() => {
    const total = items.length;
    const half = Math.floor(total / 2);
    return items.map((_, index) => {
      let offset = index - currentIndex;
      if (offset > half) {
        offset -= total;
      }
      if (offset < -half) {
        offset += total;
      }
      return offset;
    });
  }, [items, currentIndex]);

  useEffect(() => {
    const handleKey = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (target && target.isContentEditable) {
        return;
      }
      if (event.key === "ArrowRight") {
        rotate(1);
      }
      if (event.key === "ArrowLeft") {
        rotate(-1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rotate]);

  const handleWheel = (event) => {
    event.preventDefault();
    const now = Date.now();
    if (now - wheelLockRef.current < WHEEL_COOLDOWN) {
      return;
    }
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 10) {
      return;
    }
    rotate(delta > 0 ? 1 : -1);
    wheelLockRef.current = now;
  };

  const handlePointerDown = (event) => {
    pointerRef.current = {
      active: true,
      startX: event.clientX,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!pointerRef.current.active) {
      return;
    }
    const delta = event.clientX - pointerRef.current.startX;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      rotate(delta < 0 ? 1 : -1);
      pointerRef.current.startX = event.clientX;
    }
  };

  const handlePointerUp = (event) => {
    if (pointerRef.current.pointerId === event.pointerId) {
      pointerRef.current.active = false;
      pointerRef.current.pointerId = null;
    }
  };

  return (
    <div
      className="carousel"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="region"
      aria-label="Artwork carousel"
    >
      <div className="carousel-track">
        {items.map((item, index) => {
          const offset = offsets[index];
          const distance = Math.abs(offset);
          const isCenter = offset === 0;
          const scale = isCenter ? 1 : distance === 1 ? 0.78 : distance === 2 ? 0.62 : 0.5;
          const opacity = distance > MAX_VISIBLE ? 0 : 1 - distance * 0.18;
          const yOffset = distance * 12;

          const style = {
            transform: `translate(-50%, -50%) translate3d(${
              offset * slot
            }px, ${yOffset}px, 0) scale(${scale})`,
            opacity,
            zIndex: 100 - distance,
            pointerEvents: distance > MAX_VISIBLE ? "none" : "auto",
          };

          return (
            <div className="carousel-item" style={style} key={item.id ?? index}>
              <ArtworkCard item={item} isCenter={isCenter} onClick={onArtworkClick} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
