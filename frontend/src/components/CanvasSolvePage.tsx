import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import CanvasHeader from "./CanvasHeader";
import CanvasGameBoard from "./CanvasGameBoard";
import StatusToast from "./StatusToast";
import { ThemeProvider } from "./theme-provider";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { loadCurrentAuthUser, type AuthUser } from "@/lib/auth";
import { useMediaQuery } from "@/lib/utils";
import {
  getActiveCanvasLock,
  getCanvasChunkArea,
  type CanvasChunk,
  type CanvasChunkAreaResponse,
} from "@/lib/canvas";

type SolverData = {
  chunk: CanvasChunk;
  chunkArea: CanvasChunkAreaResponse;
};

const CanvasSolvePage = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [solverData, setSolverData] = useState<SolverData | null>(null);
  const isTouchscreen = useMediaQuery("(pointer: coarse) and (hover: none)");
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;

    const loadSolver = async () => {
      try {
        const [chunk, user] = await Promise.all([
          getActiveCanvasLock(),
          loadCurrentAuthUser(),
        ]);

        if (!chunk || !user) {
          navigate("/canvas", { replace: true });
          return;
        }

        const chunkArea = await getCanvasChunkArea(
          chunk.chunkX - 1,
          chunk.chunkY - 1,
          chunk.chunkX + 1,
          chunk.chunkY + 1,
        );

        if (isActive) {
          setAuthUser(user);
          setSolverData({ chunk, chunkArea });
        }
      } catch {
        if (isActive) {
          navigate("/canvas", { replace: true });
        }
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
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        <CanvasHeader authUser={authUser} />
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]"
        >
          <main className={`flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center ${isTouchscreen ? 'px-[160px]' : 'px-4'} py-6`}>
            {solverData ? (
              <CanvasGameBoard
                chunk={solverData.chunk}
                chunkArea={solverData.chunkArea}
              />
            ) : (
              <StatusToast
                className="absolute right-4 top-4"
                message="Loading..."
                variant="loading"
              />
            )}
          </main>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </ThemeProvider>
  );
};

export default CanvasSolvePage;
