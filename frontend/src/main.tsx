import ReactDOM from "react-dom/client";
import "./index.css";

import Layout from "./components/Layout";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <Layout />
    <Analytics />
    <SpeedInsights />
  </>
);
