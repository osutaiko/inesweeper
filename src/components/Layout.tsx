import { Outlet, Link } from "react-router-dom";

const Layout = () => {
  return (
    <div className="flex flex-col items-center min-h-screen select-none">
      <header className="flex flex-row px-4 md:px-8 py-4 justify-between items-center w-full border-b bg-secondary/30">
        <h3>Inesweeper</h3>
      </header>
      <main className="flex flex-grow justify-center overflow-hidden w-full max-w-screen-2xl">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
