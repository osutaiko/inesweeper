import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "./ui/button";

import { ThemeProvider } from "./theme-provider";
import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import { ArrowLeft } from "lucide-react";
import { loadCurrentAuthUser, subscribeToAuthUser, type AuthUser } from "@/lib/auth";
import AuthButton from "./layout-actions/AuthButton";

const CanvasPage = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

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
          <main
            className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center px-6 py-4"
            /* style={mainPaddingStyle} */
          >
            main
          </main>
      </div>
    </ThemeProvider>
  );
};

export default CanvasPage;
