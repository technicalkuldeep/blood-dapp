"use client";

import { useEffect, useState } from "react";
import {
  getProvider,
  getContract,
  getSigner,
  getConnectedAddress,
  getDonorProfile,
  getInterested,
  isAdminAddress,
  CONFIG
} from "./lib/eth";

export default function Home() {
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInterestedFor, setShowInterestedFor] = useState(null);
  const [interestedList, setInterestedList] = useState([]);
  const [selectedDonorProfile, setSelectedDonorProfile] = useState(null);

  async function connectWallet() {
    try {
      const addr = await getConnectedAddress();
      setConnected(addr);
      setIsAdmin(isAdminAddress(addr));
    } catch (err) {
      console.error("connect error", err);
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
        list.push({
          id: Number(r.id),
          bloodGroup: r.bloodGroup,
          location: r.location,
          quantity: Number(r.quantity),
          fulfilled: Number(r.fulfilledCount),
          contact: r.contact,
          status: ["Open", "Partially Fulfilled", "Fulfilled", "Cancelled"][Number(r.status)],
          requester: r.requester,
          createdAt: new Date(Number(r.createdAt) * 1000).toLocaleString(),
        });
      }
      setRequests(list.reverse());
      setLoading(false);
    } catch (err) {
      console.error("fetchRequests", err);
      setLoading(false);
    }
  }

  async function fetchEvents() {
    try {
      const res = await fetch("/api/events");
      const json = await res.json();
      if (json.ok) setEvents(json.events);
    } catch (err) {
      console.error("fetchEvents", err);
    }
  }

  useEffect(() => {
    connectWallet();
    fetchRequests();
    fetchEvents();
    const t = setInterval(fetchEvents, 4000);
    return () => clearInterval(t);
  }, []);

  async function createRequest(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.createRequest(
        form.get("bloodGroup"),
        form.get("location"),
        Number(form.get("quantity")),
        form.get("contact")
      );
      await tx.wait();
      alert("✅ Request created successfully!");
      fetchRequests();
    } catch (err) {
      alert("❌ Error: " + (err.message || err));
    }
  }

  async function openInterested(requestId) {
    setShowInterestedFor(requestId);
    try {
      const list = await getInterested(requestId);
      setInterestedList(list);
    } catch (err) {
      console.error("getInterested err", err);
      setInterestedList([]);
    }
  }

  async function approveDonor(reqId, donorAddr) {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.approveInterest(reqId, donorAddr);
      await tx.wait();
      alert("✅ Approved — NFT minted for donor.");
      fetchRequests();
    } catch (err) {
      alert("Approve error: " + (err.message || err));
    }
  }

  async function viewDonorProfile(addr) {
    try {
      const p = await getDonorProfile(addr);
      setSelectedDonorProfile({ address: addr, ...p });
    } catch (err) {
      console.error("viewDonorProfile", err);
      alert("Could not load donor profile");
    }
  }

  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🩸 KWALA BLOODVERSE</h1>
          <p style={styles.subtitle}>Gamified Blood Donation Platform</p>
          <div style={styles.adminLine}>
            <span>Admin Wallet: </span>
            <b>{CONFIG.ADMIN}</b>
          </div>
        </div>

        <div>
          {connected ? (
            <div style={styles.walletBox}>
              <div
                style={{
                  color: isAdmin ? "#FFD36B" : "#5BD1FF",
                  fontSize: 13,
                  fontWeight: "600"
                }}
              >
                {isAdmin ? "👑 Admin Connected" : "🧬 Donor Connected"}
              </div>
              <div style={styles.walletAddr}>
                {connected.slice(0, 6)}…{connected.slice(-4)}
              </div>
            </div>
          ) : (
            <button onClick={connectWallet} style={styles.connectBtn}>
              ⚡ Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Admin Form */}
      {isAdmin && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>🩸 Create Blood Request</h2>
          <form onSubmit={createRequest} style={styles.form}>
            <input name="bloodGroup" placeholder="Blood Group (A+)" required style={styles.input} />
            <input name="location" placeholder="Location" required style={styles.input} />
            <input name="quantity" type="number" placeholder="Units" required style={styles.input} />
            <input name="contact" placeholder="Contact Info" required style={styles.input} />
            <button type="submit" style={styles.primaryBtn}>
              + Create Request
            </button>
          </form>
        </section>
      )}

      {/* Open Requests */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>🧾 Active Requests</h2>
        {loading ? (
          <p>Loading on-chain data…</p>
        ) : requests.length === 0 ? (
          <p>No active requests.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Group</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td style={{ color: "#ff4655" }}>{r.bloodGroup}</td>
                    <td>{r.location}</td>
                    <td>{r.quantity}</td>
                    <td style={{ color: r.status === "Fulfilled" ? "#2ecc71" : "#FFD36B" }}>
                      {r.status}
                    </td>
                    <td>
                      <button onClick={() => openInterested(r.id)} style={styles.smallBtn}>
                        View Donors
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openInterested(r.id)}
                          style={{ ...styles.smallBtn, background: "#8b5cf6" }}
                        >
                          Manage
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Events */}
      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>⚡ KWALA Live Events</h3>
        {events.length === 0 ? (
          <p style={{ color: "#777" }}>No events yet</p>
        ) : (
          events.slice(0, 10).map((e, i) => (
            <div key={i} style={styles.eventCard}>
              <b style={{ color: "#ff4655" }}>{e.body.event}</b> —{" "}
              <span style={{ color: "#ccc" }}>{JSON.stringify(e.body)}</span>
              <div style={styles.timestamp}>{new Date(e.timestamp).toLocaleTimeString()}</div>
            </div>
          ))
        )}
      </section>

      {/* Interested List */}
      {showInterestedFor && (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <h4>Interested for Request #{showInterestedFor}</h4>
            <button
              onClick={() => {
                setShowInterestedFor(null);
                setInterestedList([]);
              }}
              style={styles.smallBtn}
            >
              ❌ Close
            </button>
          </div>
          {interestedList.length === 0 ? (
            <p style={{ color: "#999" }}>No interested donors yet.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interestedList.map((d) => (
                  <tr key={d}>
                    <td>{d}</td>
                    <td>
                      <button onClick={() => viewDonorProfile(d)} style={styles.smallBtn}>
                        View Profile
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => approveDonor(showInterestedFor, d)}
                          style={{ ...styles.smallBtn, background: "#27ae60" }}
                        >
                          ✅ Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Donor Profile */}
      {selectedDonorProfile && (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <h4>Donor: {selectedDonorProfile.address}</h4>
            <button onClick={() => setSelectedDonorProfile(null)} style={styles.smallBtn}>
              Close
            </button>
          </div>

          <div>
            <div style={styles.profileLine}>🧬 Donations: {selectedDonorProfile.donationsCount}</div>
            <div style={styles.profileLine}>⭐ Level: {selectedDonorProfile.level}</div>

            <div style={{ marginTop: 12 }}>
              {Array.from({ length: 4 }).map((_, lvlIndex) => {
                const levelNumber = lvlIndex + 1;
                const donations = selectedDonorProfile.donationsCount;
                const donationsBefore = (levelNumber - 1) * 4;
                const inThisLevel = Math.max(0, Math.min(4, donations - donationsBefore));
                const filled = inThisLevel;

                return (
                  <div key={lvlIndex} style={{ marginTop: 10 }}>
                    <div style={{ color: "#aaa" }}>Level {levelNumber}</div>
                    <div style={styles.starsRow}>
                      {Array.from({ length: 4 }).map((__, starIndex) => {
                        const starFilled = starIndex < filled;
                        return (
                          <div
                            key={starIndex}
                            style={{
                              ...styles.star,
                              background: starFilled
                                ? "linear-gradient(45deg,#FFD36B,#FFAA00)"
                                : "#1a1a1a",
                              boxShadow: starFilled
                                ? "0 0 8px rgba(255,211,107,0.6)"
                                : "none",
                              color: starFilled ? "#111" : "#555"
                            }}
                          >
                            ★
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/* 🎨 GAMIFIED STYLES */
const styles = {
  main: {
    background: "radial-gradient(circle at top, #0a0a0a 40%, #000 100%)",
    color: "#e5e5e5",
    minHeight: "100vh",
    fontFamily: "Poppins, Orbitron, sans-serif",
    padding: 24
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  title: {
    fontSize: "2rem",
    background: "linear-gradient(90deg,#ff4655,#ff9f1a)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 800,
    textShadow: "0 0 12px rgba(255,100,80,0.5)"
  },
  subtitle: {
    color: "#888",
    fontSize: "0.9rem"
  },
  adminLine: {
    fontSize: "0.75rem",
    color: "#666",
    marginTop: 4
  },
  connectBtn: {
    background: "linear-gradient(90deg,#ff4655,#ff9f1a)",
    border: "none",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "600",
    transition: "transform 0.2s",
  },
  walletBox: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  walletAddr: {
    background: "#111",
    padding: "6px 12px",
    borderRadius: 8,
    marginTop: 6,
    border: "1px solid #333",
    fontSize: 13
  },
  card: {
    background: "linear-gradient(180deg,#111,#181818)",
    padding: 18,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 20,
    boxShadow: "0 0 20px rgba(255,70,85,0.1)"
  },
  sectionTitle: { fontSize: "1.2rem", marginBottom: 10, color: "#FFD36B" },
  input: {
    background: "#1c1c1c",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "0.6rem 1rem",
    color: "#fff",
    width: "180px",
    outline: "none"
  },
  form: { display: "flex", flexWrap: "wrap", gap: "1rem" },
  primaryBtn: {
    background: "linear-gradient(90deg,#ff4655,#ff9f1a)",
    border: "none",
    color: "white",
    padding: "0.7rem 1.4rem",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "700",
    transition: "all 0.2s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#ddd"
  },
  smallBtn: {
    background: "#222",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #333",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  eventCard: {
    background: "#1a1a1a",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeft: "3px solid #ff4655"
  },
  timestamp: { fontSize: 12, color: "#555", marginTop: 4 },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  profileLine: { color: "#ccc", marginBottom: 6 },
  starsRow: { display: "flex", gap: 6, marginTop: 6 },
  star: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease"
  }
};
