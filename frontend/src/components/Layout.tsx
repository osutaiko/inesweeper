import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeProvider } from "./theme-provider";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { DifficultyName, TimeRecord, VariantName } from "@/lib/types";
import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";
import { useMediaQuery } from "@/lib/utils";
import { loadLoggedInBestTimes, recordLoggedInGameLog } from "@/lib/game-log";

import GameBoard from "./GameBoard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Button } from "./ui/button";

import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import AuthButton from "./layout-actions/AuthButton";
import InfoButton from "./layout-actions/InfoButton";
import SettingsButton from "./layout-actions/SettingsButton";
import StatsButton from "./layout-actions/StatsButton";
import { ArrowRight } from "lucide-react";

type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  name:
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    "User",
  avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
});

const Layout = () => {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const isTouchscreen = useMediaQuery("(pointer: coarse) and (hover: none)");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      setAuthUser(user ? toAuthUser(user) : null);
      setAuthLoaded(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ? toAuthUser(session.user) : null);
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
  const touchSafeInset = flagButtonSize + 12;
  type FlagButtonPosition = "bottom-left" | "bottom-right" | "center-left" | "center-right";

  const basePaddingStyle = {
    paddingLeft: "24px",
    paddingRight: "24px",
    paddingTop: "16px",
    paddingBottom: "16px",
  };

  const positionPaddingMap: Record<FlagButtonPosition, Partial<typeof basePaddingStyle>> = {
    "bottom-left": {
      paddingLeft: `${touchSafeInset}px`,
      paddingBottom: `${touchSafeInset}px`,
    },
    "bottom-right": {
      paddingRight: `${touchSafeInset}px`,
      paddingBottom: `${touchSafeInset}px`,
    },
    "center-left": {
      paddingLeft: `${touchSafeInset}px`,
    },
    "center-right": {
      paddingRight: `${touchSafeInset}px`,
    },
  };

  const mainPaddingStyle = isTouchscreen
    ? { ...basePaddingStyle, ...positionPaddingMap[flagButtonPosition as FlagButtonPosition] }
    : basePaddingStyle;

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        <header className="flex flex-row w-full gap-4 px-3 sm:px-8 py-2 sm:py-4 justify-between items-center border-b overflow-x-auto">
          <Link to="/">
            <div className="flex flex-row items-center gap-3">
              <img src={InesweeperLogo} alt="Inesweeper Logo" className="w-[40px] h-[40px] min-w-[40px] min-h-[40px]" />
              <h2 className="hidden min-[410px]:block text-lg sm:text-2xl">Inesweeper</h2>
            </div>
          </Link>
          <div className="flex flex-row gap-1">
            <Button asChild variant="secondary" className="pr-3">
              <Link to="/canvas">
                Multiplayer
                <ArrowRight />
              </Link>
            </Button>
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
            <InfoButton variant={variant} />
            <AuthButton authUser={authUser} />
          </div>
        </header>
        <ScrollArea className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]">
          <main
            className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center px-6 py-4"
            style={mainPaddingStyle}
          >
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
