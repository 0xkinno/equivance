"use client";

import React, { useState } from "react";
import { Navbar } from "../components/Navbar";
import { HeroSection } from "../components/HeroSection";
import { LivePositionConsole } from "../components/LivePositionConsole";
import { TransitionInspector } from "../components/TransitionInspector";
import { AttackLab } from "../components/AttackLab";
import { BenchmarkBaseline } from "../components/BenchmarkBaseline";
import { OfflineVerifier } from "../components/OfflineVerifier";
import { SponsorIntegration } from "../components/SponsorIntegration";
import { Footer } from "../components/Footer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("landing");

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBF9]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === "landing" && (
          <div>
            <HeroSection onNavigate={(tab) => setActiveTab(tab)} />
            <LivePositionConsole />
          </div>
        )}

        {activeTab === "console" && <LivePositionConsole />}
        {activeTab === "transition" && <TransitionInspector />}
        {activeTab === "attacks" && <AttackLab />}
        {activeTab === "benchmark" && <BenchmarkBaseline />}
        {activeTab === "verifier" && <OfflineVerifier />}
        {activeTab === "sponsor" && <SponsorIntegration />}
      </main>

      <Footer />
    </div>
  );
}
