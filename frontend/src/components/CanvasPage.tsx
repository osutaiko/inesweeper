import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "./ui/button";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { ThemeProvider } from "./theme-provider";
import StatusToast from "./StatusToast";
import CanvasChunk from "./CanvasChunk";
import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import { loadCurrentAuthUser, subscribeToAuthUser, type AuthUser } from "@/lib/auth";
import { getCanvasChunkArea, type CanvasChunkAreaResponse } from "@/lib/canvas";
import AuthButton from "./layout-actions/AuthButton";

const CanvasPage = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [viewCenterChunkX] = useState(0);
  const [viewCenterChunkY] = useState(0);
  const [chunkArea, setChunkArea] = useState<CanvasChunkAreaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewRadius = 2;

  const { fromChunkX, fromChunkY, toChunkX, toChunkY } = {
    fromChunkX: viewCenterChunkX - viewRadius,
    fromChunkY: viewCenterChunkY - viewRadius,
    toChunkX: viewCenterChunkX + viewRadius,
    toChunkY: viewCenterChunkY + viewRadius,
  };
  const areaWidth = toChunkX - fromChunkX + 1;
  const areaHeight = toChunkY - fromChunkY + 1;

  useEffect(() => {
    let isActive = true;

    const loadAuthUser = async () => {
      const user = await loadCurrentAuthUser();
      if (!isActive) {
        return;
      }

      setAuthUser(user);
    };

    const subscription = subscribeToAuthUser((user) => {
      setAuthUser(user);
    });

    loadAuthUser();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadArea = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextArea = await getCanvasChunkArea(
          fromChunkX,
          fromChunkY,
          toChunkX,
          toChunkY,
        );

        if (!isActive) {
          return;
        }

        setChunkArea(nextArea);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setError(error instanceof Error ? error.message : "Failed to load canvas");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadArea();

    return () => {
      isActive = false;
    };
  }, [fromChunkX, fromChunkY, toChunkX, toChunkY]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        <header
          className="flex flex-row w-full gap-4 px-3 sm:px-8 py-2 sm:py-4 justify-between items-center border-b overflow-x-auto"
        >
          <Link to="/">
            <div className="flex flex-row items-center gap-3">
              <img src={InesweeperLogo} alt="Inesweeper Logo" className="w-[40px] h-[40px] min-w-[40px] min-h-[40px]" />
              <h2 className="hidden min-[410px]:block text-lg sm:text-2xl">Inesweeper</h2>
            </div>
          </Link>
          <div className="flex flex-row gap-2">
            <Button asChild variant="secondary" className="pr-3">
              <Link to="/">
                <ArrowLeft />
                Back to Singleplayer
              </Link>
            </Button>
            <AuthButton authUser={authUser} />
          </div>
        </header>

        <main
          className="relative flex w-full overflow-hidden bg-background h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]"
        >
          {(error || isLoading) && (
            <div className="pointer-events-none absolute inset-0 z-50">
              {error && (
                <StatusToast variant="error" message={error} className="absolute left-4 top-4" />
              )}

              {isLoading && (
                <StatusToast variant="loading" message="Loading..." className="absolute right-4 top-4" />
              )}
            </div>
          )}

          <TransformWrapper
            initialScale={1}
            minScale={0.2}
            maxScale={4}
            centerOnInit
            limitToBounds={false}
            wheel={{ step: 0.002 }}
            panning={{ velocityDisabled: true }}
          >
            <TransformComponent
              wrapperClass="w-full h-full overflow-hidden bg-background"
              contentClass="w-full h-full overflow-hidden bg-background"
            >
              <div className="relative w-max bg-background">
                <div
                  className="grid w-max"
                  style={{
                    gridTemplateColumns: `repeat(${areaWidth}, max-content)`,
                    gridTemplateRows: `repeat(${areaHeight}, max-content)`,
                  }}
                >
                  {chunkArea?.chunks.map((chunk) => (
                    <CanvasChunk
                      key={`${chunk.chunkX}:${chunk.chunkY}`}
                      chunkX={chunk.chunkX}
                      chunkY={chunk.chunkY}
                      state={chunk.state}
                    />
                  ))}
                </div>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default CanvasPage;
