import React from "react";
import ReactDOM from "react-dom/client";
import "./storageShim.js";
import "./index.css";
import NovelTranslatorApp from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NovelTranslatorApp />
  </React.StrictMode>
);
