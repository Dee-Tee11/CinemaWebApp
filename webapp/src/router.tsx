import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Home from "./home";
import Onboarding from './components/MovieOnboarding/MovieOnboardingNewVersion';

function RouterContent({ shouldRedirectToOnboarding }: { shouldRedirectToOnboarding: boolean }) {
  const navigate = useNavigate();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Se deve redirecionar, não está já no onboarding, e ainda não redirecionou
    if (shouldRedirectToOnboarding && window.location.pathname !== '/onboarding' && !hasRedirected) {
      navigate('/onboarding', { replace: true });
      setHasRedirected(true);
    }
  }, [shouldRedirectToOnboarding, navigate, hasRedirected]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/friends" element={<Home />} />
      <Route path="/explore" element={<Home />} />
      <Route path="/foryou" element={<Home />} />
    </Routes>
  );
}

export default function AppRouter({ shouldRedirectToOnboarding }: { shouldRedirectToOnboarding: boolean }) {
  return (
    <BrowserRouter>
      <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
        <RouterContent shouldRedirectToOnboarding={shouldRedirectToOnboarding} />
      </div>
    </BrowserRouter>
  );
}