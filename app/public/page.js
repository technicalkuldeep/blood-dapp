// app/public/page.js
"use client";

import { useEffect, useState } from "react";
import { getProvider, getContract } from "../lib/eth";

export default function PublicDashboard() {
  const [donors, setDonors] = useState([]);
  const [achievements, setAchievements] = useState([]);

  // --- Fetch live achievements from our API (powered by Kwala)
  async function fetchAchievements() {
    try {
      const res = await fetch("/api/kwala");
      const data = await res.json();
      if (data.ok) {
        const levelEvents = data.events.filter(
          (e) => e.body.event === "LevelUpdated"
        );
        setAchievements(levelEvents);
      }
    } catch (err) {
      console.error("fetchAchievements error:", err);
    }
  }

  // --- Fetch all donors by scanning achievements
  async function fetchDonors() {
    try {
      const provider = getProvider();
      const contract = getContract(provider);

      const res = await fetch("/api/kwala");
      const data = await res.json();
      const donorsList = [
        ...new Set(
          data.events
            .filter((e) => e.body.event === "LevelUpdated")
            .map((e) => e.body.donor)
        ),
      ];

      const profiles = [];
      for (const donor of donorsList) {
        const p = await contract.getDonorProfile(donor);
        profiles.push({
          address: donor,
          donationsCount: Number(p.donationsCount),
          level: Number(p.level),
        });
      }

      // Sort top to bottom (Level > Donations)
      profiles.sort((a, b) => b.level - a.level || b.donationsCount - a.donationsCount);
      setDonors(profiles);
    } catch (err) {
      console.error("fetchDonors error:", err);
    }
  }

  useEffect(() => {
    fetchAchievements();
    fetchDonors();
    const interval = setInterval(() => {
      fetchAchievements();
      fetchDonors();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main
      style={{
        background: "#0b0b0b",
        color: "#fff",
        minHeight: "100vh",
        padding: 24,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <header style={{ marginBottom: 30 }}>
        <h1 style={{ color: "#ff4655", marginBottom: 6 }}>🏆 Blood Donor Leaderboard</h1>
        <p style={{ color: "#888" }}>Live updates via KWALA Webhooks</p>
      </header>

      {/* ---------- Leaderboard Section ---------- */}
      <section
        style={{
          background: "#141414",
          borderRadius: 12,
          padding: 16,
          border: "1px solid #222",
          marginBottom: 30,
        }}
      >
        <h2>Top Donors</h2>
        {donors.length === 0 ? (
          <p>No donors yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr style={{ background: "#1b1b1b" }}>
                <th style={th}>Rank</th>
                <th style={th}>Address</th>
                <th style={th}>Level</th>
                <th style={th}>Donations</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((d, i) => (
                <tr key={d.address} style={{ borderBottom: "1px solid #222" }}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{d.address.slice(0, 6)}...{d.address.slice(-4)}</td>
                  <td style={td}>{"⭐".repeat(d.level)}</td>
                  <td style={td}>{d.donationsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---------- Achievements Section ---------- */}
      <section
        style={{
          background: "#141414",
          borderRadius: 12,
          padding: 16,
          border: "1px solid #222",
        }}
      >
        <h2>🏅 Live Achievements Feed</h2>
        {achievements.length === 0 ? (
          <p style={{ color: "#888" }}>No achievements yet.</p>
        ) : (
          achievements.map((a, i) => (
            <div
              key={i}
              style={{
                background: "#1a1a1a",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
                borderLeft: "4px solid #ff4655",
              }}
            >
              <p style={{ margin: 0 }}>
                🎖️ Donor <b>{a.body.donor.slice(0, 6)}...{a.body.donor.slice(-4)}</b> reached{" "}
                <b>Level {a.body.newLevel}</b> ({a.body.totalDonations} total donations)
              </p>
              <div style={{ fontSize: 12, color: "#888" }}>
                {new Date(a.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

const th = { padding: 8, textAlign: "left", color: "#aaa" };
const td = { padding: 8 };
