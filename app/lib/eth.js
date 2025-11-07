import { ethers } from "ethers";
import registryAbi from "../abi/BloodRegistry.json";

const RPC = process.env.NEXT_PUBLIC_RPC;
const REGISTRY = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
const ADMIN = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").toLowerCase();

/**
 * Read provider (public RPC)
 */
export function getProvider() {
  return new ethers.JsonRpcProvider(RPC);
}

/**
 * Return contract instance (provider or signer)
 */
export function getContract(providerOrSigner) {
  return new ethers.Contract(REGISTRY, registryAbi, providerOrSigner);
}

/**
 * Request signer via MetaMask
 */
export async function getSigner() {
  if (!window.ethereum) throw new Error("Install MetaMask");
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

/**
 * Get currently connected address (lowercased)
 */
export async function getConnectedAddress() {
  if (!window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return (accounts[0] || "").toLowerCase();
}

/**
 * Read donor profile (donationsCount, level)
 */
export async function getDonorProfile(address) {
  const provider = getProvider();
  const contract = getContract(provider);
  const p = await contract.getDonorProfile(address);
  return {
    donationsCount: Number(p.donationsCount ?? 0),
    level: Number(p.level ?? 0),
  };
}

/**
 * Read interested donors for a request
 */
export async function getInterested(id) {
  const provider = getProvider();
  const contract = getContract(provider);
  const list = await contract.getInterested(id);
  // returns array of addresses
  return list;
}

/**
 * Check whether provided address is admin
 */
export function isAdminAddress(addr) {
  if (!addr) return false;
  return addr.toLowerCase() === ADMIN;
}
