import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, Info } from "lucide-react";

import { Link } from "react-router-dom";

const InfoButton = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="secondary" size="icon">
        <Info />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-h-screen gap-6">
      <DialogHeader>
        <DialogTitle>How to Play</DialogTitle>
        <DialogDescription hidden>Variant descriptions</DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[calc(100vh-140px)]">
        <p className="mb-6">To win, reveal all safe cells without clicking on any mines.</p>
        <Tabs defaultValue={"mine-types"} className="w-full">
          <span className="mr-3 text-sm">Different...</span>
          <TabsList>
            <TabsTrigger value="mine-types">Mines</TabsTrigger>
            <TabsTrigger value="number-scheme">Numbers</TabsTrigger>
            <TabsTrigger value="mine-calculation">Generation</TabsTrigger>
          </TabsList>
          <TabsContent value="mine-types" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Multimines</h4>
                <p>Minesweeper with multiple mines per cell. There can be either one, two, or three mines per cell.</p>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Omega</h4>
                <p>There can be either a positive mine (red flag), or a negative mine (blue flag) on a cell.</p>
                <small>Note: As a special rule, all cells neighboring 0&apos;s are automatically revealed if they contain no mines. This means each unrevealed cell neighboring an explicit 0 is guaranteed to contain a mine (either positive or negative).</small>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Colorful</h4>
                <p>Mines can be red, yellow, or blue. Instead of numbers, cells show the mixed color of neighboring mines.</p>
                <small>Note: Mines are generated such that each safe cell doesn't have more than one neighboring mines of the same color.</small>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="number-scheme" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Liar</h4>
                <p>The number on each cell is incorrect, displaying a value that is off by one from the actual number of neighboring mines.</p>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Amplified</h4>
                <p>Each mine on a red cell counts as two mines.</p>
                <small>Note: The total number of mines displayed on the top left corner remains unaffected by this rule.</small>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Contrast</h4>
                <p>The number on a cell indicates the difference in the number of mines between neighboring red and blue cells.</p>
                <small>Note: As a special rule, all cells neighboring 0&apos;s are automatically revealed if they contain no mines. This means each unrevealed cell neighboring an explicit 0 is guaranteed to contain a mine.</small>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Crossed</h4>
                <p>The number on a cell indicates how many mines are in a cross-shaped region within distance 2.</p>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Knight&apos;s Path</h4>
                <p>The number on a cell indicates how many mines are two cells away in one direction and one cell away in another (i.e., knight&apos;s path in chess).</p>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Compass</h4>
                <p>Numbers are replaced by arrows pointing toward the average direction of mines in the neighboring eight cells.</p>
                <small>Note: A dot means nearby mines cancel out.</small>
                <small>Arrows are color coded. White arrows for main 8 directions (N, NE, E, SE, S, SW, W, NW), blue arrows for 22.5° half-steps, and red for in-between angles.</small>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Nearest-2</h4>
                <p>The number on a cell indicates the distance to the second nearest mine.</p>
                <small>Note: The distance to a mine is given by the Chebychev distance, which treats both orthogonal and diagonal moves equally as distance 1.</small>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="mine-calculation" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Domino</h4>
                <p>Mines are placed as orthogonally connected pairs (hence, dominoes). No two dominoes touch each other, both orthogonally and diagonally.</p>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">Scattered</h4>
                <p>No two mines touch orthogonally.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
      <div className="flex flex-row justify-between items-center">
        <Link to="/privacy">
          <Button variant="link" className="p-0">
            Privacy Policy
          </Button>
        </Link>
        <a href="https://github.com/osutaiko/inesweeper" target="_blank" rel="noopener noreferrer">
          <Github />
        </a>
      </div>
    </DialogContent>
  </Dialog>
);

export default InfoButton;
