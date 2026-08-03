import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import CanvasGameBoard from "./CanvasGameBoard";
import { useSiteLayout } from "../Layout";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Toaster } from "../ui/sonner";
import { loadCurrentAuthUser } from "@/lib/auth";
import {
  getActiveCanvasLock,
  getCanvasChunkArea,
  type CanvasChunk,
  type CanvasChunkAreaResponse,
} from "@/lib/canvas/api";

type SolverData = {
  chunk: CanvasChunk;
  chunkArea: CanvasChunkAreaResponse;
};

const CanvasSolvePage = () => {
  const navigate = useNavigate();
  const [solverData, setSolverData] = useState<SolverData | null>(null);
  const { isTouchscreen, flagButtonSize, flagButtonPosition } = useSiteLayout();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;

    const loadSolver = async () => {
      const loadingToast = toast.loading("Loading...");

      try {
        const [chunk, user] = await Promise.all([
          getActiveCanvasLock(),
          loadCurrentAuthUser(),
        ]);

        if (!chunk || !user) {
          navigate("/place", { replace: true });
          return;
        }

        const chunkArea = await getCanvasChunkArea(
          chunk.chunkX - 1,
          chunk.chunkY - 1,
          chunk.chunkX + 1,
          chunk.chunkY + 1,
        );

        if (isActive) {
          setSolverData({ chunk, chunkArea });
        }
      } catch {
        if (isActive) {
          navigate("/place", { replace: true });
        }
      } finally {
        toast.dismiss(loadingToast);
      }
    };

    void loadSolver();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  // Center the board horizontally on initial load
  useEffect(() => {
    if (!solverData) {
      return;
    }

    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    if (!viewport) {
      return;
    }

    // Wait until scrollarea is ready
    const frame = requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max((viewport.scrollWidth - viewport.clientWidth) / 2, 0);
    });

    return () => cancelAnimationFrame(frame);
  }, [solverData]);

  return (
    <>
      <Toaster />
      <ScrollArea
        ref={scrollAreaRef}
        className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]"
      >
        <main className={`flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center ${isTouchscreen ? 'px-[160px]' : 'px-4'} py-6`}>
          {solverData &&
            <CanvasGameBoard
              chunk={solverData.chunk}
              chunkArea={solverData.chunkArea}
              isTouchscreen={isTouchscreen}
              flagButtonSize={flagButtonSize}
              flagButtonPosition={flagButtonPosition}
            />
          }
        </main>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </>
  );
};

export default CanvasSolvePage;
