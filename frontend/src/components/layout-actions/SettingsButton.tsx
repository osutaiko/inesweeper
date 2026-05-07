import type { Dispatch, SetStateAction } from "react";

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
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";

import { ThemeToggle } from "../ui/theme-toggle";

type SettingsButtonProps = {
  isTouchscreen: boolean;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  flagButtonSize: number;
  setFlagButtonSize: Dispatch<SetStateAction<number>>;
  flagButtonPosition: string;
  setFlagButtonPosition: Dispatch<SetStateAction<string>>;
};

const SettingsButton = ({
  isTouchscreen,
  zoom,
  setZoom,
  flagButtonSize,
  setFlagButtonSize,
  flagButtonPosition,
  setFlagButtonPosition,
}: SettingsButtonProps) => (
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
      <ScrollArea className="max-h-[calc(100vh-90px)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-row justify-between items-center gap-3">
            <p className="w-1/2">Theme</p>
            <ThemeToggle />
          </div>
          <div className="flex flex-row justify-between items-center gap-3">
            <p className="w-1/2">Board scale: {zoom}%</p>
            <Slider className="w-1/2" value={[zoom]} onValueChange={(value) => setZoom(value[0])} min={60} max={200} step={10} />
          </div>
          {isTouchscreen && (
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
          )}
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

export default SettingsButton;
