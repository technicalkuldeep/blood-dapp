// app/donor/page.js
"use client";

import { useEffect, useState } from "react";
import {
  getProvider,
  getContract,
  getSigner,
  getConnectedAddress,
  getDonorProfile,
} from "../lib/eth";

export default function DonorDashboard() {
  const [requests, setRequests] = useState([]);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showToast, setShowToast] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const [popupData, setPopupData] = useState(null);

  async function connect() {
    try {
      const addr = await getConnectedAddress();
      setAddress(addr);
      if (addr) fetchProfile(addr);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchProfile(addr) {
    try {
      const p = await getDonorProfile(addr);
      setProfile({ address: addr, ...p });
    } catch (err) {
      console.error("profile error", err);
    }
  }

  async function fetchRequests() {
    try {
      const provider = getProvider();
      const contract = getContract(provider);
      const total = await contract.requestCount();
      const list = [];
      for (let i = 1; i <= Number(total); i++) {
        const r = await contract.getRequest(i);
        const status = ["Open", "Partially Fulfilled", "Fulfilled", "Cancelled"][Number(r.status)];
        if (status === "Open" || status === "Partially Fulfilled") {
          list.push({
            id: Number(r.id),
            bloodGroup: r.bloodGroup,
            location: r.location,
            quantity: Number(r.quantity),
            fulfilled: Number(r.fulfilledCount),
            contact: r.contact,
            requester: r.requester,
            status,
          });
        }
      }
      setRequests(list.reverse());
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  useEffect(() => {
    connect();
    fetchRequests();
    const t = setInterval(fetchRequests, 20000);
    return () => clearInterval(t);
  }, []);

  async function expressInterest(id) {
    try {
      const unitsStr = prompt("How many units will you donate?", "1");
      if (!unitsStr) return;
      const units = Number(unitsStr);
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.expressInterest(id, units);
      await tx.wait();
      setShowToast({ title: "Interest recorded", message: "Wait for admin approval", tone: "success" });
      setTimeout(() => setShowToast(null), 5000);
    } catch (err) {
      setShowToast({ title: "Error", message: (err.message || err).toString(), tone: "error" });
      setTimeout(() => setShowToast(null), 6000);
    }
  }

  // Poll /api/donor-events (history) every ~4.5s
  useEffect(() => {
    let mounted = true;
    async function pollEvents() {
      try {
        const res = await fetch("/api/donor-events");
        if (!res.ok) return;
        const json = await res.json();
        if (!json.ok) return;
        const events = Array.isArray(json.events) ? json.events : [];
        if (!mounted) return;
        setLiveEvents(events.slice(0, 20));

        if (address && events.length > 0) {
          const newest = events[0];
          if (newest.donor && newest.donor.toLowerCase() === address.toLowerCase()) {
            setPopupData(newest);
            setTimeout(() => setPopupData(null), 6000);
            // refresh profile because donations might have changed
            fetchProfile(address);
          }
        }
      } catch (err) {
        console.error("poll events error", err);
      }
    }

    pollEvents();
    const iv = setInterval(pollEvents, 4500);
    return () => { mounted = false; clearInterval(iv); };
  }, [address]);

  function renderStarsForLevel(levelNumber) {
    if (!profile) return null;
    const donations = profile.donationsCount;
    const donationsBefore = (levelNumber - 1) * 4;
    const inThisLevel = Math.max(0, Math.min(4, donations - donationsBefore));
    const filled = inThisLevel;
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} style={{
            width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            background: idx < filled ? "linear-gradient(45deg,#FFD36B,#FFAA00)" : "#111314",
            color: idx < filled ? "#111" : "#666",
            border: idx < filled ? "1px solid rgba(230,184,0,0.9)" : "1px solid #222",
            boxShadow: idx < filled ? "0 6px 18px rgba(255,200,80,0.12)" : "none",
            transform: idx < filled ? "translateY(-1px) scale(1.02)" : "none",
            transition: "all 240ms ease"
          }}>★</div>
        ))}
      </div>
    );
  }

  function xpForLevel(levelNumber) {
    if (!profile) return 0;
    const donations = profile.donationsCount;
    const donationsBefore = (levelNumber - 1) * 4;
    const inThisLevel = Math.max(0, Math.min(4, donations - donationsBefore));
    return Math.round((inThisLevel / 4) * 100);
  }

  return (
    <main style={G.styles.main}>
      {/* HUD Header */}
      <header style={G.styles.header}>
        <div>
          <h1 style={G.styles.title}>🩸 BloodVerse — Donor HUD</h1>
          <div style={G.styles.subtitle}>Earn levels, collect stars, save lives.</div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {address ? (
            <div style={G.styles.addrBox}>
              <div style={{ fontSize: 12, color: "#aaa" }}>Connected</div>
              <div style={G.styles.addrText}>{address.slice(0, 6)}…{address.slice(-4)}</div>
            </div>
          ) : (
            <button onClick={connect} style={G.styles.ctaBtn}>⚡ Connect Wallet</button>
          )}
        </div>
      </header>

      <div style={G.styles.grid}>
        {/* Left Column */}
        <aside style={G.styles.left}>
          {/* Profile card */}
          <div style={G.styles.card}>
            <div style={G.styles.profileHeader}>
              <div style={G.styles.avatar}>🩸</div>
              <div>
                <div style={G.styles.profileName}>{profile ? shorten(profile.address) : "Guest Donor"}</div>
                <div style={{ color: "#999", fontSize: 13 }}>{profile ? `${profile.donationsCount} donations` : "Connect to view"}</div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#ccc", fontWeight: 700 }}>Level</div>
                <div style={{ color: "#FFD36B", fontWeight: 800 }}>{profile ? profile.level : 0}</div>
              </div>

              {/* XP Progress */}
              <div style={{ marginTop: 10 }}>
                {Array.from({ length: 4 }).map((_, lv) => {
                  const levelNum = lv + 1;
                  return (
                    <div key={lv} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ color: "#aaa" }}>Level {levelNum}</div>
                        <div style={{ color: "#999", fontSize: 12 }}>{xpForLevel(levelNum)}%</div>
                      </div>
                      <div style={G.styles.progressTrack}>
                        <div
                          style={{
                            ...G.styles.progressFill,
                            width: `${xpForLevel(levelNum)}%`,
                            boxShadow: `0 6px 20px rgba(255,100,120, ${xpForLevel(levelNum) / 200})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ color: "#aaa", marginBottom: 8 }}>Stars in current level</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {profile ? renderStarsForLevel(profile.level) : <div style={{ color: "#777" }}>—</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div style={{ marginTop: 18, ...G.styles.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>🏅 Achievements</div>
              <div style={{ color: "#999", fontSize: 12 }}>{profile ? `${profile.donationsCount} total` : "—"}</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Badge label="First Donation" unlocked={profile && profile.donationsCount >= 1} />
              <Badge label="Level 2" unlocked={profile && profile.level >= 2} />
              <Badge label="4 Donations" unlocked={profile && profile.donationsCount >= 4} />
              <Badge label="Level 4" unlocked={profile && profile.level >= 4} />
            </div>
          </div>

          {/* ⚡ Live Approvals Feed */}
          <div style={{ marginTop: 18, ...G.styles.card }}>
            <h3>⚡ Live Approvals Feed</h3>
            {liveEvents.length === 0 ? (
              <div style={{ color: "#777" }}>No recent approvals yet</div>
            ) : (
              liveEvents.map((e, i) => (
                <div key={i} style={{ background: "#1b1b1b", padding: 10, borderRadius: 8, marginTop: 8 }}>
                  <div style={{ color: "#FFD36B" }}>✅ Donation Approved</div>
                  <div style={{ fontSize: 13, color: "#ccc", marginTop: 4 }}>
                    Request ID: {e.id} | Donor: {shorten(e.donor)}<br />
                    Units: {e.unitsApproved} | NFT: #{e.nftId}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Column: Requests */}
        <section style={G.styles.right}>
          <div style={G.styles.card}>
            <h2 style={{ color: "#FFD36B" }}>Active Requests</h2>
            {loading ? (
              <p>Loading…</p>
            ) : requests.length === 0 ? (
              <p>No open requests</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {requests.map((r) => (
                  <div key={r.id} style={G.styles.requestCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={G.styles.reqBadge}>{r.bloodGroup}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.location}</div>
                          <div style={{ color: "#999", fontSize: 12 }}>Req #{r.id} • Contact: {r.contact}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: r.status === "Open" ? "#FFD36B" : "#2ecc71" }}>{r.status}</div>
                        <div style={{ color: "#aaa", marginTop: 6 }}>{r.quantity} units</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
                      <button style={G.styles.ghostBtnSmall} onClick={() => alert(`Contact: ${r.contact}`)}>📞 Contact</button>
                      <button style={G.styles.primaryBtn} onClick={() => expressInterest(r.id)}>❤️ I'm Interested</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Celebration popup when user's donation approved */}
      {popupData && (
        <div style={{
          position: "fixed", right: 20, top: 20,
          background: "linear-gradient(180deg,#111,#141414)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "14px 18px",
          borderRadius: 12, zIndex: 9999, color: "#fff", boxShadow: "0 0 30px rgba(255,70,85,0.2)"
        }}>
          <div style={{ fontSize: 24 }}>🏅</div>
          <div><b>Congratulations!</b> Your donation was approved 🎉</div>
          <div style={{ color: "#aaa", fontSize: 12, marginTop: 6 }}>
            NFT ID: #{popupData.nftId} | Units: {popupData.unitsApproved}
          </div>
        </div>
      )}

      {showToast && (
        <div style={{
          position: "fixed", right: 20, bottom: 20,
          background: showToast.tone === "error" ? "#3b1a1a" : "#0d1710",
          color: "#fff", padding: "12px 16px", borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.04)"
        }}>
          <div style={{ fontWeight: 700 }}>{showToast.title}</div>
          <div style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>{showToast.message}</div>
        </div>
      )}
    </main>
  );
}

/* ===== Small Badge component ===== */
function Badge({ label, unlocked }) {
  return (
    <div style={{
      background: unlocked ? "linear-gradient(180deg,#161616,#1c0f2a)" : "#0f0f0f",
      border: unlocked ? "1px solid rgba(255,200,80,0.12)" : "1px solid rgba(255,255,255,0.03)",
      padding: 12,
      borderRadius: 10,
      display: "flex",
      gap: 12,
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: unlocked ? "0 8px 30px rgba(255,160,80,0.06)" : "none"
    }}>
      <div>
        <div style={{ fontWeight: 800 }}>{label}</div>
        <div style={{ color: "#888", fontSize: 12 }}>{unlocked ? "Unlocked" : "Locked"}</div>
      </div>
      <div style={{ fontSize: 20 }}>
        {unlocked ? "🏆" : "🔒"}
      </div>
    </div>
  );
}

function shorten(a = "") {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

const G = {
  styles: {
    main: { background: "radial-gradient(circle at top, #070707 30%, #000 100%)", color: "#e9e9e9", minHeight: "100vh", fontFamily: "Poppins, Inter, sans-serif", padding: 24 },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
    title: { fontSize: 22, fontWeight: 800, background: "linear-gradient(90deg,#ff4655,#ff9f1a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    subtitle: { color: "#9a9a9a", marginTop: 6 },
    addrBox: { background: "#111", border: "1px solid rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 10, textAlign: "right" },
    addrText: { color: "#fff", fontWeight: 700 },
    grid: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "start" },
    card: { background: "linear-gradient(180deg,#0f0f10,#18181a)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.03)", boxShadow: "0 6px 30px rgba(0,0,0,0.6)" },
    profileHeader: { display: "flex", gap: 12, alignItems: "center" },
    avatar: { width: 64, height: 64, borderRadius: 14, background: "linear-gradient(90deg,#1b1b1b,#2a0f2f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 },
    profileName: { fontWeight: 800, fontSize: 16 },
    primaryBtn: { background: "linear-gradient(90deg,#ff4655,#ff9f1a)", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
    ghostBtnSmall: { background: "transparent", border: "1px solid rgba(255,255,255,0.04)", color: "#ddd", padding: "8px 10px", borderRadius: 8, cursor: "pointer" },
    reqBadge: { background: "linear-gradient(90deg,#1b1b1b,#2a0f2f)", padding: "6px 10px", borderRadius: 8, color: "#ff4655", fontWeight: 800 },
    progressTrack: { height: 10, background: "#0e0e0e", borderRadius: 999, border: "1px solid rgba(255,255,255,0.02)", overflow: "hidden" },
    progressFill: { height: "100%", background: "linear-gradient(90deg,#ff4655,#ffd36b)", transition: "width 600ms cubic-bezier(.2,.9,.2,1)" },
    ctaBtn: { background: "linear-gradient(90deg,#ff4655,#ff9f1a)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700 }
  },
};
