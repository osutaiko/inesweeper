import { GameBoard } from "@/components/GameBoard";

export const Home = () => {
  return (
    <div className="">
      <h2>ASDFO</h2>
      <GameBoard
        variant={"omega"}
        difficulty={"exp"}
        cellWidth={30}
      />
    </div>
  );
};
  
export default Home;
