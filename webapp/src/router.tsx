import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./home";
import Onboarding from "./components/MovieOnboarding/MovieOnboardingFinal";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Onboarding" element={<Onboarding />} />
          <Route path="/friends" element={<Home />} />
          <Route path="/mymovies" element={<Home />} />
          <Route path="/explore" element={<Home />} />
          <Route path="/foryou" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}