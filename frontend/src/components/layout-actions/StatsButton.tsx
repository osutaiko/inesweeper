import type { TimeRecord } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartColumnIncreasing } from "lucide-react";

import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";
import { formatTimeMs } from "@/lib/utils";

type StatsButtonProps = {
  isDesktop: boolean;
  displayedRecords: TimeRecord[];
  globalRecords: TimeRecord[];
  isAuthed: boolean;
};

type ScoreTableProps = {
  isDesktop: boolean;
  records: TimeRecord[];
  compareRecords: TimeRecord[];
};

const ScoreTable = ({ isDesktop, records, compareRecords }: ScoreTableProps) => (
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
          <TableCell className="px-4 py-2 font-bold">
            {variantMap[mode as keyof typeof variantMap]}
          </TableCell>
          {Object.keys(difficultyMap).map((difficultyKey) => {
            const boardConfig =
              boardConfigLibrary[mode as keyof typeof boardConfigLibrary][
                difficultyKey as keyof typeof difficultyMap
              ];

            const recordsForBoard = records.filter(
              (record) => JSON.stringify(record.boardConfig) === JSON.stringify(boardConfig),
            );
            const compareRecordForBoard = compareRecords.filter(
              (record) => JSON.stringify(record.boardConfig) === JSON.stringify(boardConfig),
            );

            const bestTime = recordsForBoard.reduce(
              (min, record) => (record.timeElapsed < min ? record.timeElapsed : min),
              Infinity,
            );
            const compareBestTime = compareRecordForBoard.reduce(
              (min, record) => (record.timeElapsed < min ? record.timeElapsed : min),
              Infinity,
            );
            const isRecordHolder =
              bestTime !== Infinity &&
              compareBestTime !== Infinity &&
              bestTime === compareBestTime;

            return (
              <TableCell key={difficultyKey} className="p-2 text-center">
                <span
                  className={
                    isRecordHolder
                      ? "font-medium underline decoration-amber-500 decoration-2 underline-offset-4 underline-"
                      : undefined
                  }
                >
                  {bestTime === Infinity ? "-" : formatTimeMs(bestTime)}
                </span>
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const StatsButton = ({
  isDesktop,
  displayedRecords,
  globalRecords,
  isAuthed,
}: StatsButtonProps) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="secondary" size="icon">
        <ChartColumnIncreasing />
      </Button>
    </DialogTrigger>
    <DialogContent className="gap-6 px-0 min-[400px]:px-6">
      <DialogHeader>
        <DialogTitle>Hi-Scores</DialogTitle>
        <DialogDescription hidden={isAuthed} className="text-destructive">
          Log in to save your times online, and qualify for the global Hi-scores!
        </DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="me" className="px-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="me">Me</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>
        <TabsContent value="me" className="mt-4">
          <ScrollArea className="max-h-[calc(100vh-150px)]">
            <ScoreTable
              isDesktop={isDesktop}
              records={displayedRecords}
              compareRecords={globalRecords}
            />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="global" className="mt-4">
          <ScrollArea className="max-h-[calc(100vh-150px)]">
            <ScoreTable
              isDesktop={isDesktop}
              records={globalRecords}
              compareRecords={displayedRecords}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
);

export default StatsButton;
