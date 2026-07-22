import { BrowserRouter, Routes, Route } from "react-router-dom";
import SimulatorPage from "./pages/SimulatorPage";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sandbox" element={<SimulatorPage />} />
      </Routes>
    </BrowserRouter>
  );
}