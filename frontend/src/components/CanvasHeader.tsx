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
  <header className="flex w-full flex-row items-center justify-between gap-4 overflow-x-auto border-b px-3 py-2 sm:px-8 sm:py-4">
    <Link to="/">
      <div className="flex flex-row items-center gap-3">
        <img
          src={InesweeperLogo}
          alt="Inesweeper Logo"
          className="h-[40px] min-h-[40px] w-[40px] min-w-[40px]"
        />
        <h2 className="hidden text-lg min-[410px]:block sm:text-2xl">
          Inesweeper
        </h2>
      </div>
    </Link>
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
