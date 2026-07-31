import { useEffect, useRef, useState } from "react";
import { Locate } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Toaster } from "./ui/sonner";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { ThemeProvider } from "./theme-provider";
import CanvasHeader from "./CanvasHeader";
import CanvasChunk from "./CanvasChunk";
import { loadCurrentAuthUser, subscribeToAuthUser, type AuthUser } from "@/lib/auth";
import { formatChunkCoordinates } from "@/lib/coordinates";
import {
  buildCanvasMineLookup,
  getCanvasChunkArea,
  lockCanvasChunk,
  type CanvasChunkAreaResponse,
  type CanvasChunkMineLookup,
} from "@/lib/canvas";

const CHUNK_PIXEL_SIZE = 480;
const CHUNK_ORIGIN_OFFSET = -CHUNK_PIXEL_SIZE / 2;
const INITIAL_SCALE = 0.2;
const GRID_DETAIL_SCALE = 0.1;
const LOW_SCALE_GRID_STEP = 10;

type ChunkGridTransform = {
  scale: number;
  positionX: number;
  positionY: number;
};

const updateChunkGrid = (
  element: HTMLDivElement,
  { scale, positionX, positionY }: ChunkGridTransform,
) => {
  const chunkSpacing = CHUNK_PIXEL_SIZE * scale;
  const lineStep = scale < GRID_DETAIL_SCALE ? LOW_SCALE_GRID_STEP : 1;
  const spacing = chunkSpacing * lineStep;
  const offsetX = positionX + CHUNK_ORIGIN_OFFSET * scale;
  const offsetY = positionY - CHUNK_ORIGIN_OFFSET * scale;

  element.style.backgroundSize = `${spacing}px ${spacing}px`;
  element.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
};

type CanvasViewportProps = {
  neighborMineLookup: CanvasChunkMineLookup | null;
  chunkArea: CanvasChunkAreaResponse | null;
  selectedChunkId: string | null;
  onChunkClick: (chunkId: string) => void;
};

const CanvasViewport = ({
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
    <div className="relative size-px">
      {(chunkArea?.chunks ?? []).map((chunk) => (
        <div
          key={`${chunk.chunkX}:${chunk.chunkY}`}
          className="absolute"
          style={{
            left: chunk.chunkX * CHUNK_PIXEL_SIZE + CHUNK_ORIGIN_OFFSET,
            top: -chunk.chunkY * CHUNK_PIXEL_SIZE + CHUNK_ORIGIN_OFFSET,
          }}
        >
          <CanvasChunk
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
        </div>
      ))}
    </div>
  );
};

const CanvasPage = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [chunkArea, setChunkArea] = useState<CanvasChunkAreaResponse | null>(null);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [lockingChunkId, setLockingChunkId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    dragged: false,
  });
  const initialLoadRadius = 10;
  const neighborChunkBuffer = 1;
  const loadFromChunkX = -initialLoadRadius - neighborChunkBuffer;
  const loadFromChunkY = -initialLoadRadius - neighborChunkBuffer;
  const loadToChunkX = initialLoadRadius + neighborChunkBuffer;
  const loadToChunkY = initialLoadRadius + neighborChunkBuffer;

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
      const loadingToast = toast.loading("Loading...");

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

        toast.error(
          error instanceof Error ? error.message : "Failed to load Place",
        );
      } finally {
        toast.dismiss(loadingToast);
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
      toast.error(
        error instanceof Error ? error.message : "Unable to lock chunk",
      );
    } finally {
      setLockingChunkId(null);
    }
  };

  const formatChunkTimestamp = (
    value: string | null,
    includeDate: boolean,
  ) => {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "en-US",
      includeDate
        ? { dateStyle: "short", timeStyle: "medium" }
        : { timeStyle: "medium" },
    ).format(date);
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Toaster />
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        <CanvasHeader authUser={authUser} />

        <main
          className="relative flex w-full overflow-hidden bg-background h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]"
        >
          <div
            ref={gridRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 size-full opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
              backgroundPosition: `${CHUNK_ORIGIN_OFFSET * INITIAL_SCALE}px ${-CHUNK_ORIGIN_OFFSET * INITIAL_SCALE}px`,
              backgroundSize: `${CHUNK_PIXEL_SIZE * INITIAL_SCALE}px ${CHUNK_PIXEL_SIZE * INITIAL_SCALE}px`,
            }}
          />

          {selectedChunk &&
            <div className="absolute bottom-0 md:bottom-4 left-1/2 gap-0 -translate-x-1/2 z-50 bg-card border flex flex-col w-full max-w-[600px] px-4 py-2 md:py-4 shadow-lg">
              <h3 className="text-center text-base md:text-lg mb-3">
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
              <div className="flex flex-row w-full justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  {selectedChunk.state === 'solved' &&
                    <>
                      <span className="text-muted-foreground">
                        {formatChunkTimestamp(selectedChunkAt, true)}
                      </span>
                    </>
                  }
                  {selectedChunk.state === 'locked' &&
                    <span className="text-muted-foreground">
                      Locked until: {formatChunkTimestamp(selectedChunkAt, false)}
                    </span>
                  }
                  <span className="text-muted-foreground">
                    {formatChunkCoordinates(
                      selectedChunk.chunkX,
                      selectedChunk.chunkY,
                    )}
                  </span>
                </div>
                <Button
                  onClick={() =>
                    transformRef.current?.zoomToElement(
                      `chunk-${selectedChunk.chunkX}:${selectedChunk.chunkY}`,
                      0.6,
                      500,
                      "easeOut",
                    )
                  }
                  size="icon"
                  title="Locate chunk"
                  variant="secondary"
                >
                  <Locate />
                </Button>
              </div>
              {canStartSolving && (
                <Button
                  className="mt-2"
                  disabled={lockingChunkId !== null}
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
              {!authUser && selectedChunk.state === "open" && (
                <span className="mt-2 text-destructive">
                  Log in to start claiming chunks!
                </span>
              )}
            </div>
          }

          {chunkArea ? (
          <TransformWrapper
            ref={transformRef}
            initialScale={INITIAL_SCALE}
            minScale={0.01}
            maxScale={1.0}
            centerOnInit
            centerZoomedOut={false}
            limitToBounds={false}
            smooth={false}
            wheel={{ step: 0.05 }}
            panning={{ velocityDisabled: true }}
            onInit={({ state }) => {
              if (gridRef.current) {
                updateChunkGrid(gridRef.current, state);
              }
            }}
            onTransform={(_, transform) => {
              if (gridRef.current) {
                updateChunkGrid(gridRef.current, transform);
              }
            }}
          >
            {() => (
              <TransformComponent
                wrapperClass="bg-transparent"
                wrapperStyle={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
                contentClass="bg-transparent"
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
                  neighborMineLookup={neighborMineLookup}
                  chunkArea={chunkArea}
                  selectedChunkId={selectedChunkId}
                  onChunkClick={(chunkId) => {
                    if (gestureRef.current.dragged) {
                      gestureRef.current.dragged = false;
                      return;
                    }

                    setSelectedChunkId(chunkId);
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
