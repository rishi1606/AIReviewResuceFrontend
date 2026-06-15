import React, { useState, useRef, useCallback } from "react";

/**
 * Shared Tooltip component.
 *
 * @param {string}  content   — text displayed inside the tooltip
 * @param {React.ReactNode} children — trigger element
 * @param {"top"|"bottom"|"left"|"right"} position — placement (default "top")
 * @param {number}  [maxWidth]  — optional max-width in px (enables word-wrap)
 * @param {number}  [delay=0]   — ms before tooltip appears
 */
export const Tooltip = ({ content, children, position = "top", maxWidth, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const TRANSFORM = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  };

  const show = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const pos = {
      top:    { top: rect.top - 8,            left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + 8,         left: rect.left + rect.width / 2 },
      left:   { top: rect.top + rect.height / 2, left: rect.left - 8 },
      right:  { top: rect.top + rect.height / 2, left: rect.right + 8 },
    };
    setCoords(pos[position]);

    if (delay > 0) {
      timerRef.current = setTimeout(() => setVisible(true), delay);
    } else {
      setVisible(true);
    }
  }, [position, delay]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: "inline-flex" }}
      >
        {children}
      </span>

      {visible && (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: TRANSFORM[position],
            zIndex: 9999,
            background: "#18181b",
            color: "#f4f4f5",
            fontSize: "11px",
            fontWeight: 500,
            lineHeight: 1.4,
            padding: "5px 10px",
            borderRadius: "6px",
            maxWidth: maxWidth ? `${maxWidth}px` : "none",
            whiteSpace: maxWidth ? "normal" : "nowrap",
            pointerEvents: "none",
            animation: "tooltipIn 120ms ease forwards",
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          {content}
        </div>
      )}

      {/* Keyframes — injected once per mount; harmless if duplicated */}
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: ${TRANSFORM[position]} translateY(4px); }
          to   { opacity: 1; transform: ${TRANSFORM[position]} translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Tooltip;
