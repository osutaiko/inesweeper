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
import { ChartColumnIncreasing } from "lucide-react";

import { ScoreTable } from "./ScoreTable";

type StatsButtonProps = {
  isDesktop: boolean;
  displayedRecords: TimeRecord[];
  globalRecords: TimeRecord[];
  isAuthed: boolean;
};

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
      <Tabs defaultValue="me">
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
