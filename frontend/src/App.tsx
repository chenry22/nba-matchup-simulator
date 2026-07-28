import { Routes, Route, HashRouter } from "react-router-dom";
import SimulatorPage from "./pages/SimulatorPage";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/sandbox" element={<SimulatorPage />} />
      </Routes>
    </HashRouter>
  );
}