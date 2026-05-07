import { useEffect, useState } from "react";
import { ThemeProvider } from "./theme-provider";
import { DifficultyName, TimeRecord, VariantName } from "@/lib/types";
import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";
import { useMediaQuery } from "@/lib/utils";

import GameBoard from "./GameBoard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import { getBackendUrl } from "@/lib/auth";
import { recordLoggedInGameLog } from "@/lib/game-log";
import AuthButton from "./layout-actions/AuthButton";
import InfoButton from "./layout-actions/InfoButton";
import SettingsButton from "./layout-actions/SettingsButton";
import StatsButton from "./layout-actions/StatsButton";

type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

const Layout = () => {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [isTouchscreen, setIsTouchscreen] = useState(false);
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
    const checkTouchscreen = () => {
      setIsTouchscreen(window.matchMedia("(pointer: coarse)").matches);
    };

    checkTouchscreen();

    window.addEventListener("resize", checkTouchscreen);
    return () => window.removeEventListener("resize", checkTouchscreen);
  }, []);

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
    const controller = new AbortController();

    const loadAuthUser = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/auth/me`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          setAuthUser(null);
          setAuthLoaded(true);
          return;
        }

        const data = await response.json();
        setAuthUser(data.user ?? null);
        setAuthLoaded(true);
      } catch {
        if (!controller.signal.aborted) {
          setAuthUser(null);
          setAuthLoaded(true);
        }
      }
    };

    loadAuthUser();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem("zoom", zoom.toString());
  }, [zoom]);

  useEffect(() => {
    localStorage.setItem("flagButtonSize", flagButtonSize.toString());
  }, [flagButtonSize]);

  useEffect(() => {
    localStorage.setItem("flagButtonPosition", flagButtonPosition);
  }, [flagButtonPosition]);

  const addRecord = (newRecord: TimeRecord) => {
    if (authLoaded && authUser) {
      const updatedRecords = [...records, newRecord];
      setRecords(updatedRecords);
      localStorage.setItem("gameRecords", JSON.stringify(updatedRecords));

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
              <h2 className="text-lg sm:text-2xl">Inesweeper</h2>
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
            />
            <InfoButton variant={variant} />
            <AuthButton authUser={authUser} />
          </div>
        </header>
        <ScrollArea className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]">
          <main className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center px-6 py-4">
            <GameBoard 
              config={boardConfigLibrary[variant][difficulty]}
              zoom={zoom}
              flagButtonSize={flagButtonSize}
              flagButtonPosition={flagButtonPosition}
              isTouchscreen={isTouchscreen}
              addRecord={addRecord}
            />
            <div className="flex flex-row gap-2">
              <Select value={variant} onValueChange={(value) => setVariant(value as VariantName)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Variant" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(variantMap).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as DifficultyName)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(difficultyMap).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label.full}
                    </SelectItem>
                  ))}
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
