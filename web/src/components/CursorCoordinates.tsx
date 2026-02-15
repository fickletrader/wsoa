import { useState, useEffect } from "react";
import "./CursorCoordinates.css";

export default function CursorCoordinates() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("cursor-coordinates-active");
    return () =>
      document.documentElement.classList.remove("cursor-coordinates-active");
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  if (!isVisible) return null;

  const gap = 14;

  return (
    <>
      <div
        className="cursor-coordinates__line cursor-coordinates__line--horizontal cursor-coordinates__line--left"
        style={{ top: position.y, width: Math.max(0, position.x - gap) }}
      />
      <div
        className="cursor-coordinates__line cursor-coordinates__line--horizontal cursor-coordinates__line--right"
        style={{
          top: position.y,
          left: position.x + gap,
          width: `calc(100vw - ${position.x}px - ${gap}px)`,
        }}
      />
      <div
        className="cursor-coordinates__line cursor-coordinates__line--vertical cursor-coordinates__line--top"
        style={{ left: position.x, height: Math.max(0, position.y - gap) }}
      />
      <div
        className="cursor-coordinates__line cursor-coordinates__line--vertical cursor-coordinates__line--bottom"
        style={{
          left: position.x,
          top: position.y + gap,
          height: `calc(100vh - ${position.y}px - ${gap}px)`,
        }}
      />
      <div
        className="cursor-coordinates"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="cursor-coordinates__crosshair" />
        <span className="cursor-coordinates__label">
          x:{position.x}, y:{position.y}
        </span>
      </div>
    </>
  );
}
