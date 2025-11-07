// app/public/page.js
"use client";

import { useEffect, useState } from "react";
import { getProvider, getContract } from "../lib/eth";

/**
 * Public dashboard:
 * - Top Donors (computed directly from on-chain data)
 * - Live Achievements (from /api/kwala, i.e. KWALA webhooks)
 *
 * Notes:
 * - This computes Top Donors by scanning all requests and collecting interested addresses.
 * - If your contract grows very large, consider a server-side index or a subgraph.
 */

export default function PublicDashboard() {
  const [donors, setDonors] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);

  // ----- ACHIEVEMENTS (KWALA webhook feed) -----
  async function fetchAchievements() {
    try {
      const res = await fetch("/api/kwala");
      const data = await res.json();
      if (data.ok && Array.isArray(data.events)) {
        const levelEvents = data.events.filter(e => {
          // accept both e.body.event or e.event depending on your payload
          const body = e.body ?? e;
          return (body.event === "LevelUpdated");
        });
        setAchievements(levelEvents);
      } else {
        setAchievements([]);
      }
    } catch (err) {
      console.error("fetchAchievements error:", err);
      setAchievements([]);
    }
  }

  // ----- TOP DONORS (on-chain) -----
  // Approach:
  // 1) read requestCount
  // 2) for each id call getInterested(id) -> get array of addresses
  // 3) dedupe addresses
  // 4) for each address call getDonorProfile(addr)
  // 5) sort and show

  async function fetchTopDonors() {
    setLoadingDonors(true);
    try {
      const provider = getProvider();
      const contract = getContract(provider);

      // 1) requestCount
      const totalBN = await contract.requestCount();
      const total = Number(totalBN ?? 0);
      console.log("requestCount:", total);

      if (total === 0) {
        setDonors([]);
        setLoadingDonors(false);
        return;
      }

      // 2) gather interested addresses for each request
      // We'll run in batches to avoid flooding RPC with too many concurrent calls.
      const concurrency = 8;
      const allInterested = [];
      const ids = Array.from({ length: total }, (_, i) => i + 1);

      // helper to chunk
      function chunkArray(arr, size) {
        const res = [];
        for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
        return res;
      }

      const chunks = chunkArray(ids, concurrency);
      for (const chunk of chunks) {
        // call getInterested for this chunk in parallel
        const promises = chunk.map(id => contract.getInterested(id)
          .then(list => ({ id, list }))
          .catch(err => {
            console.warn(`getInterested(${id}) failed:`, err?.message ?? err);
            return { id, list: [] };
          })
        );
        const results = await Promise.all(promises);
        results.forEach(r => {
          if (Array.isArray(r.list)) r.list.forEach(addr => allInterested.push(addr.toLowerCase()));
        });
      }

      // dedupe
      const unique = Array.from(new Set(allInterested.map(a => a.toLowerCase())));
      console.log("unique donors found:", unique.length);

      if (unique.length === 0) {
        // fallback: check eventStore via /api/kwala (maybe donors only show in events)
        console.log("No interested addresses found on-chain. Falling back to KWALA events for donors.");
        const res = await fetch("/api/kwala");
        const data = await res.json();
        const evDonors = (data.ok && Array.isArray(data.events))
          ? Array.from(new Set(data.events.map(e => (e.body?.donor ?? e.donor ?? "").toLowerCase()).filter(Boolean)))
          : [];
        if (evDonors.length === 0) {
          setDonors([]);
          setLoadingDonors(false);
          return;
        }
        unique.push(...evDonors);
      }

      // 3) for each unique donor, fetch getDonorProfile
      // do in chunks again
      const profiles = [];
      const addrChunks = chunkArray(unique, concurrency);
      for (const chunk of addrChunks) {
        const pProms = chunk.map(addr =>
          contract.getDonorProfile(addr)
            .then(p => ({ addr, donationsCount: Number(p.donationsCount ?? 0), level: Number(p.level ?? 0) }))
            .catch(err => {
              console.warn("getDonorProfile failed for", addr, err?.message ?? err);
              return { addr, donationsCount: 0, level: 0 };
            })
        );
        const settled = await Promise.allSettled(pProms);
        settled.forEach(s => {
          if (s.status === "fulfilled") profiles.push(s.value);
        });
      }

      // 4) sort profiles by level desc, donationsCount desc
      profiles.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.donationsCount - a.donationsCount;
      });

      setDonors(profiles);
    } catch (err) {
      console.error("fetchTopDonors error:", err);
      setDonors([]);
    } finally {
      setLoadingDonors(false);
    }
  }

  useEffect(() => {
    // initial load
    fetchAchievements();
    fetchTopDonors();

    // refresh intervals
    const achInt = setInterval(fetchAchievements, 8000);
    const donorsInt = setInterval(fetchTopDonors, 20000); // donors change less often
    return () => {
      clearInterval(achInt);
      clearInterval(donorsInt);
    };
  }, []);

  return (
    <main style={{ background: "#0b0b0b", color: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#ff4655" }}>🏆 Blood Donor Leaderboard</h1>
        <p style={{ color: "#aaa" }}>Top donors from on-chain data (no KWALA required)</p>
      </header>

      <section style={{ background: "#141414", borderRadius: 12, padding: 16, border: "1px solid #222", marginBottom: 24 }}>
        <h2>Top Donors</h2>
        {loadingDonors ? <p>Loading donors from chain...</p> : donors.length === 0 ? <p>No donors found yet.</p> : (
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
                <tr key={d.addr ?? d.address ?? d.addr} style={{ borderBottom: "1px solid #222" }}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{(d.addr ?? d.address).slice(0, 6)}...{(d.addr ?? d.address).slice(-4)}</td>
                  <td style={td}>{'⭐'.repeat(Math.max(0, d.level))}</td>
                  <td style={td}>{d.donationsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ background: "#141414", borderRadius: 12, padding: 16, border: "1px solid #222" }}>
        <h2>🏅 Live Achievements</h2>
        {achievements.length === 0 ? <p style={{ color: "#888" }}>No achievements yet.</p> : achievements.map((a, i) => (
          <div key={i} style={{ background: "#1a1a1a", padding: 12, borderRadius: 8, marginBottom: 10, borderLeft: "4px solid #ff4655" }}>
            <p style={{ margin: 0 }}>
              🎖️ Donor <b>{(a.body?.donor ?? a.donor ?? '').slice(0,6)}...{(a.body?.donor ?? a.donor ?? '').slice(-4)}</b> reached <b>Level {(a.body?.newLevel ?? a.newLevel)}</b> ({(a.body?.totalDonations ?? a.totalDonations)} total donations)
            </p>
            <div style={{ fontSize: 12, color: "#888" }}>{new Date(a.timestamp).toLocaleString()}</div>
          </div>
        ))}
      </section>
    </main>
  );
}

const th = { padding: 8, textAlign: "left", color: "#aaa" };
const td = { padding: 8 };
