import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./index.css";

import Layout from "./components/Layout";
import CanvasPage from "./components/canvas/CanvasPage";
import CanvasSolvePage from "./components/canvas/CanvasSolvePage";
import PrivacyPolicy from "./components/PrivacyPolicy";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const DocumentTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = pathname.startsWith("/place")
      ? "Inesweeper Place"
      : "Inesweeper";
  }, [pathname]);

  return null;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <DocumentTitle />
    <Routes>
      <Route path="/" element={<Layout />} />
      <Route path="/place" element={<Layout><CanvasPage /></Layout>} />
      <Route path="/place/solve" element={<Layout><CanvasSolvePage /></Layout>} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Analytics />
    <SpeedInsights />
  </BrowserRouter>,
);
