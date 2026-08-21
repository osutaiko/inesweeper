import { useEffect, useRef, useState } from "react";
import { House, Minus, Plus, ScanSquare, Share2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Toggle } from "../ui/toggle";
import { Toaster } from "../ui/sonner";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { CHUNK_ORIGIN_OFFSET, CHUNK_PIXEL_SIZE, CanvasViewport } from "./CanvasViewport";
import { formatChunkCoordinates } from "@/lib/canvas/coordinates";
import { formatChunkShareText } from "@/lib/canvas/share";
import { loadCurrentAuthUser, type AuthUser } from "@/lib/auth";
import {
  getActiveCanvasLock,
  getCanvasChunk,
  getCanvasChunkArea,
  lockCanvasChunk,
  type CanvasChunk as CanvasChunkData,
  type CanvasChunkAreaResponse,
} from "@/lib/canvas/api";
import { getMsParts, timeLeftUntil } from "@/lib/utils";

const INITIAL_SCALE = 0.2;
const QUERY_CHUNK_SCALE = 0.6;
const GRID_DETAIL_SCALE = 0.1;
const LOW_SCALE_GRID_STEP = 10;
const MAX_MINE_BITMAP_AREA_SIZE = 512;

type ChunkGridTransform = {
  scale: number;
  positionX: number;
  positionY: number;
};

type ChunkAreaBounds = [number, number, number, number];

const getChunkAreaSize = ([fromX, fromY, toX, toY]: ChunkAreaBounds) =>
  (toX - fromX + 1) * (toY - fromY + 1);

