// app/public/page.js
"use client";

import { useEffect, useState, useRef } from "react";
import { getProvider, getContract } from "../lib/eth";

/**
 * Public Dashboard with pop-up burst on new KWALA achievement.
 * - Polls /api/kwala for events
 * - Shows popup + confetti when a new LevelUpdated arrives
 */

function AchievementPopup({ data, onClose }) {
  // data: { donor, newLevel, totalDonations, timestamp }
  // We'll create a small confetti burst using DOM elements (no dependencies)
  useEffect(() => {
    if (!data) return;

    // confetti generator
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = 0;
    root.style.top = 0;
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.pointerEvents = "none";
    root.style.zIndex = 9999;
    document.body.appendChild(root);

    const colors = ["#ff4655","#ffd36b","#8b5cf6","#5bd1ff","#60d29c"];
    const particleCount = 28;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.textContent = "★";
      p.style.position = "absolute";
      p.style.left = "50%";
      p.style.top = "40%";
      p.style.transform = `translate(-50%, -50%) rotate(${Math.random()*360}deg)`;
      p.style.fontSize = `${10 + Math.floor(Math.random()*18)}px`;
      p.style.opacity = "1";
      p.style.color = colors[Math.floor(Math.random()*colors.length)];
      p.style.transition = "transform 900ms cubic-bezier(.2,.8,.2,1), opacity 900ms linear";
      root.appendChild(p);

      // random direction
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 260;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;

      // delay stagger
      const delay = Math.random()*120;
      setTimeout(() => {
        p.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random()*360}deg) scale(${0.9 + Math.random()*0.8})`;
        p.style.opacity = "0";
      }, delay);
    }

    // auto remove after animation
    const cleanup = setTimeout(() => {
      if (root && root.parentNode) root.parentNode.removeChild(root);
    }, 1200);

    return () => {
      clearTimeout(cleanup);
      if (root && root.parentNode) root.parentNode.removeChild(root);
    };
  }, [data]);

  if (!data) return null;

  // formatted donor short
  const donorShort = (data.donor || "").slice(0,6) + "..." + (data.donor || "").slice(-4);

  return (
    <div style={{
      position: "fixed",
      right: 24,
      top: 24,
      zIndex: 10000,
      minWidth: 300,
      maxWidth: "calc(100% - 48px)",
      background: "linear-gradient(180deg,#0f0f0f,#141414)",
      border: "1px solid rgba(255,255,255,0.04)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
      padding: "16px 18px",
      borderRadius: 12,
      color: "#fff",
      backdropFilter: "blur(6px)",
      display: "flex",
      gap: 12,
      alignItems: "center"
    }}>
      <div style={{ fontSize: 28 }}>🏅</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Level Up!</div>
        <div style={{ color: "#ddd", fontSize: 13, marginTop: 6 }}>
          <b>{donorShort}</b> reached <b>Level {data.newLevel}</b>
        </div>
        <div style={{ color: "#999", fontSize: 12, marginTop: 6 }}>
          Total donations: {data.totalDonations}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={onClose} style={{
          background: "transparent",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 8,
        }}>Dismiss</button>
      </div>
    </div>
  );
}

export default function PublicDashboard() {
  const [donors, setDonors] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [latestSeen, setLatestSeen] = useState(0); // timestamp of last seen event
  const [popupData, setPopupData] = useState(null);

  // fetch achievements (and show popup on new)
  async function fetchAchievementsAndNotify() {
    try {
      const res = await fetch("/api/kwala");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok) return;

      // normalize event bodies (safety)
      const events = (json.events || []).map(e => ({
        timestamp: e.timestamp || Date.now(),
        body: e.body || e
      }));

      // sort newest first (just in case)
      events.sort((a,b) => b.timestamp - a.timestamp);

      setAchievements(events);

      // check newest event
      if (events.length > 0) {
        const newest = events[0];
        const ts = Number(newest.timestamp || 0);
        if (ts > (latestSeen || 0)) {
          // new event arrived — pop it
          const body = newest.body || {};
          // normalize donor if object (defensive)
          let donor = body.donor;
          if (donor && typeof donor === "object") {
            const keys = Object.keys(donor);
            donor = keys[0] || "";
          }
          const payload = {
            donor,
            newLevel: Number(body.newLevel || 0),
            totalDonations: Number(body.totalDonations || 0),
            timestamp: ts
          };
          setPopupData(payload);
          setLatestSeen(ts);
          // auto clear popup after 6s
          setTimeout(() => setPopupData(null), 6000);
        }
      }
    } catch (err) {
      console.error("fetchAchievements error", err);
    }
  }

  // Top donors fetch (on-chain) - simple, non-blocking method
  async function fetchTopDonors() {
    try {
      const provider = getProvider();
      const contract = getContract(provider);
      const totalBN = await contract.requestCount();
      const total = Number(totalBN || 0);
      if (total === 0) return setDonors([]);

      // gather addresses from all requests (same approach as earlier)
      const allInterested = [];
      for (let i = 1; i <= total; i++) {
        try {
          const list = await contract.getInterested(i);
          if (Array.isArray(list)) list.forEach(a => allInterested.push((a || "").toLowerCase()));
        } catch (e) {
          // ignore individual failures
        }
      }
      const unique = Array.from(new Set(allInterested));
      const profiles = [];
      for (const addr of unique) {
        try {
          const p = await contract.getDonorProfile(addr);
          profiles.push({ address: addr, donationsCount: Number(p.donationsCount || 0), level: Number(p.level || 0) });
        } catch (e) {}
      }
      profiles.sort((a,b) => b.level - a.level || b.donationsCount - a.donationsCount);
      setDonors(profiles);
    } catch (err) {
      console.error("fetchTopDonors error", err);
    }
  }

  useEffect(() => {
    // initial load
    fetchTopDonors();
    fetchAchievementsAndNotify();

    // intervals
    const achInt = setInterval(fetchAchievementsAndNotify, 5000); // poll KWALA every 5s
    const donorsInt = setInterval(fetchTopDonors, 20000); // donors every 20s
    return () => {
      clearInterval(achInt);
      clearInterval(donorsInt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestSeen]);

  return (
    <main style={{ background: "#0b0b0b", color: "#fff", minHeight: "100vh", padding: 24 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#ff4655" }}>🏆 Blood Donor Leaderboard</h1>
        <p style={{ color: "#aaa" }}>Top donors (on-chain) + live achievements (KWALA)</p>
      </header>

      <section style={{ marginBottom: 24, background: "#141414", padding: 16, borderRadius: 12 }}>
        <h2>Top Donors</h2>
        {donors.length === 0 ? <p>No donors yet</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr style={{ background: "#1b1b1b" }}>
                <th style={{ padding:8, textAlign: "left", color: "#aaa" }}>Rank</th>
                <th style={{ padding:8, textAlign: "left", color: "#aaa" }}>Address</th>
                <th style={{ padding:8, textAlign: "left", color: "#aaa" }}>Level</th>
                <th style={{ padding:8, textAlign: "left", color: "#aaa" }}>Donations</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((d, i) => (
                <tr key={d.address} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding:8 }}>{i+1}</td>
                  <td style={{ padding:8 }}>{d.address.slice(0,6)}...{d.address.slice(-4)}</td>
                  <td style={{ padding:8 }}>{'⭐'.repeat(Math.max(0, d.level))}</td>
                  <td style={{ padding:8 }}>{d.donationsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ background: "#141414", padding: 16, borderRadius: 12 }}>
        <h2>🏅 Live Achievements</h2>
        {achievements.length === 0 ? <p style={{ color:"#888" }}>No achievements yet</p> : achievements.slice(0,20).map((a, i) => {
          const b = a.body || a;
          const donor = (b.donor && typeof b.donor === "object") ? Object.keys(b.donor)[0] : b.donor;
          return (
            <div key={i} style={{ background:"#1a1a1a", padding:12, borderRadius:8, marginBottom:10, borderLeft: "4px solid #ff4655" }}>
              <div style={{ fontWeight:700 }}>🎖️ { (donor||"").slice(0,6) }...{ (donor||"").slice(-4) } reached Level {b.newLevel}</div>
              <div style={{ color:"#888", fontSize:12 }}>{new Date(a.timestamp).toLocaleString()}</div>
            </div>
          );
        })}
      </section>

      {/* Popup */}
      {popupData && <AchievementPopup data={popupData} onClose={() => setPopupData(null)} />}
    </main>
  );
}
