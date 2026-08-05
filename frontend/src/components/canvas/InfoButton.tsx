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
import { Info } from "lucide-react";
import { siGithub } from "simple-icons";

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
        <DialogDescription hidden>Inesweeper Place description</DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[calc(100vh-140px)]">
        <p className="mb-2"><span className="text-foreground">Inesweeper Place</span> is Minesweeper played on a public infinite board.</p>
        <p className="text-destructive mb-6">
          You must be logged in to solve chunks!
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">1. Locking a chunk</h3>
            <p>
              Select an open chunk next to a solved chunk, and click on the <b>"Attempt Claim"</b> button.
              You can only lock one chunk at a time.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">2. Solving the chunk</h3>
            <p>
              You are given 3 minutes to solve the 16x16 board. You can chord on cells of neighboring chunks but not reveal/flag on them.
            </p>
            <p>
              Only neighboring chunks that are already solved provide visible clues.
              Their cells can be chorded, but cannot be revealed or flagged.
            </p>
            <p>
              Unlike classic Minesweeper, your first click is not guaranteed to be safe. 
            </p>
            <small>
              Leaving or refreshing the page while solving (unfortunately) resets your claim progress, but the claim timer continues.
            </small>
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="font-medium">Successful claims</h4>
            <p>
              Successfully solving the board claims the chunk under your nickname. You may attempt another claim immediately!
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-medium">Failed claims</h4>
            <p>
              Clicking on a mine or running out of time immediately unlocks the chunk for other users to try.
              You must wait <b>30 seconds</b> before attempting another claim.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-medium">About the board</h4>
            <p>
              The community board is infinite but divided into 16x16 <b>"chunks"</b>.
            </p>
            <p>
              Each cell independently has a <b>15.625%</b> (40/256) chance of containing a mine, the same density as the intermediate difficulty in normal Minesweeper.
              That is, each 16x16 chunk has 40 mines on average, but the exact number varies.
            </p>
            <p>
              Each chunk has a fixed mine layout and failed claim attempts do not regenerate the board.
            </p>
          </div>
        </div>
      </ScrollArea>
      <div className="flex flex-row justify-between items-center">
        <Link to="/privacy">
          <Button variant="link" className="p-0">
            Privacy Policy
          </Button>
        </Link>
        <a href="https://github.com/osutaiko/inesweeper" target="_blank" rel="noopener noreferrer">
          <svg role="img" viewBox="0 0 24 24" className="size-6 fill-current">
            <title>GitHub</title>
            <path d={siGithub.path} />
          </svg>
        </a>
      </div>
    </DialogContent>
  </Dialog>
);

export default InfoButton;
