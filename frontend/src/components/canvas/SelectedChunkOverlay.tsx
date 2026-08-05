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
      <div className="absolute inset-0 bg-blue-500 opacity-20" />
      <div
        className="absolute top-full left-1/2 z-40 size-[40px]"
        style={{
          transform: `translateX(-50%) scale(${1 / scale})`,
          transformOrigin: "top center",
        }}
      >
        <Navigation2 className="size-full fill-white text-blue-500" />
      </div>
    </div>
  );
};

export default SelectedChunkOverlay;
