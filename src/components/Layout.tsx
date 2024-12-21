import { Outlet, Link } from "react-router-dom";

import { Button } from "./ui/button";
import { ChartColumnIncreasing, CircleHelp, Settings, User } from "lucide-react";

const Layout = () => {
  return (
    <div className="flex flex-col items-center min-h-screen select-none">
      <header className="flex flex-row w-full px-4 gap-6 md:px-8 py-4 justify-between items-center border-b">
        <h2>Inesweeper</h2>
        <div className="flex flex-row gap-2">
          <Button variant="secondary" size="icon">
            <Settings />
          </Button>
          <Button variant="secondary" size="icon">
            <ChartColumnIncreasing />
          </Button>
          <Button variant="secondary" size="icon">
            <CircleHelp />
          </Button>
          <Button variant="secondary" size="icon">
            <User />
          </Button>
        </div>
      </header>
      <main className="flex flex-col w-full px-4 md:px-8 py-8 items-center overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
