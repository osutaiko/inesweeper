import { GameBoard } from "@/components/GameBoard";
import { ScrollArea } from "@radix-ui/react-scroll-area";

export const Home = () => {
  return (
    <>
      <GameBoard
        variant={"multimines"}
        difficulty={"exp"}
        cellWidth={30}
      />
    </>
  );
};
  
export default Home;
