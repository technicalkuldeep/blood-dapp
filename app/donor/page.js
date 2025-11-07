"use client";

import { useEffect, useState } from "react";
import { getProvider, getContract, getSigner, getConnectedAddress, getDonorProfile } from "../lib/eth";

export default function DonorDashboard() {
  const [requests, setRequests] = useState([]);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

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
      alert("✅ Expressed interest. Wait for admin approval.");
    } catch (err) {
      alert("Error: " + (err.message || err));
    }
  }

  function renderStarsForLevel(levelNumber) {
    if (!profile) return null;
    const donations = profile.donationsCount;
    const donationsBefore = (levelNumber - 1) * 4;
    const inThisLevel = Math.max(0, Math.min(4, donations - donationsBefore));
    const filled = inThisLevel;
    return (
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} style={{
            width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            background: idx < filled ? "#ffd36b" : "#1a1a1a",
            color: idx < filled ? "#111" : "#666",
            border: idx < filled ? "1px solid #e6b800" : "1px solid #222"
          }}>★</div>
        ))}
      </div>
    );
  }

  return (
    <main style={{ background: "#0b0b0b", color: "#fff", minHeight: "100vh", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>🩸 Donor Dashboard</h1>
        <div>
          {address ? (
            <div style={{ background: "#111", padding: "6px 10px", borderRadius: 8 }}>{address.slice(0, 6)}…{address.slice(-4)}</div>
          ) : (
            <button onClick={connect} style={{ background: "#ff4655", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}>Connect Wallet</button>
          )}
        </div>
      </header>

      <section style={{ background: "#141414", padding: 16, borderRadius: 10, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Your Profile</h3>
        {!profile ? <p style={{ color: "#999" }}>Connect wallet to view profile</p> : (
          <div>
            <div style={{ color: "#ccc" }}>Donations: <b>{profile.donationsCount}</b></div>
            <div style={{ color: "#ffd36b" }}>Level: <b>{profile.level}</b></div>

            <div style={{ marginTop: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ color: "#999" }}>Level {i + 1}</div>
                  <div style={{ marginTop: 6 }}>{renderStarsForLevel(i + 1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section style={{ background: "#141414", padding: 16, borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>Active Requests</h3>
        {loading ? <p>Loading…</p> : requests.length === 0 ? <p>No requests</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#ddd" }}>
            <thead><tr style={{ background: "#1b1b1b" }}><th style={{ padding: 8 }}>ID</th><th style={{ padding: 8 }}>Group</th><th style={{ padding: 8 }}>Location</th><th style={{ padding: 8 }}>Qty</th><th style={{ padding: 8 }}>Action</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 8 }}>{r.id}</td>
                  <td style={{ padding: 8 }}>{r.bloodGroup}</td>
                  <td style={{ padding: 8 }}>{r.location}</td>
                  <td style={{ padding: 8 }}>{r.quantity}</td>
                  <td style={{ padding: 8 }}><button onClick={() => expressInterest(r.id)} style={{ background: "#ff4655", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6 }}>❤️ I'm Interested</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
