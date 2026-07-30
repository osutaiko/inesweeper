import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";

import { ThemeProvider } from "./theme-provider";
import CanvasHeader from "./CanvasHeader";
import StatusToast from "./StatusToast";
import CanvasChunk from "./CanvasChunk";
import { loadCurrentAuthUser, subscribeToAuthUser, type AuthUser } from "@/lib/auth";
import {
  buildCanvasMineLookup,
  getCanvasChunkArea,
  lockCanvasChunk,
  type CanvasChunkAreaResponse,
  type CanvasChunkMineLookup,
} from "@/lib/canvas";

type CanvasViewportProps = {
  fromChunkX: number;
  fromChunkY: number;
  toChunkX: number;
  toChunkY: number;
  neighborMineLookup: CanvasChunkMineLookup | null;
  chunkArea: CanvasChunkAreaResponse | null;
  selectedChunkId: string | null;
  onChunkClick: (chunkId: string) => void;
};

const CanvasViewport = ({
  fromChunkX,
  fromChunkY,
  toChunkX,
  toChunkY,
  neighborMineLookup,
  chunkArea,
  selectedChunkId,
  onChunkClick,
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
                    : chunk.state === "locked" &&
                        hasSolvedNeighbor(chunk.chunkX, chunk.chunkY)
                      ? "bg-game-chunklocked"
                      : ""
                }
                mineBitmap={chunk.mineBitmap}
                neighborMineLookup={neighborMineLookup}
                isSelected={selectedChunkId === `${chunk.chunkX}:${chunk.chunkY}`}
                onClick={() => onChunkClick(`${chunk.chunkX}:${chunk.chunkY}`)}
              />
            );
          });
        })}
      </div>
    </div>
  );
};

