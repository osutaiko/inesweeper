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
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const isTouchscreen = useMediaQuery("(pointer: coarse) and (hover: none)");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<VariantName>("classic");
  const [difficulty, setDifficulty] = useState<DifficultyName>("beg");
  const [zoom, setZoom] = useState(100);
  const [flagButtonSize, setFlagButtonSize] = useState(72);
  const [flagButtonPosition, setFlagButtonPosition] = useState("bottom-right");
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [guestBestRecords, setGuestBestRecords] = useState<TimeRecord[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const savedRecords = localStorage.getItem("gameRecords");
    const savedGuestBestRecords = localStorage.getItem("guestBestRecords");
    const savedZoom = localStorage.getItem("zoom");
    const savedFlagButtonSize = localStorage.getItem("flagButtonSize");
    const savedFlagButtonPosition = localStorage.getItem("flagButtonPosition");

    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedGuestBestRecords) setGuestBestRecords(JSON.parse(savedGuestBestRecords));
    if (savedZoom) setZoom(Number(savedZoom));
    if (savedFlagButtonSize) setFlagButtonSize(Number(savedFlagButtonSize));
    if (savedFlagButtonPosition) setFlagButtonPosition(savedFlagButtonPosition);
  }, []);

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

  // If logged in load best times
  useEffect(() => {
    if (!authLoaded || !authUser) {
      return;
    }

    const controller = new AbortController();

    const loadBestTimes = async () => {
      try {
        const bestTimes = await loadLoggedInBestTimes();
        if (!controller.signal.aborted) {
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
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    if (!viewport) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max((viewport.scrollWidth - viewport.clientWidth) / 2, 0);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const addRecord = (newRecord: TimeRecord) => {
    if (authLoaded && authUser) {
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

      void recordLoggedInGameLog({
        boardConfig: newRecord.boardConfig,
        variant,
        difficulty,
        durationMs: newRecord.timeElapsed,
      }).catch(() => undefined);
      return;
    }

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

  const displayedRecords = authLoaded && authUser ? records : guestBestRecords;

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        <header className="flex flex-row w-full gap-4 px-3 sm:px-8 py-2 sm:py-4 justify-between items-center border-b overflow-x-auto">
          <a href="/">
            <div className="flex flex-row items-center gap-3">
              <img src={InesweeperLogo} alt="Inesweeper Logo" className="w-[40px] h-[40px] min-w-[40px] min-h-[40px]" />
              <h2 className="hidden min-[410px]:block text-lg sm:text-2xl">Inesweeper</h2>
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
        <ScrollArea
          ref={scrollAreaRef}
          className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]"
        >
          <main
            className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center px-[160px] py-6"
          >
            <GameBoard 
              key={`${variant}-${difficulty}`}
              config={boardConfigLibrary[variant][difficulty]}
              zoom={zoom}
              flagButtonSize={flagButtonSize}
              flagButtonPosition={flagButtonPosition}
              isTouchscreen={isTouchscreen}
              addRecord={addRecord}
            />
            <div className="flex flex-row gap-2">
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
