import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, Info } from "lucide-react";

import { VariantName } from "@/lib/types";

type InfoButtonProps = {
  variant: VariantName;
};

const InfoButton = ({ variant }: InfoButtonProps) => (
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
        <Accordion type="multiple" defaultValue={[variant]}>
          <AccordionItem value="classic">
            <AccordionTrigger className="text-base">Classic</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>The classic Minesweeper experience.</p>
              <small>
                To win, reveal all safe cells without stepping on any mines. Numbered cells
                indicate the number of mines hidden in the neighboring eight cells.
              </small>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="multimines">
            <AccordionTrigger className="text-base">Multimines</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>Minesweeper with multiple mines per cell.</p>
              <small>There can be either one, two, or three mines per cell.</small>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="liar">
            <AccordionTrigger className="text-base">Liar</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>Minesweeper with lying numbers.</p>
              <small>
                The number on each cell is incorrect, displaying a value that is off by one from
                the actual number of neighboring mines.
              </small>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="omega">
            <AccordionTrigger className="text-base">Omega</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>Minesweeper with negative mines.</p>
              <div className="flex flex-col gap-1">
                <small>
                  There can be either a positive mine (red flag), or a negative mine (blue flag)
                  on a cell.
                </small>
                <small>
                  All cells neighboring 0&apos;s are automatically revealed if they contain no
                  mines. This means all unrevealed cells neighboring a 0 cell are guaranteed to
                  contain mines.
                </small>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="amplified">
            <AccordionTrigger className="text-base">Amplified</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>Minesweeper on a checkerboard.</p>
              <div className="flex flex-col gap-1">
                <small>Each mine on a red cell counts as two mines.</small>
                <small>
                  The total number of mines displayed on the top left corner remains unaffected by
                  this rule.
                </small>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="contrast">
            <AccordionTrigger className="text-base">Contrast</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>Minesweeper on a checkerboard (again).</p>
              <div className="flex flex-col gap-1">
                <small>
                  The number on a cell indicates the difference in the number of mines between
                  neighboring red and blue cells.
                </small>
                <small>
                  All cells neighboring 0&apos;s are automatically revealed if they contain no
                  mines. This means all unrevealed cells neighboring a 0 cell are guaranteed to
                  contain mines.
                </small>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="crossed">
            <AccordionTrigger className="text-base">Crossed</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>Minesweeper with a cross-shaped mine count.</p>
              <small>
                The number on a cell indicates how many mines are in a cross-shaped region within
                distance 2.
              </small>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="knight">
            <AccordionTrigger className="text-base">Knight&apos;s Path</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p>Minesweeper with a knight&apos;s-path-shaped mine count.</p>
              <small>
                The number on a cell indicates how many mines are two cells away in one direction
                and one cell away in another (i.e., knight&apos;s path in chess).
              </small>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
      <div className="flex flex-row justify-between items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" className="p-0">
              Privacy Policy
            </Button>
          </PopoverTrigger>
          <PopoverContent className="py-4">
            <div className="space-y-2">
              <p>Inesweeper uses Google sign-in with Supabase Auth for its member features.</p>
              <p>From your Google account we collect and store your:</p>
              <ul className="list-disc pl-5">
                <li>Gmail address</li>
                <li>Display name</li>
                <li>Profile picture</li>
                <li>Inesweeper sign-in date</li>
              </ul>
              <p>While you play games in Inesweeper we collect and store your:</p>
              <ul className="list-disc pl-5">
                <li>Individual game results with timestamps</li>
                <li>Best times</li>
              </ul>
              <p>
                You may request (either partial or full) deletion of your account data by contacting <u>henongod@gmail.com</u>.
              </p>
            </div>
          </PopoverContent>
        </Popover>
        <a href="https://github.com/osutaiko/inesweeper" target="_blank" rel="noopener noreferrer">
          <Github />
        </a>
      </div>
    </DialogContent>
  </Dialog>
);

export default InfoButton;