const getSelectedChunkId = (searchParams: URLSearchParams) => {
  const chunkX = searchParams.get("X");
  const chunkY = searchParams.get("Y");

  if (chunkX === null || chunkY === null) {
    return null;
  }

  if (!chunkX || !chunkY) {
    return null;
  }

  const parsedChunkX = Number(chunkX);
  const parsedChunkY = Number(chunkY);

  return Number.isInteger(parsedChunkX) &&
    Number.isInteger(parsedChunkY)
    ? `${parsedChunkX}:${parsedChunkY}`
    : null;
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

const CanvasPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [chunkArea, setChunkArea] = useState<CanvasChunkAreaResponse | null>(null);
  const [selectedChunk, setSelectedChunk] =
    useState<CanvasChunkData | null>(null);
  const [activeLock, setActiveLock] = useState<CanvasChunkData | null>(null);
  const [activeLockRemainingMs, setActiveLockRemainingMs] = useState(0);
  const [lockingChunkId, setLockingChunkId] = useState<string | null>(null);
  const [showMySolvedOnly, setShowMySolvedOnly] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    dragged: false,
  });
  const [chunkAreaBounds, setChunkAreaBounds] =
    useState<ChunkAreaBounds | null>(null);
  const selectedChunkId = getSelectedChunkId(searchParams);
  const initialSelectedChunkId = useRef(selectedChunkId);

  const updateSelectedChunk = (chunkId: string | null) => {
    setSelectedChunk(null);
    const nextSearchParams = new URLSearchParams(searchParams);

    if (chunkId === null) {
      nextSearchParams.delete("X");
      nextSearchParams.delete("Y");
    } else {
      const [chunkX, chunkY] = chunkId.split(":");
      nextSearchParams.set("X", chunkX);
      nextSearchParams.set("Y", chunkY);
    }

    setSearchParams(nextSearchParams, { replace: true });
  };

  useEffect(() => {
    void loadCurrentAuthUser().then(setAuthUser);
  }, []);

  const updateChunkAreaBounds = (state: ChunkGridTransform) => {
    if (!gridRef.current) {
      return;
    }

    const left = -state.positionX / state.scale;
    const right = (gridRef.current.clientWidth - state.positionX) / state.scale;
    const top = -state.positionY / state.scale;
    const bottom = (gridRef.current.clientHeight - state.positionY) / state.scale;
    const viewportBounds: ChunkAreaBounds = [
      Math.floor((left - CHUNK_ORIGIN_OFFSET) / CHUNK_PIXEL_SIZE),
      -Math.floor((bottom - CHUNK_ORIGIN_OFFSET) / CHUNK_PIXEL_SIZE),
      Math.floor((right - CHUNK_ORIGIN_OFFSET) / CHUNK_PIXEL_SIZE),
      -Math.floor((top - CHUNK_ORIGIN_OFFSET) / CHUNK_PIXEL_SIZE),
    ];
    const contextBounds: ChunkAreaBounds = [
      viewportBounds[0] - 1,
      viewportBounds[1] - 1,
      viewportBounds[2] + 1,
      viewportBounds[3] + 1,
    ];

    setChunkAreaBounds((current) => {
      const contextAreaSize = getChunkAreaSize(contextBounds);
      const currentAreaSize = current ? getChunkAreaSize(current) : 0;
      const needsMineBitmaps =
        contextAreaSize <= MAX_MINE_BITMAP_AREA_SIZE &&
        currentAreaSize > MAX_MINE_BITMAP_AREA_SIZE;

      if (
        current &&
        !needsMineBitmaps &&
        contextBounds[0] >= current[0] &&
        contextBounds[1] >= current[1] &&
        contextBounds[2] <= current[2] &&
        contextBounds[3] <= current[3]
      ) {
        return current;
      }

      const overscanX = Math.ceil(
        (viewportBounds[2] - viewportBounds[0] + 1) / 2,
      );
      const overscanY = Math.ceil(
        (viewportBounds[3] - viewportBounds[1] + 1) / 2,
      );
      const bounds: ChunkAreaBounds = [
        viewportBounds[0] - overscanX,
        viewportBounds[1] - overscanY,
        viewportBounds[2] + overscanX,
        viewportBounds[3] + overscanY,
      ];

      return contextAreaSize <= MAX_MINE_BITMAP_AREA_SIZE &&
        getChunkAreaSize(bounds) > MAX_MINE_BITMAP_AREA_SIZE
        ? contextBounds
        : bounds;
    });
  };

  const returnToDefaultView = () => {
    transformRef.current?.centerView(INITIAL_SCALE, 500, "easeOut");
    window.setTimeout(() => {
      const state = transformRef.current?.state;
      if (state) {
        updateChunkAreaBounds(state);
      }
    }, 500);
  };

  const zoomIn = () => {
    transformRef.current?.zoomIn(0.15, 150, "easeOut");
  };

  const zoomOut = () => {
    transformRef.current?.zoomOut(0.15, 150, "easeOut");
  };

  const locateChunk = (
    chunkX: number,
    chunkY: number,
    transform = transformRef.current,
    animationTime = 500,
  ) => {
    const chunkId = `chunk-${chunkX}:${chunkY}`;

    if (document.getElementById(chunkId)) {
      transform?.zoomToElement(
        chunkId,
        QUERY_CHUNK_SCALE,
        animationTime,
        "easeOut",
      );
    } else if (transform && gridRef.current) {
      transform.setTransform(
        gridRef.current.clientWidth / 2 -
          chunkX * CHUNK_PIXEL_SIZE * QUERY_CHUNK_SCALE,
        gridRef.current.clientHeight / 2 +
          chunkY * CHUNK_PIXEL_SIZE * QUERY_CHUNK_SCALE,
        QUERY_CHUNK_SCALE,
        animationTime,
      );
    }

    window.setTimeout(() => {
      const state = transformRef.current?.state;
      if (state) {
        updateChunkAreaBounds(state);
      }
    }, 500);
  };

  useEffect(() => {
    if (!authUser) {
      setActiveLock(null);
      return;
    }

    let isActive = true;

    void getActiveCanvasLock()
      .then((chunk) => {
        if (isActive) {
          setActiveLock(chunk);
        }
      })
      .catch(() => {
        if (isActive) {
          setActiveLock(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!activeLock) {
      setActiveLockRemainingMs(0);
      return;
    }

    const updateRemainingMs = () => {
      const remainingMs = timeLeftUntil(activeLock.lockedUntil);
      setActiveLockRemainingMs(remainingMs);

      if (remainingMs === 0) {
        setActiveLock(null);
      }
    };

    updateRemainingMs();
    const interval = window.setInterval(updateRemainingMs, 1000);

    return () => window.clearInterval(interval);
  }, [activeLock]);

  useEffect(() => {
    if (!chunkAreaBounds) {
      return;
    }

    let isActive = true;
    const abortController = new AbortController();
    const [
      loadFromChunkX,
      loadFromChunkY,
      loadToChunkX,
      loadToChunkY,
    ] = chunkAreaBounds;

    const loadArea = async () => {
      const loadingToast = toast.loading("Loading...");

      try {
        const nextArea = await getCanvasChunkArea(
          loadFromChunkX,
          loadFromChunkY,
          loadToChunkX,
          loadToChunkY,
          abortController.signal,
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
      abortController.abort();
    };
  }, [chunkAreaBounds]);

  useEffect(() => {
    if (!selectedChunkId) {
      setSelectedChunk(null);
      return;
    }

    let isActive = true;
    const abortController = new AbortController();
    const [chunkX, chunkY] = selectedChunkId.split(":").map(Number);

    void getCanvasChunk(chunkX, chunkY, abortController.signal)
      .then((chunk) => {
        if (isActive) {
          setSelectedChunk(chunk);
        }
      })
      .catch(() => {
        if (isActive) {
          toast.error("Failed to load chunk");
        }
      });

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [selectedChunkId]);

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
  const activeLockTime = getMsParts(activeLockRemainingMs);
  const canStartSolving =
    Boolean(authUser) &&
    selectedChunk?.state === "open" &&
    !activeLock &&
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
      await lockCanvasChunk(chunkX, chunkY);
      navigate("/place/solve");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to lock chunk",
      );
    } finally {
      setLockingChunkId(null);
    }
  };

  const handleShareChunk = async (chunk: CanvasChunkData) => {
    try {
      await navigator.clipboard.writeText(formatChunkShareText(chunk));
      toast("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
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
    <>
      <Toaster />
      <main
        className="relative flex w-full overflow-hidden bg-background h-[calc(100dvh-57px)] sm:h-[calc(100dvh-73px)]"
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

          <div className="absolute left-2 top-2 md:left-4 md:top-4 z-50 flex flex-col gap-2 bg-card border px-2 py-2 shadow-lg">
            <div className="flex items-stretch gap-1">
              <Button
                onClick={returnToDefaultView}
                size="icon"
                title="Return to default view"
                variant="secondary"
              >
                <House />
              </Button>
              <div className="flex flex-col gap-1 h-10">
                <Button
                  className="h-full w-10 [&_svg]:size-3"
                  onClick={zoomIn}
                  size="icon"
                  title="Zoom in"
                  variant="secondary"
                >
                  <Plus size={8} />
                </Button>
                <Button
                  className="h-full w-10 [&_svg]:size-3"
                  onClick={zoomOut}
                  size="icon"
                  title="Zoom out"
                  variant="secondary"
                >
                  <Minus size={2} />
                </Button>
              </div>
            </div>
            {authUser &&
              <Toggle
                className="h-min p-1"
                disabled={!authUser}
                variant="outline"
                onPressedChange={(pressed) => setShowMySolvedOnly(pressed)}
                title="Toggle solved filter"
                pressed={showMySolvedOnly}
              >
                {showMySolvedOnly ? 'Owned' : 'All'}
              </Toggle>
            }
          </div>

          {activeLock &&
            <div className="absolute top-0 md:top-4 left-1/2 gap-0 -translate-x-1/2 z-50 bg-card border flex flex-col w-full max-w-[600px] px-4 py-2 md:py-4 shadow-lg">
              <h3 className="text-center text-base md:text-lg mb-3">
                You currently have a locked chunk!
              </h3>
              <p className="text-center">
                Expires in{" "}
                <span className="text-destructive">
                  {activeLockTime.minutes}:
                  {String(activeLockTime.seconds).padStart(2, "0")}
                </span>
              </p>
              <Button className="mt-2" onClick={() => navigate("/place/solve")}>
                Solve Now
              </Button>
            </div>
          }

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
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      locateChunk(
                        selectedChunk.chunkX,
                        selectedChunk.chunkY,
                      )}
                    size="icon"
                    title="Locate chunk"
                    variant="secondary"
                  >
                    <ScanSquare />
                  </Button>
                  <Button
                    onClick={() => void handleShareChunk(selectedChunk)}
                    size="icon"
                    title="Share chunk"
                    variant="secondary"
                  >
                    <Share2 />
                  </Button>
                </div>
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

          <TransformWrapper
            ref={transformRef}
            initialScale={INITIAL_SCALE}
            minScale={0.08}
            maxScale={1.0}
            centerOnInit={false}
            centerZoomedOut={false}
            limitToBounds={false}
            smooth={false}
            wheel={{ step: 0.05 }}
            onInit={(ref) => {
              const { state } = ref;
              const initialChunkId = initialSelectedChunkId.current;
              if (initialChunkId && gridRef.current) {
                const [chunkX, chunkY] = initialChunkId.split(":").map(Number);
                locateChunk(chunkX, chunkY, ref, 0);
                initialSelectedChunkId.current = null;
              } else {
                ref.centerView(INITIAL_SCALE, 0);
                if (gridRef.current) {
                  updateChunkGrid(gridRef.current, state);
                }
                updateChunkAreaBounds(state);
              }
            }}
            onTransform={(_, transform) => {
              if (gridRef.current) {
                updateChunkGrid(gridRef.current, transform);
              }
            }}
            onPanningStop={({ state }) => updateChunkAreaBounds(state)}
            onZoomStop={({ state }) => updateChunkAreaBounds(state)}
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
                    updateSelectedChunk(null);
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
                  onPointerUp: (event) => {
                    if (event.button !== 0) {
                      gestureRef.current.dragged = false;
                      return;
                    }

                    const transform = transformRef.current?.state;

                    if (!gestureRef.current.dragged && transform) {
                      const viewport = event.currentTarget.getBoundingClientRect();
                      const contentX =
                        (event.clientX - viewport.left - transform.positionX) /
                        transform.scale;
                      const contentY =
                        (event.clientY - viewport.top - transform.positionY) /
                        transform.scale;
                      const chunkX = Math.floor(
                        (contentX - CHUNK_ORIGIN_OFFSET) / CHUNK_PIXEL_SIZE,
                      );
                      const chunkY = -Math.floor(
                        (contentY - CHUNK_ORIGIN_OFFSET) / CHUNK_PIXEL_SIZE,
                      );

                      updateSelectedChunk(`${chunkX}:${chunkY}`);
                    }

                    gestureRef.current.startX = 0;
                    gestureRef.current.startY = 0;
                  },
                  onPointerCancel: () => {
                    gestureRef.current.dragged = false;
                  },
                  onWheel: () => {
                    updateSelectedChunk(null);
                  },
                }}
              >
                <CanvasViewport
                  chunkArea={chunkArea}
                  selectedChunkId={selectedChunkId}
                  showMySolvedOnly={showMySolvedOnly}
                  onChunkClick={(chunkId) => {
                    if (gestureRef.current.dragged) {
                      gestureRef.current.dragged = false;
                      return;
                    }

                    updateSelectedChunk(chunkId);
                  }}
                />
              </TransformComponent>
            )}
          </TransformWrapper>
      </main>
    </>
  );
};

export default CanvasPage;
