import { useState } from "react";
import GameBoard from "./GameBoard";

import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartColumnIncreasing, CircleHelp, Settings, User } from "lucide-react";
import { DifficultyName, VariantName } from "@/lib/types";

const Layout = () => {
  const [variant, setVariant] = useState<VariantName>("classic");
  const [difficulty, setDifficulty] = useState<DifficultyName>("beg");

  return (
    <div className="flex flex-col items-center min-h-screen select-none">
      <header className="flex flex-row w-full px-4 gap-6 md:px-8 py-4 justify-between items-center border-b">
        <h2>Inesweeper</h2>
        <div className="flex flex-row gap-2">
          <Select value={variant} onValueChange={(value) => setVariant(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Variant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic</SelectItem>
              <SelectItem value="multimines">Multimines</SelectItem>
              <SelectItem value="liar">Liar</SelectItem>
              <SelectItem value="omega">Omega</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={(value) => setDifficulty(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beg">Beginner</SelectItem>
              <SelectItem value="int">Intermediate</SelectItem>
              <SelectItem value="exp">Expert</SelectItem>
            </SelectContent>
          </Select>
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
      <main className="flex flex-col items-center w-full h-[calc(100vh-74px)] px-4 md:px-8 py-6 md:py-8 overflow-y-auto">
        <GameBoard
          variant={variant}
          difficulty={difficulty}
          cellWidth={30}
        />
      </main>
    </div>
  );
};

export default Layout;