const CanvasPage = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [viewCenterChunkX] = useState(0);
  const [viewCenterChunkY] = useState(0);
  const [chunkArea, setChunkArea] = useState<CanvasChunkAreaResponse | null>(null);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [lockingChunkId, setLockingChunkId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    dragged: false,
  });
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

        setError(error instanceof Error ? error.message : "Failed to load Place");
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
    loadFromChunkX,
    loadFromChunkY,
    loadToChunkX,
    loadToChunkY,
  ]);

  const neighborMineLookup = chunkArea
    ? buildCanvasMineLookup(chunkArea.chunks)
    : null;
  const selectedChunk = selectedChunkId
    ? chunkArea?.chunks.find(
        (chunk) => `${chunk.chunkX}:${chunk.chunkY}` === selectedChunkId,
      ) ?? null
    : null;
  const selectedChunkOwnerName =
    selectedChunk?.state === "locked"
      ? selectedChunk.lockedByName
      : selectedChunk?.state === "solved"
        ? selectedChunk.solverName
        : null;
  const selectedChunkAt =
    selectedChunk?.state === "locked"
      ? selectedChunk.lockedUntil
      : selectedChunk?.state === "solved"
        ? selectedChunk.solvedAt
        : null;
  const hasActiveLock = authUser
    ? (chunkArea?.chunks ?? []).some(
        (chunk) =>
          chunk.state === "locked" &&
          chunk.lockedByUserId === authUser.id,
      )
    : false;
  const canStartSolving =
    Boolean(authUser) &&
    selectedChunk?.state === "open" &&
    !hasActiveLock &&
    (chunkArea?.chunks ?? []).some(
      (chunk) =>
        chunk.state === "solved" &&
        ((chunk.chunkX === selectedChunk.chunkX &&
          Math.abs(chunk.chunkY - selectedChunk.chunkY) === 1) ||
          (chunk.chunkY === selectedChunk.chunkY &&
            Math.abs(chunk.chunkX - selectedChunk.chunkX) === 1)),
    );

  const handleStartSolving = async (chunkX: number, chunkY: number) => {
    const chunkId = `${chunkX}:${chunkY}`;
    setLockingChunkId(chunkId);
    setError(null);

    try {
      const lockedChunk = await lockCanvasChunk(chunkX, chunkY);
      setChunkArea((currentArea) =>
        currentArea
          ? {
              ...currentArea,
              chunks: currentArea.chunks.map((chunk) =>
                chunk.chunkX === chunkX && chunk.chunkY === chunkY
                  ? lockedChunk
                  : chunk,
              ),
            }
          : currentArea,
      );
      navigate("/place/solve");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to lock chunk");
    } finally {
      setLockingChunkId(null);
    }
  };

  const formatChunkDate = (value: string | null) => {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        <CanvasHeader authUser={authUser} />

        <main
          className="relative flex w-full overflow-hidden bg-background h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]"
        >
          {selectedChunk ? (
            <Card className="absolute bottom-0 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-0.5 text-center w-max max-w-full md:max-w-[calc(100%-2rem)] px-4 py-2 md:py-4 shadow-lg rounded-none">
              <h3 className="text-base md:text-lg mb-1">
                {selectedChunk.state === "locked" && "Being solved by: "}
                <span
                  className={
                    selectedChunk.state === "locked" ||
                    !selectedChunkOwnerName
                      ? "text-muted-foreground"
                      : undefined
                  }
                >
                  {selectedChunkOwnerName ||
                    (selectedChunk.state === "locked"
                      ? "[Unknown sweeper]"
                      : "(Unclaimed)")}
                </span>
              </h3>
              {selectedChunk.state === 'solved' &&
                <>
                  <span className="text-muted-foreground">
                    {formatChunkDate(selectedChunkAt)}
                  </span>
                </>
              }
              {selectedChunk.state === 'locked' &&
                <span className="text-muted-foreground">
                  Locked until: {formatChunkDate(selectedChunkAt)}
                </span>
              }
              <span className="text-muted-foreground">
                (X={selectedChunk.chunkX}, Y={selectedChunk.chunkY})
              </span>
              {canStartSolving && (
                <Button
                  className="mt-2"
                  disabled={lockingChunkId !== null}
                  size="lg"
                  onClick={() =>
                    void handleStartSolving(
                      selectedChunk.chunkX,
                      selectedChunk.chunkY,
                    )
                  }
                >
                  Attempt Claim!
                </Button>
              )}
            </Card>
          ) : null}

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
            smooth={false}
            wheel={{ step: 0.05 }}
            panning={{ velocityDisabled: true }}
          >
            {({ zoomToElement }) => (
              <TransformComponent
                wrapperClass="bg-background"
                wrapperStyle={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
                contentClass="bg-background"
                wrapperProps={{
                  onPointerDown: (event) => {
                    setSelectedChunkId(null);
                    gestureRef.current = {
                      startX: event.clientX,
                      startY: event.clientY,
                      dragged: false,
                    };
                  },
                  onPointerMove: (event) => {
                    const deltaX = Math.abs(event.clientX - gestureRef.current.startX);
                    const deltaY = Math.abs(event.clientY - gestureRef.current.startY);

                    if (deltaX > 6 || deltaY > 6) {
                      gestureRef.current.dragged = true;
                    }
                  },
                  onPointerUp: () => {
                    gestureRef.current.startX = 0;
                    gestureRef.current.startY = 0;
                  },
                  onPointerCancel: () => {
                    gestureRef.current.dragged = false;
                  },
                  onWheel: () => {
                    setSelectedChunkId(null);
                  },
                }}
              >
                <CanvasViewport
                  fromChunkX={fromChunkX}
                  fromChunkY={fromChunkY}
                  toChunkX={toChunkX}
                  toChunkY={toChunkY}
                  neighborMineLookup={neighborMineLookup}
                  chunkArea={chunkArea}
                  selectedChunkId={selectedChunkId}
                  onChunkClick={(chunkId) => {
                    if (gestureRef.current.dragged) {
                      gestureRef.current.dragged = false;
                      return;
                    }

                    setSelectedChunkId(chunkId);
                    zoomToElement(`chunk-${chunkId}`, 0.6, 500, "easeOut");
                  }}
                />
              </TransformComponent>
            )}
          </TransformWrapper>
          ) : null}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default CanvasPage;
