import type { TimeRecord } from "@/lib/types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/shadcn/table";

import { boardConfigLibrary, difficultyMap, variantMap } from "@/lib/constants";
import { formatTimeMs } from "@/lib/utils";

type ScoreTableProps = {
  isDesktop: boolean;
  records: TimeRecord[];
  compareRecords: TimeRecord[];
};

export const ScoreTable = ({ isDesktop, records, compareRecords }: ScoreTableProps) => (
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
      {Object.keys(boardConfigLibrary).filter((mode) => mode !== "nearest2").map((mode) => (
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
