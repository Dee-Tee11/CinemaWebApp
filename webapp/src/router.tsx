import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./home";
<<<<<<< HEAD
import Onboarding from "./components/MovieOnboarding/MovieOnboardingFinal";
=======
import Onboarding from "./components/MovieOnboarding/MovieOnboardingNewVersion"; // Novo componente

>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Onboarding" element={<Onboarding />} />
          <Route path="/friends" element={<Home />} />
<<<<<<< HEAD
          <Route path="/mymovies" element={<Home />} />
=======
        <Route path="/mymovies" element={<Home />} />
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
          <Route path="/explore" element={<Home />} />
          <Route path="/foryou" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}