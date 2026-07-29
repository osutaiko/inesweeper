import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import type { AuthUser } from "@/lib/auth";
import AuthButton from "./layout-actions/AuthButton";
import { Button } from "./ui/button";

type CanvasHeaderProps = {
  authUser: AuthUser | null;
};

const CanvasHeader = ({ authUser }: CanvasHeaderProps) => (
  <header className="flex flex-row w-full gap-4 px-3 sm:px-8 py-2 sm:py-4 justify-between items-center border-b overflow-x-auto">
    <a href="/">
      <div className="flex flex-row items-center gap-3">
        <img src={InesweeperLogo} alt="Inesweeper Logo" className="w-[40px] h-[40px] min-w-[40px] min-h-[40px]" />
        <h2 className="font-minesweeper hidden min-[510px]:block text-lg sm:text-2xl">
          <span className="text-red-500">I</span>
          <span className="text-green-500">N</span>
          <span className="text-blue-500">E</span>
          s<span className="text-muted-foreground">-</span>Place
        </h2>
      </div>
    </a>
    <div className="flex flex-row gap-2">
      <Button asChild variant="secondary" className="pr-3">
        <Link to="/">
          <ArrowLeft />
          Singleplayer
        </Link>
      </Button>
      <AuthButton authUser={authUser} />
    </div>
  </header>
);

export default CanvasHeader;
