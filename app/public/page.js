// app/public/page.js
"use client";

import { useEffect, useState } from "react";
import { getProvider, getContract } from "../lib/eth";

/* ==============================================================
   🏅 Achievement Popup (with confetti burst)
   ============================================================== */
function AchievementPopup({ data, onClose }) {
  useEffect(() => {
    if (!data) return;

    // Confetti burst
    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "fixed",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 9999,
    });
    document.body.appendChild(root);

    const colors = ["#ff4655", "#ffd36b", "#8b5cf6", "#5bd1ff", "#60d29c"];
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.textContent = "★";
      Object.assign(p.style, {
        position: "absolute",
        left: "50%",
        top: "45%",
        transform: `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`,
        fontSize: `${10 + Math.floor(Math.random() * 22)}px`,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: "1",
        transition: "transform 1s cubic-bezier(.2,.8,.2,1), opacity 1s linear",
      });
      root.appendChild(p);

      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 280;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;
      const delay = Math.random() * 100;

      setTimeout(() => {
        p.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 720}deg) scale(${1 + Math.random()})`;
        p.style.opacity = "0";
      }, delay);
    }

    const cleanup = setTimeout(() => {
      if (root && root.parentNode) root.remove();
    }, 1200);

    return () => {
      clearTimeout(cleanup);
      if (root && root.parentNode) root.remove();
    };
  }, [data]);

  if (!data) return null;
  const donorShort = (data.donor || "").slice(0, 6) + "..." + (data.donor || "").slice(-4);

  return (
    <div style={S.popup}>
      <div style={S.popupIcon}>🏆</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#FFD36B" }}>LEVEL UP!</div>
        <div style={{ color: "#eee", marginTop: 4 }}>
          <b>{donorShort}</b> reached <b>Level {data.newLevel}</b>
        </div>
        <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
          Total donations: {data.totalDonations}
        </div>
      </div>
      <button style={S.dismissBtn} onClick={onClose}>✖</button>
    </div>
  );
}

/* ==============================================================
   🩸 Public Dashboard (Leaderboard + Live Feed)
   ============================================================== */
export default function PublicDashboard() {
  const [donors, setDonors] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [latestSeen, setLatestSeen] = useState(0);
  const [popupData, setPopupData] = useState(null);

  async function fetchAchievementsAndNotify() {
    try {
      const res = await fetch("/api/kwala");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok) return;

      const events = (json.events || []).map(e => ({
        timestamp: e.timestamp || Date.now(),
        body: e.body || e
      })).sort((a, b) => b.timestamp - a.timestamp);

      setAchievements(events);

      if (events.length > 0) {
        const newest = events[0];
        const ts = Number(newest.timestamp || 0);
        if (ts > (latestSeen || 0)) {
          const b = newest.body || {};
          let donor = b.donor;
          if (typeof donor === "object") donor = Object.keys(donor)[0];
          const payload = {
            donor,
            newLevel: Number(b.newLevel || 0),
            totalDonations: Number(b.totalDonations || 0),
            timestamp: ts
          };
          setPopupData(payload);
          setLatestSeen(ts);
          setTimeout(() => setPopupData(null), 6000);
        }
      }
    } catch (err) {
      console.error("fetchAchievements error", err);
    }
  }

  async function fetchTopDonors() {
    try {
      const provider = getProvider();
      const contract = getContract(provider);
      const totalBN = await contract.requestCount();
      const total = Number(totalBN || 0);
      if (total === 0) return setDonors([]);

      const allInterested = [];
      for (let i = 1; i <= total; i++) {
        try {
          const list = await contract.getInterested(i);
          if (Array.isArray(list)) list.forEach(a => allInterested.push(a.toLowerCase()));
        } catch {}
      }
      const unique = Array.from(new Set(allInterested));
      const profiles = [];
      for (const addr of unique) {
        try {
          const p = await contract.getDonorProfile(addr);
          profiles.push({
            address: addr,
            donationsCount: Number(p.donationsCount || 0),
            level: Number(p.level || 0)
          });
        } catch {}
      }
      profiles.sort((a, b) => b.level - a.level || b.donationsCount - a.donationsCount);
      setDonors(profiles);
    } catch (err) {
      console.error("fetchTopDonors error", err);
    }
  }

  useEffect(() => {
    fetchTopDonors();
    fetchAchievementsAndNotify();
    const ach = setInterval(fetchAchievementsAndNotify, 5000);
    const don = setInterval(fetchTopDonors, 20000);
    return () => { clearInterval(ach); clearInterval(don); };
  }, [latestSeen]);

  return (
    <main style={S.main}>
      {/* Header */}
      <header style={S.header}>
        <div>
          <h1 style={S.title}>🏆 BLOODVERSE LEADERBOARD</h1>
          <div style={S.subtitle}>Live blockchain-powered donor rankings</div>
        </div>
      </header>

      {/* Leaderboard */}
      <section style={S.card}>
        <h2 style={S.sectionTitle}>🔥 Top Donors</h2>
        {donors.length === 0 ? (
          <p style={{ color: "#888" }}>No donors yet</p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {donors.slice(0, 10).map((d, i) => (
              <div key={d.address} style={{
                ...S.rankCard,
                borderLeft: `4px solid ${i === 0 ? "#FFD36B" : i === 1 ? "#5bd1ff" : "#8b5cf6"}`,
                background: i === 0 ? "linear-gradient(90deg,#181818,#251b0a)" : "#111",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={S.rankBadge}>#{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.address.slice(0, 6)}...{d.address.slice(-4)}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      Level {d.level} • {d.donationsCount} donations
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 18, color: "#FFD36B" }}>{"★".repeat(d.level)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Achievements Feed */}
      <section style={{ ...S.card, marginTop: 20 }}>
        <h2 style={S.sectionTitle}>🏅 Live Achievements</h2>
        {achievements.length === 0 ? (
          <p style={{ color: "#777" }}>No recent achievements</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {achievements.slice(0, 15).map((a, i) => {
              const b = a.body || a;
              const donor = typeof b.donor === "object" ? Object.keys(b.donor)[0] : b.donor;
              return (
                <div key={i} style={S.achievementCard}>
                  <div style={{ fontWeight: 700, color: "#FFD36B" }}>
                    🎖️ {donor?.slice(0, 6)}...{donor?.slice(-4)} reached Level {b.newLevel}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    {new Date(a.timestamp).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {popupData && <AchievementPopup data={popupData} onClose={() => setPopupData(null)} />}
    </main>
  );
}

/* ==============================================================
   🎨 Gamified Styling
   ============================================================== */
const S = {
  main: {
    background: "radial-gradient(circle at top, #070707 30%, #000 100%)",
    color: "#fff",
    minHeight: "100vh",
    fontFamily: "Poppins, Orbitron, sans-serif",
    padding: 24,
  },
  header: {
    marginBottom: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "1.8rem",
    background: "linear-gradient(90deg,#ff4655,#ff9f1a)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 900,
    letterSpacing: "1px",
  },
  subtitle: {
    color: "#888",
    marginTop: 4,
  },
  card: {
    background: "linear-gradient(180deg,#111,#171717)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.04)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#FFD36B",
    marginBottom: 10,
  },
  rankCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#111",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.04)",
  },
  rankBadge: {
    background: "#ff4655",
    color: "#fff",
    fontWeight: 800,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
  },
  achievementCard: {
    background: "#1a1a1a",
    padding: 10,
    borderRadius: 8,
    borderLeft: "3px solid #ff4655",
  },
  popup: {
    position: "fixed",
    right: 24,
    top: 24,
    zIndex: 10000,
    background: "linear-gradient(180deg,#131313,#1a1a1a)",
    border: "1px solid rgba(255,255,255,0.04)",
    boxShadow: "0 8px 30px rgba(255,70,85,0.1)",
    padding: "14px 18px",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 320,
    backdropFilter: "blur(8px)",
    animation: "slideIn 0.4s ease",
  },
  popupIcon: { fontSize: 30 },
  dismissBtn: {
    background: "transparent",
    color: "#999",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
  },
};
