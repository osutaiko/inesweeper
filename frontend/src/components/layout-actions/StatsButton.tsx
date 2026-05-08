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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartColumnIncreasing } from "lucide-react";

import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";
import { formatTimeMs } from "@/lib/utils";

type StatsButtonProps = {
  isDesktop: boolean;
  displayedRecords: TimeRecord[];
};

const StatsButton = ({ isDesktop, displayedRecords }: StatsButtonProps) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="secondary" size="icon">
        <ChartColumnIncreasing />
      </Button>
    </DialogTrigger>
    <DialogContent className="gap-6">
      <DialogHeader>
        <DialogTitle>My Records</DialogTitle>
        <DialogDescription hidden>Stats</DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[calc(100vh-90px)]">
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
                <TableCell className="font-bold">
                  {variantMap[mode as keyof typeof variantMap]}
                </TableCell>
                {Object.keys(difficultyMap).map((difficultyKey) => {
                  const filteredRecords = displayedRecords.filter(
                    (record) =>
                      JSON.stringify(record.boardConfig) ===
                      JSON.stringify(
                        boardConfigLibrary[mode as keyof typeof boardConfigLibrary][
                          difficultyKey as keyof typeof difficultyMap
                        ],
                      ),
                  );

                  const bestTime = filteredRecords.reduce(
                    (min, record) => (record.timeElapsed < min ? record.timeElapsed : min),
                    Infinity,
                  );

                  return (
                    <TableCell key={difficultyKey} className="text-center">
                      {bestTime === Infinity ? "-" : formatTimeMs(bestTime)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

export default StatsButton;
