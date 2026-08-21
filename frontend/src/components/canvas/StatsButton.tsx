import { useState } from "react";
import { ChartColumnIncreasing } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shadcn/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { getCanvasStats, type CanvasStats } from "@/lib/canvas/api";

const formatCount = (count: number | null | undefined) =>
  count?.toLocaleString() ?? "-";

const StatsButton = () => {
  const [stats, setStats] = useState<CanvasStats | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      return;
    }

    setLoadFailed(false);
    void getCanvasStats().then(setStats).catch(() => setLoadFailed(true));
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon">
          <ChartColumnIncreasing />
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-6">
        <DialogHeader>
          <DialogTitle>Place Stats</DialogTitle>
          <DialogDescription hidden>
            Inesweeper Place statistics
          </DialogDescription>
        </DialogHeader>
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead className="text-right">Cells</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="px-2">Me</TableCell>
                <TableCell className="text-right">
                  {formatCount(stats?.yourChunksSolved)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCount(
                    stats?.yourChunksSolved == null
                      ? null
                      : stats.yourChunksSolved * 256,
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {loadFailed && <p>Unable to load stats.</p>}
        </div>
        <div>
          <Table className="min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 px-2 text-center"></TableHead>
                <TableHead className="w-full">Sweeper</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.leaderboard.map((entry, index) => (
                <TableRow key={entry.nickname}>
                  <TableCell className="w-12 px-2 text-center">
                    {index + 1}
                  </TableCell>
                  <TableCell className="max-w-0">
                    <span
                      className="block truncate"
                      title={entry.nickname}
                    >
                      {entry.nickname}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCount(entry.chunksSolved)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="px-2">Global</TableCell>
                <TableCell className="text-right">
                  {formatCount(stats?.chunksSolved)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatsButton;
