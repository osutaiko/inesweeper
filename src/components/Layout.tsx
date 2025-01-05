import { useEffect, useState } from "react";
import { ThemeProvider } from "./theme-provider";
import { DifficultyName, TimeRecord, VariantName } from "@/lib/types";
import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";
import { useMediaQuery } from "@/lib/utils";

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "./ui/separator";

import InesweeperLogo from "@/assets/images/inesweeper-logo.svg";
import { ChartColumnIncreasing, Settings, Info, Github } from "lucide-react";
import { ThemeToggle } from "./ui/theme-toggle";

const Layout = () => {
  const isDesktop = useMediaQuery("(min-width: 640px)");
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
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex flex-col items-center min-h-screen overflow-hidden touch-none">
        <header className="flex flex-row w-full gap-4 px-3 sm:px-8 py-2 sm:py-4 justify-between items-center border-b overflow-x-auto">
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
                <div className="flex flex-col gap-3">
                  <div className="flex flex-row justify-between items-center gap-3">
                    <p className="w-1/2">Theme</p>
                    <ThemeToggle />
                  </div>
                  <div className="flex flex-row justify-between items-center gap-3">
                    <p className="w-1/2">Board scale: {zoom}%</p>
                    <Slider className="w-1/2" value={[zoom]} onValueChange={(value) => setZoom(value[0])} min={60} max={200} step={10} />
                  </div>
                  {isTouchscreen && 
                    <>
                      <Separator className="my-2" />
                      <div className="flex flex-row justify-between items-center gap-3">
                        <p className="w-1/2">Flag toggle button size: {flagButtonSize} px</p>
                        <Slider className="w-1/2" value={[flagButtonSize]} onValueChange={(value) => setFlagButtonSize(value[0])} min={20} max={160} step={4} />
                      </div>
                      <div className="flex flex-row justify-between items-center gap-3">
                        <p className="w-1/2">Flag toggle button position</p>
                        <Select value={flagButtonPosition} onValueChange={(value) => setFlagButtonPosition(value)}>
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
                    </>
                  }
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
                    <TableHead className="text-black">Variant</TableHead>
                    {Object.values(difficultyMap).map((difficulty) => (
                      <TableHead key={difficulty.full} className="text-center">
                        {isDesktop ? difficulty.full : difficulty.short}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(boardConfigLibrary).map((mode) => (
                    <TableRow key={mode}>
                      <TableCell className="font-bold">{variantMap[mode as keyof typeof variantMap]}</TableCell>
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
                <Accordion type="single" defaultValue={variant} collapsible>
                  <AccordionItem value="classic">
                    <AccordionTrigger className="text-base font-bold">Classic</AccordionTrigger>
                    <AccordionContent>
                      <p>The classic Minesweeper experience. To win, reveal all safe tiles without clicking on any mines. Numbered tiles indicate the number of mines hidden in the adjacent eight tiles.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="multimines">
                    <AccordionTrigger className="text-base font-bold">Multimines</AccordionTrigger>
                    <AccordionContent>
                      <p>Minesweeper, but with up to three mines per tile.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="liar">
                    <AccordionTrigger className="text-base font-bold">Liar</AccordionTrigger>
                    <AccordionContent>
                      <p>Minesweeper, but number tiles "lie" by displaying numbers as one off from the actual value.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="omega">
                    <AccordionTrigger className="text-base font-bold">Omega</AccordionTrigger>
                    <AccordionContent>
                      <p>Minesweeper, but also with negative mines. All tiles adjacent to 0's are automatically revealed if they contain no mines (either positive or negative). This means all unrevealed tiles adjacent to 0's are guaranteed to contain a mine.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="amplified">
                    <AccordionTrigger className="text-base font-bold">Amplified</AccordionTrigger>
                    <AccordionContent>
                      <p>Minesweeper, but the mines on marked tiles (in a checkerboard pattern) count as two.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="contrast">
                    <AccordionTrigger className="text-base font-bold">Contrast</AccordionTrigger>
                    <AccordionContent>
                      <p>Minesweeper, but the number on the cell indicates the difference in the number of mines between adjacent colored and uncolored tiles.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="crossed">
                    <AccordionTrigger className="text-base font-bold">Crossed</AccordionTrigger>
                    <AccordionContent>
                      <p>Minesweeper, but the number on the cell indicates how many mines are in a cross-shaped region within distance 2.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="knight">
                    <AccordionTrigger className="text-base font-bold">Knight's Path</AccordionTrigger>
                    <AccordionContent>
                      <p>Minesweeper, but the number on the cell indicates how many mines are two cells away in one direction and one cell away in another (i.e. knight's path in chess).</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
          <main className="flex flex-col min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] gap-4 justify-center items-center px-6 py-4">
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
                  {Object.entries(variantMap).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as DifficultyName)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(difficultyMap).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label.full}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </main>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </ThemeProvider>
  );
};

export default Layout;
