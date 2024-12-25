import { useState } from "react";
import GameBoard from "./GameBoard";

import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

import { ChartColumnIncreasing, CircleHelp, Settings, User } from "lucide-react";
import { DifficultyName, VariantName } from "@/lib/types";
import { boardConfigLibrary } from "@/lib/minesweeper";

const Layout = () => {
  const [variant, setVariant] = useState<VariantName>("classic");
  const [difficulty, setDifficulty] = useState<DifficultyName>("beg");

  return (
    <div className="flex flex-col items-center min-h-screen select-none">
      <header className="flex flex-row w-full px-4 gap-6 sm:px-8 py-4 justify-between items-center border-b">
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
      <ScrollArea className="flex w-full h-[calc(100vh-74px)]">
        <main className="flex flex-col h-[calc(100vh-74px)] gap-4 justify-center items-center px-4 sm:px-8 py-6 sm:py-8">
          <GameBoard
            config={boardConfigLibrary[variant][difficulty]}
            cellWidth={30}
          />
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
          </div>
        </main>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default Layout;
