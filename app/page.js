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

  // --- wallet connect + admin detect
  async function connectWallet() {
    try {
      const addr = await getConnectedAddress();
      setConnected(addr);
      setIsAdmin(isAdminAddress(addr));
    } catch (err) {
      console.error("connect error", err);
    }
  }

  // --- fetch on-chain requests
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

  // --- poll KWALA events
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

  // --- create request (admin)
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

  // --- open interested list for a request (admin + view)
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

  // --- admin approve donor (calls contract.approveInterest)
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

  // --- view donor profile
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
    <main style={{ background: "#0a0a0a", color: "#e5e5e5", minHeight: "100vh", fontFamily: "Inter, sans-serif", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>🩸 Blood Donation Dashboard</h1>
          <div style={{ color: "#aaa", fontSize: 13 }}>KWALA Integrated — Admin: {process.env.NEXT_PUBLIC_ADMIN_ADDRESS}</div>
        </div>

        <div>
          {connected ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ color: isAdmin ? "#ffd36b" : "#9ad1ff", fontSize: 13 }}>
                {isAdmin ? "Admin (connected)" : "Donor (connected)"}
              </div>
              <div style={{ background: "#111", padding: "8px 12px", borderRadius: 8, border: "1px solid #222" }}>{connected.slice(0, 6)}…{connected.slice(-4)}</div>
            </div>
          ) : (
            <button onClick={connectWallet} style={{ background: "#ff4655", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}>Connect Wallet</button>
          )}
        </div>
      </header>

      {/* Create Request Form — admin-only */}
      {isAdmin && (
        <section style={{ background: "#141414", padding: 16, borderRadius: 12, border: "1px solid #222", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Create Blood Request</h2>

          <form onSubmit={createRequest} style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <input name="bloodGroup" placeholder="Blood Group (A+)" required style={inputStyle} />
            <input name="location" placeholder="Location" required style={inputStyle} />
            <input name="quantity" type="number" placeholder="Units" required style={inputStyle} />
            <input name="contact" placeholder="Contact Info" required style={inputStyle} />
            <button type="submit" style={createBtnStyle}>+ Create Request</button>
          </form>
        </section>
      )}

      {/* Open Requests */}
      <section style={{ marginBottom: 20, background: "#141414", padding: 16, borderRadius: 12, border: "1px solid #222" }}>
        <h2 style={{ marginTop: 0 }}>Open Requests</h2>

        {loading ? <p>Loading on-chain data…</p> : requests.length === 0 ? <p>No active requests.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#ddd" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#1b1b1b" }}>
                <th style={{ padding: 8 }}>ID</th>
                <th style={{ padding: 8 }}>Group</th>
                <th style={{ padding: 8 }}>Location</th>
                <th style={{ padding: 8 }}>Qty</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 8 }}>{r.id}</td>
                  <td style={{ padding: 8 }}>{r.bloodGroup}</td>
                  <td style={{ padding: 8 }}>{r.location}</td>
                  <td style={{ padding: 8 }}>{r.quantity}</td>
                  <td style={{ padding: 8, color: r.status === "Fulfilled" ? "#2ecc71" : "#fff" }}>{r.status}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => openInterested(r.id)} style={smallBtn}>Show Interested</button>{" "}
                    {isAdmin && <button onClick={() => openInterested(r.id)} style={{ ...smallBtn, background: "#8b5cf6" }}>Manage</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* KWALA events */}
      <section style={{ background: "#141414", padding: 16, borderRadius: 12, border: "1px solid #222", marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>⚡ KWALA Live Events</h3>
        {events.length === 0 ? <p style={{ color: "#777" }}>No events yet</p> : events.slice(0, 10).map((e, i) => (
          <div key={i} style={{ background: "#1a1a1a", padding: 8, borderRadius: 8, marginBottom: 8 }}>
            <b style={{ color: "#ff4655" }}>{e.body.event}</b> — <span style={{ color: "#ccc" }}>{JSON.stringify(e.body)}</span>
            <div style={{ fontSize: 12, color: "#666" }}>{new Date(e.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </section>

      {/* Interested panel */}
      {showInterestedFor && (
        <div style={{ background: "#0b0b0b", border: "1px solid #222", padding: 12, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>Interested for Request #{showInterestedFor}</h4>
            <div>
              <button onClick={() => { setShowInterestedFor(null); setInterestedList([]); }} style={smallBtn}>Close</button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {interestedList.length === 0 ? <p style={{ color: "#999" }}>No interested donors yet.</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1b1b1b" }}>
                    <th style={{ padding: 8 }}>Donor</th>
                    <th style={{ padding: 8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interestedList.map((d) => (
                    <tr key={d} style={{ borderBottom: "1px solid #222" }}>
                      <td style={{ padding: 8 }}>{d}</td>
                      <td style={{ padding: 8 }}>
                        <button onClick={() => viewDonorProfile(d)} style={smallBtn}>View Profile</button>{" "}
                        {isAdmin && <button onClick={() => approveDonor(showInterestedFor, d)} style={{ ...smallBtn, background: "#27ae60" }}>Approve</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Donor profile */}
      {selectedDonorProfile && (
        <div style={{ marginTop: 16, background: "#0f0f0f", padding: 12, borderRadius: 10, border: "1px solid #222" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>Donor: {selectedDonorProfile.address}</h4>
            <button onClick={() => setSelectedDonorProfile(null)} style={smallBtn}>Close</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#ccc" }}>Donations: <b>{selectedDonorProfile.donationsCount}</b></div>
            <div style={{ color: "#ffd36b" }}>Level: <b>{selectedDonorProfile.level}</b></div>

            <div style={{ marginTop: 12 }}>
              {Array.from({ length: 4 }).map((_, lvlIndex) => {
                const levelNumber = lvlIndex + 1;
                const donations = selectedDonorProfile.donationsCount;
                const donationsBefore = (levelNumber - 1) * 4;
                const inThisLevel = Math.max(0, Math.min(4, donations - donationsBefore));
                const filled = inThisLevel;

                return (
                  <div key={lvlIndex} style={{ marginTop: 10 }}>
                    <div style={{ color: "#999" }}>Level {levelNumber}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {Array.from({ length: 4 }).map((__, starIndex) => {
                        const starFilled = starIndex < filled;
                        return (
                          <div key={starIndex} style={{
                            width: 28, height: 28, borderRadius: 6,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: starFilled ? "#ffd36b" : "#1a1a1a",
                            color: starFilled ? "#111" : "#666",
                            border: starFilled ? "1px solid #e6b800" : "1px solid #222"
                          }}>
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
        </div>
      )}

    </main>
  );
}

/* styles */
const inputStyle = {
  background: "#1c1c1c",
  border: "1px solid #333",
  borderRadius: "6px",
  padding: "0.5rem 0.8rem",
  color: "white",
  width: "180px",
};

const createBtnStyle = {
  background: "#ff4655",
  border: "none",
  color: "white",
  padding: "0.6rem 1.2rem",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

const smallBtn = {
  background: "#222",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #333",
  cursor: "pointer",
};
