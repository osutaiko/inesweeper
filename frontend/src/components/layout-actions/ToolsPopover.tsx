import type { Dispatch, SetStateAction } from "react";

import type { TimeRecord, VariantName } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";

import InfoButton from "./InfoButton";
import SettingsButton from "./SettingsButton";
import StatsButton from "./StatsButton";

type ToolsPopoverProps = {
  isDesktop: boolean;
  isTouchscreen: boolean;
  variant: VariantName;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  flagButtonSize: number;
  setFlagButtonSize: Dispatch<SetStateAction<number>>;
  flagButtonPosition: string;
  setFlagButtonPosition: Dispatch<SetStateAction<string>>;
  displayedRecords: TimeRecord[];
  isAuthed: boolean;
};

const ToolsPopover = ({
  isDesktop,
  isTouchscreen,
  variant,
  zoom,
  setZoom,
  flagButtonSize,
  setFlagButtonSize,
  flagButtonPosition,
  setFlagButtonPosition,
  displayedRecords,
  isAuthed,
}: ToolsPopoverProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="secondary" size="icon">
        <MoreHorizontal />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-min p-0">
      <ButtonGroup orientation="vertical" className="w-full">
        <SettingsButton
          isTouchscreen={isTouchscreen}
          zoom={zoom}
          setZoom={setZoom}
          flagButtonSize={flagButtonSize}
          setFlagButtonSize={setFlagButtonSize}
          flagButtonPosition={flagButtonPosition}
          setFlagButtonPosition={setFlagButtonPosition}
          className="w-full justify-start"
        />
        <StatsButton
          isDesktop={isDesktop}
          displayedRecords={displayedRecords}
          isAuthed={isAuthed}
          className="w-full justify-start"
        />
        <InfoButton variant={variant} className="w-full justify-start" />
      </ButtonGroup>
    </PopoverContent>
  </Popover>
);

export default ToolsPopover;
