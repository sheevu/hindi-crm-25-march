import React from "react";
import { createRoot } from "react-dom/client";
import App from "../vyapai-crm-v2.jsx";

const el = document.getElementById("root");
if (!el) {
  throw new Error("Root element #root not found");
}

const root = createRoot(el);
root.render(<App />);
