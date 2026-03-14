import { Route, Routes } from "react-router-dom";

import { DashboardPage } from "@/pages/dashboard-page";
import { LandingPage } from "@/pages/landing-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/services/:serviceKey" element={<DashboardPage />} />
      <Route path="/services/:serviceKey" element={<DashboardPage />} />
    </Routes>
  );
}
