import { Shovel, Skull } from "lucide-react";

import { Button } from "./ui/shadcn/button";

type TouchFlagButtonProps = {
  flagButtonSize: number;
  flagButtonPosition: string;
  isFlagToggled: boolean;
  isGameOver?: boolean;
  onClick: () => void;
};

const getFlagButtonPositionClass = (flagButtonPosition: string) => {
  switch (flagButtonPosition) {
    case "bottom-left":
      return "bottom-0 left-0 rounded-tl-none rounded-tr-md rounded-bl-none rounded-br-none";
    case "center-left":
      return "top-1/2 left-0 rounded-tl-none rounded-tr-md rounded-bl-none rounded-br-md";
    case "center-right":
      return "top-1/2 right-0 rounded-tl-md rounded-tr-none rounded-bl-md rounded-br-none";
    default:
      return "bottom-0 right-0 rounded-tl-md rounded-tr-none rounded-bl-none rounded-br-none";
  }
};

const TouchFlagButton = ({
  flagButtonSize,
  flagButtonPosition,
  isFlagToggled,
  isGameOver = false,
  onClick,
}: TouchFlagButtonProps) => (
  <Button
    className={`fixed p-0 [&_svg]:size-1/2 ${getFlagButtonPositionClass(flagButtonPosition)} text-primary ${isFlagToggled ? "bg-destructive hover:bg-destructive/90" : "bg-game-button hover:bg-game-button/90"}`}
    style={{
      width: flagButtonSize,
      height: flagButtonSize,
    }}
    onClick={onClick}
  >
    {isGameOver ? (
      <Skull />
    ) : isFlagToggled ? (
      <span
        className="font-minesweeper leading-none"
        style={{ fontSize: `${flagButtonSize * 0.5}px` }}
      >
        `
      </span>
    ) : (
      <Shovel />
    )}
  </Button>
);

export default TouchFlagButton;
