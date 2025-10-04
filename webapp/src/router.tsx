import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./home";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
