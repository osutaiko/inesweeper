import { Navigation2 } from "lucide-react";
import { useTransformComponent } from "react-zoom-pan-pinch";

type SelectedChunkOverlayProps = {
  chunkId: string;
  chunkOriginOffset: number;
  chunkPixelSize: number;
};

const SelectedChunkOverlay = ({
  chunkId,
  chunkOriginOffset,
  chunkPixelSize,
}: SelectedChunkOverlayProps) => {
  const [chunkX, chunkY] = chunkId.split(":").map(Number);
  const scale = useTransformComponent(({ state }) => state.scale);
  const cornerLength = Math.min(24 / scale, chunkPixelSize / 4);
  const outlineWidth = 3 / scale;
  const outlinePath = [
    `M ${cornerLength} 0 H 0 V ${cornerLength}`,
    `M ${chunkPixelSize - cornerLength} 0 H ${chunkPixelSize} V ${cornerLength}`,
    `M 0 ${chunkPixelSize - cornerLength} V ${chunkPixelSize} H ${cornerLength}`,
    `M ${chunkPixelSize - cornerLength} ${chunkPixelSize} H ${chunkPixelSize} V ${chunkPixelSize - cornerLength}`,
  ].join(" ");

  return (
    <div
      id={`chunk-${chunkId}`}
      className="pointer-events-none absolute z-30"
      style={{
        left: chunkX * chunkPixelSize + chunkOriginOffset,
        top: -chunkY * chunkPixelSize + chunkOriginOffset,
        width: chunkPixelSize,
        height: chunkPixelSize,
      }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-visible text-game-chunkselected"
        viewBox={`0 0 ${chunkPixelSize} ${chunkPixelSize}`}
      >
        <path
          d={outlinePath}
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeWidth={outlineWidth}
        />
      </svg>
      <div
        className="absolute top-full left-1/2 z-40 size-[40px]"
        style={{
          transform: `translateX(-50%) scale(${1 / scale})`,
          transformOrigin: "top center",
        }}
      >
        <Navigation2
          aria-hidden="true"
          className="size-full fill-white text-game-chunkselected"
          viewBox="-1 -1 26 26"
        />
      </div>
    </div>
  );
};

export default SelectedChunkOverlay;
