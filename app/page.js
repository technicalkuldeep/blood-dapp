"use client";

import { useEffect, useState } from "react";
import { getProvider, getContract, getSigner } from "./lib/eth";

export default function Home() {
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch on-chain blood requests
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
      console.error(err);
      setLoading(false);
    }
  }

  // Fetch live KWALA events
  async function fetchEvents() {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (data.ok) setEvents(data.events);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  }

  useEffect(() => {
    fetchRequests();
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  async function createRequest(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const signer = await getSigner();
    const contract = getContract(signer);
    try {
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
      alert("Error: " + err.message);
    }
  }

  return (
    <main
      style={{
        background: "#0a0a0a",
        color: "#e5e5e5",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        🩸 <span style={{ color: "#ff4655" }}>Blood Donation Dashboard</span>{" "}
        <span style={{ color: "#ccc" }}>(KWALA Integrated)</span>
      </h1>

      {/* Create Request Form */}
      <section
        style={{
          background: "#141414",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "2rem",
          border: "1px solid #222",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Create Blood Request</h2>
        <form
          onSubmit={createRequest}
          style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}
        >
          <input name="bloodGroup" placeholder="Blood Group (A+)" required style={inputStyle} />
          <input name="location" placeholder="Location" required style={inputStyle} />
          <input name="quantity" type="number" placeholder="Quantity" required style={inputStyle} />
          <input name="contact" placeholder="Contact Info" required style={inputStyle} />
          <button
            type="submit"
            style={{
              background: "#ff4655",
              border: "none",
              color: "white",
              padding: "0.6rem 1.2rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            + Create Request
          </button>
        </form>
      </section>

      {/* Requests Table */}
      <section
        style={{
          background: "#141414",
          borderRadius: "12px",
          padding: "1rem",
          border: "1px solid #222",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Open Requests</h2>

        {loading ? (
          <p style={{ color: "#999" }}>Loading blockchain data...</p>
        ) : requests.length === 0 ? (
          <p>No active blood requests found.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              color: "#ddd",
            }}
          >
            <thead>
              <tr style={{ background: "#1c1c1c", textAlign: "left" }}>
                {["ID", "Blood Group", "Location", "Qty", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.6rem",
                      fontWeight: "600",
                      borderBottom: "1px solid #333",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid #222",
                    background: r.status === "Fulfilled" ? "#102510" : "transparent",
                  }}
                >
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}>{r.bloodGroup}</td>
                  <td style={tdStyle}>{r.location}</td>
                  <td style={tdStyle}>{r.quantity}</td>
                  <td style={{ ...tdStyle, color: getStatusColor(r.status) }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Live KWALA Events */}
      <section
        style={{
          background: "#141414",
          borderRadius: "12px",
          padding: "1rem",
          marginTop: "2rem",
          border: "1px solid #222",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>⚡ KWALA Live Events</h2>
        {events.length === 0 ? (
          <p style={{ color: "#777" }}>Waiting for events from KWALA...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {events.map((e, i) => (
              <div
                key={i}
                style={{
                  background: "#1a1a1a",
                  padding: "0.8rem",
                  borderRadius: "8px",
                  border: "1px solid #222",
                }}
              >
                <b style={{ color: "#ff4655" }}>{e.body.event || "Event"}</b> →{" "}
                <span style={{ color: "#ccc" }}>{JSON.stringify(e.body)}</span>
                <div style={{ fontSize: "0.8rem", color: "#666" }}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// Inline reusable styles
const inputStyle = {
  background: "#1c1c1c",
  border: "1px solid #333",
  borderRadius: "6px",
  padding: "0.5rem 0.8rem",
  color: "white",
  width: "180px",
};

const tdStyle = {
  padding: "0.6rem",
  borderBottom: "1px solid #222",
};

function getStatusColor(status) {
  switch (status) {
    case "Fulfilled":
      return "#27ae60";
    case "Partially Fulfilled":
      return "#f39c12";
    case "Cancelled":
      return "#e74c3c";
    default:
      return "#fff";
  }
}
