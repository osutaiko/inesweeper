import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CanvasHeader from "./CanvasHeader";
import CanvasGameBoard from "./CanvasGameBoard";
import StatusToast from "./StatusToast";
import { ThemeProvider } from "./theme-provider";
import { loadCurrentAuthUser, type AuthUser } from "@/lib/auth";
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

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex min-h-screen flex-col items-center overflow-hidden touch-none">
        <CanvasHeader authUser={authUser} />
        <main className="relative flex h-[calc(100vh-57px)] w-full overflow-hidden bg-background sm:h-[calc(100vh-73px)]">
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
      </div>
    </ThemeProvider>
  );
};

export default CanvasSolvePage;
