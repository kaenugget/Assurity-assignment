import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { LandingPage } from "@/pages/landing-page";

const DashboardPage = lazy(async () => {
  const module = await import("@/pages/dashboard-page");
  return { default: module.DashboardPage };
});

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f2eb]" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/services/:serviceKey" element={<DashboardPage />} />
      </Routes>
    </Suspense>
  );
}
