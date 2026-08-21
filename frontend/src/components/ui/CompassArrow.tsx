import React from "react";
import { COMPASS_ANGLES } from "@/lib/minesweeper";

export const CompassArrow: React.FC<{
  angleIndex: number | null;
}> = ({ angleIndex }) => {
  if (angleIndex === null) {
    return (
      <svg
        aria-hidden="true"
        className="text-foreground fill-foreground"
        width={6}
        height={6}
        viewBox="0 0 6 6"
      >
        <rect x="0" y="0" width="6" height="6" fill="currentColor" />
      </svg>
    );
  }

  const markerSize = 3;
  const rayMarkerSide = Math.round(angleIndex / 4) % 8;
  const rayMarkerQuarterTurns = Math.floor(rayMarkerSide / 2);
  const rayMarkerStyle = rayMarkerSide % 2 === 1
    ? { right: "0%", top: "0%" }
    : { left: "50%", top: "0%", transform: "translateX(-50%)" };
  const className = angleIndex % 4 === 0
    ? "text-foreground"
    : angleIndex % 2 === 0
      ? "text-game-number-1"
      : "text-game-number-3";

  return (
    <span className="relative inline-flex items-center justify-center w-full h-full">
      {angleIndex % 2 === 1 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ transform: `rotate(${rayMarkerQuarterTurns * 90}deg)` }}
        >
          <svg
            className="pointer-events-none absolute text-game-number-3 fill-game-number-3"
            width={markerSize}
            height={markerSize}
            viewBox="0 0 3 3"
            style={rayMarkerStyle}
          >
            <rect x="0" y="0" width="3" height="3" fill="currentColor" />
          </svg>
        </span>
      )}
      <svg
        aria-hidden="true"
        className={`${className} absolute inset-[3px] w-[calc(100%-6px)] h-[calc(100%-6px)]`}
        viewBox="0 0 30 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="square"
        strokeLinejoin="miter"
        style={{ transform: `rotate(${COMPASS_ANGLES[angleIndex]}rad)` }}
      >
        <path d="M15 25.5V9.25" />
        <path d="M8.4375 9.25L15 2.0625L21.5625 9.25Z" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
};
