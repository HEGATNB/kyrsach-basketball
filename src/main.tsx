import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { AppRouter } from "@/app/providers/AppRouter";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);
