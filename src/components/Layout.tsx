import { useEffect, useState } from "react";
import { DifficultyName, TimeRecord, VariantName } from "@/lib/types";
import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";

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
import { Separator } from "./ui/separator";

import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import { ChartColumnIncreasing, Settings, Info, Github } from "lucide-react";

const Layout = () => {
  const [isTouchscreen, setIsTouchscreen] = useState(false);
  const [variant, setVariant] = useState<VariantName>("classic");
  const [difficulty, setDifficulty] = useState<DifficultyName>("beg");
  const [zoom, setZoom] = useState(100);
  const [flagButtonSize, setFlagButtonSize] = useState(72);
  const [flagButtonPosition, setFlagButtonPosition] = useState("bottom-right");
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
    const savedRecords = localStorage.getItem("gameRecords");
    const savedZoom = localStorage.getItem("zoom");
    const savedFlagButtonSize = localStorage.getItem("flagButtonSize");
    const savedFlagButtonPosition = localStorage.getItem("flagButtonPosition");

    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedZoom) setZoom(Number(savedZoom));
    if (savedFlagButtonSize) setFlagButtonSize(Number(savedFlagButtonSize));
    if (savedFlagButtonPosition) setFlagButtonPosition(savedFlagButtonPosition);
  }, []);

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
    const updatedRecords = [...records, newRecord];
    setRecords(updatedRecords);
    localStorage.setItem("gameRecords", JSON.stringify(updatedRecords));
  };

  return (
    <div className="flex flex-col items-center min-h-screen overflow-hidden">
      <header className="flex flex-row w-full gap-4 px-2 sm:px-8 py-2 sm:py-4 justify-between items-center border-b overflow-x-auto">
        <a href="/">
          <div className="flex flex-row items-center gap-3">
            <img src={InesweeperLogo} alt="Inesweeper Logo" className="w-[40px] h-[40px] min-w-[40px] min-h-[40px]" />
            <h2 className="text-lg sm:text-2xl">Inesweeper</h2>
          </div>
        </a>
        <div className="flex flex-row gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="icon">
                <Settings />
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-10">
              <DialogHeader>
                <DialogTitle>Preferences</DialogTitle>
                <DialogDescription hidden>
                  Customize your experience
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-center gap-3">
                  <p className="w-1/2">Board scale: {zoom}%</p>
                  <Slider className="w-1/2" value={[zoom]} onValueChange={(value) => setZoom(value[0])} min={60} max={200} step={10} />
                </div>
                <Separator />
                <div className="flex flex-row justify-between items-center gap-3">
                  <p className="w-1/2">Flag toggle button size: {flagButtonSize} px</p>
                  <Slider className="w-1/2" value={[flagButtonSize]} onValueChange={(value) => setFlagButtonSize(value[0])} min={20} max={160} step={4} />
                </div>
                <div className="flex flex-row justify-between items-center gap-3">
                  <p className="w-1/2">Flag toggle button position</p>
                  <Select onValueChange={(value) => setFlagButtonPosition(value)}>
                    <SelectTrigger className="w-[180px] max-w-1/2">
                      <SelectValue placeholder="Bottom Right" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="center-left">Center Left</SelectItem>
                      <SelectItem value="center-right">Center Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <TableCell>{variantMap[mode as keyof typeof variantMap]}</TableCell>
                    {Object.keys(difficultyMap).map((difficultyKey) => {
                      const filteredRecords = records.filter(
                        (record) =>
                          JSON.stringify(record.boardConfig) === JSON.stringify(boardConfigLibrary[mode as keyof typeof boardConfigLibrary][difficultyKey as keyof typeof difficultyMap])
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
                <Info />
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6">
              <DialogHeader>
                <DialogTitle>How to Play</DialogTitle>
                <DialogDescription hidden>
                  Variant descriptions
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="classic" className="flex flex-col gap-2">
                <TabsList className="w-min">
                  <TabsTrigger value="classic">Classic</TabsTrigger>
                  <TabsTrigger value="multimines">Multimines</TabsTrigger>
                  <TabsTrigger value="liar">Liar</TabsTrigger>
                  <TabsTrigger value="omega">Omega</TabsTrigger>
                </TabsList>
                <TabsContent value="classic">
                  <p>The classic Minesweeper experience. To win, reveal all safe tiles without clicking on any mines. Numbered tiles indicate the number of mines hidden in the adjacent eight tiles.</p>
                </TabsContent>
                <TabsContent value="multimines">
                  <p>Minesweeper, but with up to four mines per tile.</p>
                </TabsContent>
                <TabsContent value="liar">
                  <p>Minesweeper, but number tiles "lie" by displaying numbers as one off from the actual value.</p>
                </TabsContent>
                <TabsContent value="omega">
                  <p>Minesweeper, but also with negative mines. All tiles adjacent to 0's are automatically revealed if they contain no mines (either positive or negative). This means all unrevealed tiles adjacent to 0's are guaranteed to contain a mine.</p>
                </TabsContent>
              </Tabs>
              <div className="flex justify-end">
                <a href="https://github.com/osutaiko/inesweeper">
                  <Github />
                </a>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <ScrollArea className="flex w-full h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]">
        <main className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center px-4 sm:px-8 py-4 sm:py-8">
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
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="multimines">Multimines</SelectItem>
                <SelectItem value="liar">Liar</SelectItem>
                <SelectItem value="omega">Omega</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(value) => setDifficulty(value as DifficultyName)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent className="w-[160px]">
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
