import React, { useState, useRef, useEffect, useCallback } from "react";
import { Info } from "lucide-react";

/**
 * InfoTooltip — A reusable tooltip with an info icon.
 * Auto-repositions to stay within viewport bounds.
 */
const InfoTooltip = ({ text, size = 13, color = "#a1a1aa", maxWidth = 260, position = "top" }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState(null);
  const iconRef = useRef(null);
  const tipRef = useRef(null);

  const calculate = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tipW = Math.min(maxWidth, vw - 24);
    const tipH = 80; // estimate

    let top, left;

    // Try preferred position, then fallback
    if (position === "top" || position === "bottom") {
      left = rect.left + rect.width / 2 - tipW / 2;
      if (position === "top") {
        top = rect.top - tipH - 8;
        if (top < 8) top = rect.bottom + 8; // flip to bottom
      } else {
        top = rect.bottom + 8;
        if (top + tipH > vh - 8) top = rect.top - tipH - 8; // flip to top
      }
    } else if (position === "right") {
      left = rect.right + 8;
      top = rect.top + rect.height / 2 - tipH / 2;
      if (left + tipW > vw - 12) {
        left = rect.left - tipW - 8; // flip to left
      }
    } else {
      left = rect.left - tipW - 8;
      top = rect.top + rect.height / 2 - tipH / 2;
      if (left < 12) {
        left = rect.right + 8; // flip to right
      }
    }

    // Clamp within viewport
    left = Math.max(12, Math.min(left, vw - tipW - 12));
    top = Math.max(8, Math.min(top, vh - tipH - 8));

    setCoords({ top, left, width: tipW });
  }, [maxWidth, position]);

  useEffect(() => {
    if (show) calculate();
  }, [show, calculate]);

  return (
    <>
      <span
        ref={iconRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ display: "inline-flex", alignItems: "center", cursor: "help", flexShrink: 0 }}
      >
        <Info size={size} color={color} strokeWidth={2.2} />
      </span>
      {show && coords && (
        <div
          ref={tipRef}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 99999,
            background: "#18181b",
            color: "#fafafa",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.55,
            padding: "10px 14px",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            whiteSpace: "normal",
            animation: "tipFadeIn 0.12s ease",
          }}
        >
          {text}
        </div>
      )}
      {/* Animation keyframes — injected once */}
      <style>{`@keyframes tipFadeIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
};

export default InfoTooltip;
