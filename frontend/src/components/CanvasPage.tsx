import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "./ui/button";

import { ThemeProvider } from "./theme-provider";
import StatusToast from "./StatusToast";
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

  const { fromChunkX, fromChunkY, toChunkX, toChunkY } = {
    fromChunkX: viewCenterChunkX - 2,
    fromChunkY: viewCenterChunkY - 2,
    toChunkX: viewCenterChunkX + 2,
    toChunkY: viewCenterChunkY + 2,
  };

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

  const areaWidth = 5;
  const areaHeight = 5;

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

        <main className="relative flex w-full flex-1 overflow-hidden">
          <div className="relative flex flex-1 items-start justify-start overflow-auto">
            {error && (
              <StatusToast variant="error" message={error} className="absolute left-4 top-4 z-10" />
            )}

            {isLoading && (
              <StatusToast variant="loading" message="Loading..." className="absolute right-4 top-4 z-10" />
            )}

            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${areaWidth}, 50px)`,
                gridTemplateRows: `repeat(${areaHeight}, 50px)`,
              }}
            >
              {chunkArea?.chunks.map((chunk) => (
                <div
                  key={`${chunk.chunkX}:${chunk.chunkY}`}
                  className="flex h-[50px] w-[50px] border text-[10px]"
                >
                  {chunk.state}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default CanvasPage;
