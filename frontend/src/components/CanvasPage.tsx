import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "./ui/button";
import {
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";

import { ThemeProvider } from "./theme-provider";
import StatusToast from "./StatusToast";
import CanvasChunk from "./CanvasChunk";
import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import { loadCurrentAuthUser, subscribeToAuthUser, type AuthUser } from "@/lib/auth";
import {
  buildCanvasMineLookup,
  getCanvasChunkArea,
  type CanvasChunkAreaResponse,
  type CanvasChunkMineLookup,
} from "@/lib/canvas";
import AuthButton from "./layout-actions/AuthButton";

type CanvasViewportProps = {
  fromChunkX: number;
  fromChunkY: number;
  toChunkX: number;
  toChunkY: number;
  neighborMineLookup: CanvasChunkMineLookup | null;
  chunkArea: CanvasChunkAreaResponse | null;
};

const CanvasViewport = ({
  fromChunkX,
  fromChunkY,
  toChunkX,
  toChunkY,
  neighborMineLookup,
  chunkArea,
}: CanvasViewportProps) => {
  const chunkByCoord = new Map(
    (chunkArea?.chunks ?? []).map((chunk) => [
      `${chunk.chunkX}:${chunk.chunkY}`,
      chunk,
    ]),
  );

  const hasSolvedNeighbor = (chunkX: number, chunkY: number) => {
    return (
      chunkByCoord.get(`${chunkX}:${chunkY + 1}`)?.state === "solved" ||
      chunkByCoord.get(`${chunkX}:${chunkY - 1}`)?.state === "solved" ||
      chunkByCoord.get(`${chunkX + 1}:${chunkY}`)?.state === "solved" ||
      chunkByCoord.get(`${chunkX - 1}:${chunkY}`)?.state === "solved"
    );
  };

  return (
    <div className="relative w-max bg-background">
      <div
        className="grid w-max"
        style={{
          gridTemplateColumns: `repeat(${toChunkX - fromChunkX + 1}, max-content)`,
          gridTemplateRows: `repeat(${toChunkY - fromChunkY + 1}, max-content)`,
        }}
      >
        {Array.from({ length: toChunkY - fromChunkY + 1 }).flatMap((_, row) => {
          const chunkY = toChunkY - row;

          return Array.from({ length: toChunkX - fromChunkX + 1 }).map((__, col) => {
            const chunkX = fromChunkX + col;
            const chunk = chunkByCoord.get(`${chunkX}:${chunkY}`);

            if (!chunk) {
              return (
                <div
                  key={`${chunkX}:${chunkY}`}
                  className="w-[480px] h-[480px] bg-game-border"
                />
              );
            }

            return (
              <CanvasChunk
                key={`${chunk.chunkX}:${chunk.chunkY}`}
                chunkX={chunk.chunkX}
                chunkY={chunk.chunkY}
                state={chunk.state}
                colorClassName={
                  chunk.state === "solved"
                    ? "bg-game-border"
                    : hasSolvedNeighbor(chunk.chunkX, chunk.chunkY)
                      ? chunk.state === "locked"
                        ? "bg-game-chunklocked"
                        : "bg-game-chunkopen"
                      : ""
                }
                mineBitmap={chunk.mineBitmap}
                neighborMineLookup={neighborMineLookup}
              />
            );
          });
        })}
      </div>
    </div>
  );
};

const CanvasPage = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [viewCenterChunkX] = useState(0);
  const [viewCenterChunkY] = useState(0);
  const [chunkArea, setChunkArea] = useState<CanvasChunkAreaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewRadius = 6;
  const neighborChunkBuffer = 1;

  const { fromChunkX, fromChunkY, toChunkX, toChunkY } = {
    fromChunkX: viewCenterChunkX - viewRadius,
    fromChunkY: viewCenterChunkY - viewRadius,
    toChunkX: viewCenterChunkX + viewRadius,
    toChunkY: viewCenterChunkY + viewRadius,
  };
  const loadFromChunkX = fromChunkX - neighborChunkBuffer;
  const loadFromChunkY = fromChunkY - neighborChunkBuffer;
  const loadToChunkX = toChunkX + neighborChunkBuffer;
  const loadToChunkY = toChunkY + neighborChunkBuffer;

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
      if (!authUser) {
        setChunkArea(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const nextArea = await getCanvasChunkArea(
          loadFromChunkX,
          loadFromChunkY,
          loadToChunkX,
          loadToChunkY,
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
  }, [
    authUser?.id,
    loadFromChunkX,
    loadFromChunkY,
    loadToChunkX,
    loadToChunkY,
  ]);

  const neighborMineLookup = chunkArea
    ? buildCanvasMineLookup(chunkArea.chunks)
    : null;

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

          {chunkArea ? (
          <TransformWrapper
            initialScale={0.4}
            minScale={0.05}
            maxScale={2.0}
            centerOnInit
            limitToBounds={false}
            smooth={false}
            wheel={{ step: 0.05 }}
            panning={{ velocityDisabled: true }}
          >
            <TransformComponent
              wrapperClass="w-full h-full overflow-hidden bg-background"
              contentClass="bg-background"
            >
              <CanvasViewport
                fromChunkX={fromChunkX}
                fromChunkY={fromChunkY}
                toChunkX={toChunkX}
                toChunkY={toChunkY}
                neighborMineLookup={neighborMineLookup}
                chunkArea={chunkArea}
              />
            </TransformComponent>
          </TransformWrapper>
          ) : null}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default CanvasPage;
