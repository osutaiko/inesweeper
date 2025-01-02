import ReactDOM from "react-dom/client";
import "./index.css";

import Layout from "./components/Layout";
import { Analytics } from "@vercel/analytics/next";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <Layout />
    <Analytics />
  </>
);
