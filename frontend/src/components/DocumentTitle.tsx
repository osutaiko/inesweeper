import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const DocumentTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = pathname.startsWith("/place")
      ? "Inesweeper Place"
      : "Inesweeper";
  }, [pathname]);

  return null;
};
