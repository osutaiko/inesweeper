import { useEffect, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Slider } from "./ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

import { BugPlay, ChartColumnIncreasing, CircleHelp, Settings } from "lucide-react";
import { DifficultyName, TimeRecord, VariantName } from "@/lib/types";
import { boardConfigLibrary, difficultyMap } from "@/lib/constants";

const Layout = () => {
  const [isTouchscreen, setIsTouchscreen] = useState(false);
  const [variant, setVariant] = useState<VariantName>("classic");
  const [difficulty, setDifficulty] = useState<DifficultyName>("beg");
  const [scale, setScale] = useState(32);
  const [records, setRecords] = useState<TimeRecord[]>([]);

  useEffect(() => {
    const checkTouchscreen = () => {
      setIsTouchscreen(window.matchMedia("(pointer: coarse)").matches);
    };

    checkTouchscreen();

    window.addEventListener("resize", checkTouchscreen);
    return () => window.removeEventListener("resize", checkTouchscreen);
  }, []);

  useEffect(() => {
    const savedScale = localStorage.getItem("scale");
    if (savedScale) {
      setScale(Number(savedScale));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("scale", scale.toString());
  }, [scale]);

  useEffect(() => {
    const savedRecords = localStorage.getItem("gameRecords");
    if (savedRecords) setRecords(JSON.parse(savedRecords));
  }, []);

  const addRecord = (newRecord: TimeRecord) => {
    const updatedRecords = [...records, newRecord];
    setRecords(updatedRecords);
    localStorage.setItem("gameRecords", JSON.stringify(updatedRecords));
  };

  return (
    <div className="flex flex-col items-center min-h-screen select-none overflow-hidden">
      <header className="flex flex-row w-full px-4 gap-6 sm:px-8 py-2 sm:py-4 justify-between items-center border-b">
        <div className="flex flex-row gap-3">
          <BugPlay />
          <h2 className="hidden sm:block">Inesweeper</h2>
        </div>
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
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="icon">
                <Settings />
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6">
              <DialogHeader>
                <DialogTitle>Preferences</DialogTitle>
                <DialogDescription hidden>
                  Customize your experience
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <h4>Board Scale: {scale}%</h4>
                <Slider value={[scale]} onValueChange={(value) => setScale(value[0])} min={20} max={200} step={10} />
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="icon">
                <ChartColumnIncreasing />
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6">
              <DialogHeader>
                <DialogTitle>My Records</DialogTitle>
                <DialogDescription hidden>
                  Stats
                </DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Mode</TableHead>
                  {Object.values(difficultyMap).map((difficulty) => (
                    <TableHead key={difficulty} className="text-center">
                      {difficulty}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(boardConfigLibrary).map((mode) => (
                  <TableRow key={mode}>
                    <TableCell className="text-center">{mode.charAt(0).toUpperCase() + mode.slice(1)}</TableCell>
                    {Object.keys(difficultyMap).map((difficultyKey) => {
                      const filteredRecords = records.filter(
                        (record) =>
                          JSON.stringify(record.boardConfig) === JSON.stringify(boardConfigLibrary[mode][difficultyKey])
                      );

                      const bestTime = filteredRecords.reduce(
                        (min, record) => (record.timeElapsed < min ? record.timeElapsed : min),
                        Infinity
                      );

                      return (
                        <TableCell key={difficultyKey} className="text-center">
                          {bestTime === Infinity ? "-" : (bestTime / 1000).toFixed(2)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="icon">
                <CircleHelp />
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6">
              <DialogHeader>
                <DialogTitle>How to Play</DialogTitle>
                <DialogDescription hidden>
                  Tutorial
                </DialogDescription>
              </DialogHeader>
              <p>asdf</p>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <ScrollArea className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-74px)]">
        <main className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-74px)] gap-4 justify-center items-center px-4 sm:px-8 py-4 sm:py-8">
          <div 
            style={{
              transform: `scale(${scale / 100})`,
              backfaceVisibility: "hidden",
            }}
          >
            <GameBoard 
              config={boardConfigLibrary[variant][difficulty]}
              isTouchscreen={isTouchscreen}
              addRecord={addRecord}
            />
          </div>
        </main>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default Layout;
