import { BrowserRouter, Routes, Route } from "react-router-dom";
import SimulatorPage from "./pages/SimulatorPage";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <BrowserRouter basename="/nba-matchup-simulator">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/sandbox" element={<SimulatorPage />} />
      </Routes>
    </BrowserRouter>
  );
}