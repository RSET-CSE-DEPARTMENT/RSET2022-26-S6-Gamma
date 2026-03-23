import React from "react";
import Dashboard from "./components/Dashboard";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Dashboard />
      <Toaster richColors position="top-right" />
    </>
  );
}
