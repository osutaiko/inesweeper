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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

import { BugPlay, ChartColumnIncreasing, CircleHelp, Settings } from "lucide-react";
import { DifficultyName, TimeRecord, VariantName } from "@/lib/types";
import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";

const Layout = () => {
  const [isTouchscreen, setIsTouchscreen] = useState(false);
  const [variant, setVariant] = useState<VariantName>("classic");
  const [difficulty, setDifficulty] = useState<DifficultyName>("beg");
  const [zoom, setZoom] = useState(100);
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
    const savedZoom = localStorage.getItem("zoom");
    if (savedZoom) {
      setZoom(Number(savedZoom));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("zoom", zoom.toString());
  }, [zoom]);

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
        <div className="flex flex-row items-center gap-3">
          <BugPlay size={28} />
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
                <p>Board Scale: {zoom}%</p>
                <Slider value={[zoom]} onValueChange={(value) => setZoom(value[0])} min={60} max={300} step={10} />
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
                  <TableHead>Variant</TableHead>
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
                    <TableCell>{variantMap[mode]}</TableCell>
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
                  Variant descriptions
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="classic">
                <TabsList>
                  <TabsTrigger value="classic">Classic</TabsTrigger>
                  <TabsTrigger value="multimines">Multimines</TabsTrigger>
                  <TabsTrigger value="liar">Liar</TabsTrigger>
                  <TabsTrigger value="omega">Omega</TabsTrigger>
                </TabsList>
                <TabsContent value="classic">
                  <p>sd</p>
                </TabsContent>
                <TabsContent value="multimines">Cha</TabsContent>
                <TabsContent value="liar">M</TabsContent>
                <TabsContent value="omega">M</TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <ScrollArea className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]">
        <main className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center px-4 sm:px-8 py-4 sm:py-8">
          <div 
            style={{
              zoom: zoom / 100,
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
