"use client";

import React, { useCallback, useRef } from "react";

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
  size: number;
  min: number;
  max: number;
  onResize: (size: number) => void;
  edge?: "start" | "end";
}

export function ResizeHandle({
  direction,
  size,
  min,
  max,
  onResize,
  edge,
}: ResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const resolvedEdge = edge ?? (direction === "vertical" ? "start" : "end");
      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      const startSize = size;

      // Prevent text selection during drag
      document.body.style.userSelect = "none";
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";

      const onPointerMove = (moveEvent: PointerEvent) => {
        const pos = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
        const delta =
          direction === "vertical"
            ? resolvedEdge === "end"
              ? pos - startPos
              : startPos - pos
            : resolvedEdge === "start"
              ? startPos - pos
              : pos - startPos;

        const next = Math.min(max, Math.max(min, startSize + delta));
        onResize(next);
      };

      const onPointerUp = () => {
        isDragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [direction, size, min, max, onResize, edge]
  );

  const isHorizontal = direction === "horizontal";

  return (
    <div
      ref={handleRef}
      onPointerDown={handlePointerDown}
      className={`
        relative shrink-0 select-none
        ${isHorizontal ? "w-0 cursor-col-resize" : "h-0 cursor-row-resize"}
        group
      `}
      style={{ zIndex: 10 }}
    >
      {/* Invisible wide hit area for dragging */}
      <div
        className={`
          absolute
          ${isHorizontal
            ? "top-0 bottom-0 -left-[5px] w-[10px]"
            : "left-0 right-0 -top-[5px] h-[10px]"
          }
        `}
      />
      {/* Visible accent line on hover/active */}
      <div
        className={`
          absolute transition-colors duration-150 pointer-events-none
          ${isHorizontal
            ? "top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px]"
            : "left-0 right-0 top-1/2 -translate-y-1/2 h-[2px]"
          }
          bg-transparent group-hover:bg-primary/40 group-active:bg-primary/60
        `}
      />
    </div>
  );
}
