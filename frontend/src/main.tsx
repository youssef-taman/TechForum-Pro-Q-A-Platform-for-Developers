import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";
// Background-initialize optional runtimes to reduce first-run latency
import { prewarmAll } from "./lib/runtime-init";

prewarmAll();

const router = getRouter();
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element "#root" not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
