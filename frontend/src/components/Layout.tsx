import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "./theme-provider";
import { DifficultyName, TimeRecord, VariantName } from "@/lib/types";
import { boardConfigLibrary, difficultyMap, variantGroups } from "@/lib/constants";
import { useMediaQuery } from "@/lib/utils";
import {
  loadCurrentAuthUser,
  subscribeToAuthUser,
  type AuthUser,
} from "@/lib/auth";

import GameBoard from "./GameBoard";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import { loadLoggedInBestTimes, recordLoggedInGameLog } from "@/lib/game-log";
import AuthButton from "./layout-actions/AuthButton";
import InfoButton from "./layout-actions/InfoButton";
import SettingsButton from "./layout-actions/SettingsButton";
import StatsButton from "./layout-actions/StatsButton";

const Layout = () => {
  const DEFAULT_ZOOM = 100;
  const DEFAULT_FLAG_BUTTON_SIZE = 72;
  const DEFAULT_FLAG_BUTTON_POSITION = "bottom-right";
  const DEFAULT_TOUCH_HOLD_DELAY = 200;

  // For conditional rendering of flag toggle
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const isTouchscreen = useMediaQuery("(pointer: coarse) and (hover: none)");

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Board config per game
  const [variant, setVariant] = useState<VariantName>("classic");
  const [difficulty, setDifficulty] = useState<DifficultyName>("beg");

  // Settings
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [flagButtonSize, setFlagButtonSize] = useState(DEFAULT_FLAG_BUTTON_SIZE);
  const [flagButtonPosition, setFlagButtonPosition] = useState(DEFAULT_FLAG_BUTTON_POSITION);
  const [touchHoldDelay, setTouchHoldDelay] = useState(DEFAULT_TOUCH_HOLD_DELAY);

  // Statistics
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [guestBestRecords, setGuestBestRecords] = useState<TimeRecord[]>([]);

  // Authentication
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Fetch local settings guest records from localstorage
  useEffect(() => {
    const savedRecords = localStorage.getItem("gameRecords");
    const savedGuestBestRecords = localStorage.getItem("guestBestRecords");
    const savedZoom = localStorage.getItem("zoom");
    const savedFlagButtonSize = localStorage.getItem("flagButtonSize");
    const savedFlagButtonPosition = localStorage.getItem("flagButtonPosition");
    const savedTouchHoldDelay = localStorage.getItem("touchHoldDelay");

    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedGuestBestRecords) setGuestBestRecords(JSON.parse(savedGuestBestRecords));
    if (savedZoom) setZoom(Number(savedZoom));
    if (savedFlagButtonSize) setFlagButtonSize(Number(savedFlagButtonSize));
    if (savedFlagButtonPosition) setFlagButtonPosition(savedFlagButtonPosition);
    if (savedTouchHoldDelay) setTouchHoldDelay(Number(savedTouchHoldDelay));
  }, []);

  // Load current auth user once and keep in sync (subscribe)
  useEffect(() => {
    let isActive = true;

    const loadAuthUser = async () => {
      const user = await loadCurrentAuthUser();

      if (!isActive) {
        return;
      }

      setAuthUser(user);
      setAuthLoaded(true);
    };

    const subscription = subscribeToAuthUser((user) => {
      setAuthUser(user);
      setAuthLoaded(true);
    });

    loadAuthUser();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  // Replace local records with real ones from DB
  useEffect(() => {
    if (!authLoaded || !authUser) {
      return;
    }

    const controller = new AbortController();

    const loadBestTimes = async () => {
      try {
        const bestTimes = await loadLoggedInBestTimes();
        if (!controller.signal.aborted) {
          // Fallback to localstorage items
          setRecords(bestTimes);
          localStorage.setItem("gameRecords", JSON.stringify(bestTimes));
        }
      } catch {
        if (!controller.signal.aborted) {
          setRecords([]);
        }
      }
    };

    loadBestTimes();

    return () => controller.abort();
  }, [authLoaded, authUser]);

  // localStorage store UI settings
  useEffect(() => {
    localStorage.setItem("zoom", zoom.toString());
  }, [zoom]);
  useEffect(() => {
    localStorage.setItem("flagButtonSize", flagButtonSize.toString());
  }, [flagButtonSize]);
  useEffect(() => {
    localStorage.setItem("flagButtonPosition", flagButtonPosition);
  }, [flagButtonPosition]);
  useEffect(() => {
    localStorage.setItem("touchHoldDelay", touchHoldDelay.toString());
  }, [touchHoldDelay]);

  const resetPreferences = () => {
    setZoom(DEFAULT_ZOOM);
    setFlagButtonSize(DEFAULT_FLAG_BUTTON_SIZE);
    setFlagButtonPosition(DEFAULT_FLAG_BUTTON_POSITION);
    setTouchHoldDelay(DEFAULT_TOUCH_HOLD_DELAY);
  };

  // Center the board horizontally on initial load
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    if (!viewport) {
      return;
    }

    // Wait until scrollarea is ready
    const frame = requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max((viewport.scrollWidth - viewport.clientWidth) / 2, 0);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  // Store only the best time per board config
  // ...separately for authed and guest players
  const addRecord = (newRecord: TimeRecord) => {
    if (authLoaded && authUser) {
      // Compare configs by value so we replace the matching best-time entry.
      const existingIndex = records.findIndex(
        (record) =>
          JSON.stringify(record.boardConfig) === JSON.stringify(newRecord.boardConfig),
      );
      const existingRecord =
        existingIndex >= 0 ? records[existingIndex] : null;

      if (!existingRecord || newRecord.timeElapsed < existingRecord.timeElapsed) {
        const updatedRecords =
          existingIndex >= 0
            ? records.map((record, index) =>
                index === existingIndex ? newRecord : record,
              )
            : [...records, newRecord];

        setRecords(updatedRecords);
        localStorage.setItem("gameRecords", JSON.stringify(updatedRecords));
      }

      // Forget server log since local state already holds the best times
      void recordLoggedInGameLog({
        boardConfig: newRecord.boardConfig,
        variant,
        difficulty,
        durationMs: newRecord.timeElapsed,
      }).catch(() => undefined);
      return;
    }

    // Dedupe by board config
    const nextGuestBestRecords = [...guestBestRecords];
    const recordKey = JSON.stringify(newRecord.boardConfig);
    const existingIndex = nextGuestBestRecords.findIndex(
      (record) => JSON.stringify(record.boardConfig) === recordKey,
    );
    const existingRecord =
      existingIndex >= 0 ? nextGuestBestRecords[existingIndex] : null;

    if (!existingRecord || newRecord.timeElapsed < existingRecord.timeElapsed) {
      const updatedGuestBestRecords =
        existingIndex >= 0
          ? nextGuestBestRecords.map((record, index) =>
              index === existingIndex ? newRecord : record,
            )
          : [...nextGuestBestRecords, newRecord];

      setGuestBestRecords(updatedGuestBestRecords);
      localStorage.setItem(
        "guestBestRecords",
        JSON.stringify(updatedGuestBestRecords),
      );
    }
  };

  // Swap between guest fallback for display
  const displayedRecords = authLoaded && authUser ? records : guestBestRecords;

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        {/* Header */}
        <header className="flex flex-row w-full gap-4 px-3 sm:px-8 py-2 sm:py-4 justify-between items-center border-b overflow-x-auto">
          <a href="/">
            <div className="flex flex-row items-center gap-3">
              <img src={InesweeperLogo} alt="Inesweeper Logo" className="w-[40px] h-[40px] min-w-[40px] min-h-[40px]" />
              <h2 className="font-minesweeper hidden min-[510px]:block text-lg sm:text-2xl">
                <span className="text-red-500">I</span>
                <span className="text-green-500">N</span>
                <span className="text-blue-500">E</span>
                sweeper
              </h2>
            </div>
          </a>
          <div className="flex flex-row gap-2">
            <SettingsButton
              isTouchscreen={isTouchscreen}
              zoom={zoom}
              setZoom={setZoom}
              flagButtonSize={flagButtonSize}
              setFlagButtonSize={setFlagButtonSize}
              flagButtonPosition={flagButtonPosition}
              setFlagButtonPosition={setFlagButtonPosition}
              touchHoldDelay={touchHoldDelay}
              setTouchHoldDelay={setTouchHoldDelay}
              resetPreferences={resetPreferences}
            />
            <StatsButton
              isDesktop={isDesktop}
              displayedRecords={displayedRecords}
              isAuthed={Boolean(authUser)}
            />
            <InfoButton />
            <AuthButton authUser={authUser} />
          </div>
        </header>

        {/* Main Play Area */}
        <ScrollArea
          ref={scrollAreaRef}
          className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]" /* FIXME: need way to avoid using magic */
        >
          <main
            className={`flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center ${isTouchscreen ? 'px-[160px]' : 'px-4'} py-6`}
          >
            <GameBoard 
              key={`${variant}-${difficulty}`}
              config={boardConfigLibrary[variant][difficulty]}
              zoom={zoom}
              flagButtonSize={flagButtonSize}
              flagButtonPosition={flagButtonPosition}
              touchHoldDelay={touchHoldDelay}
              isTouchscreen={isTouchscreen}
              addRecord={addRecord}
            />

            {/* Board Config Section */}
            <div className="flex flex-row gap-2">
              {/* Variant Selector */}
              <Select value={variant} onValueChange={(value) => setVariant(value as VariantName)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Variant" />
                </SelectTrigger>
                <SelectContent>
                  {variantGroups.map((group, groupIndex) => (
                    <SelectGroup key={group.group}>
                      {group.group !== "none" ? <SelectLabel>{group.label}</SelectLabel> : null}
                      {group.items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                      {groupIndex < variantGroups.length - 1 ? <SelectSeparator className="my-1" /> : null}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Difficulty Selector */}
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as DifficultyName)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(difficultyMap).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label.full}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </main>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </ThemeProvider>
  );
};

export default Layout;
