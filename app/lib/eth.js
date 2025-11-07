// app/lib/eth.js
import { ethers } from "ethers";
import registryAbi from "../abi/BloodRegistry.json";

/**
 * ====== Hardcoded configuration (inlined) ======
 * Replace these values here if you want to change networks/addresses.
 */
const RPC = "https://rpc-amoy.polygon.technology";
const REGISTRY = "0x804FC2756e69EE020667520C758b75A208655968"; // BloodRegistry
const NFT_ADDRESS = "0xB1FEd5f9963893C4f7232e0A96A61eE460439D9c"; // BloodNFT (if needed)
const ADMIN = "0xc277f4d2b4a84486a51c1ffcad9f091a11301286".toLowerCase();
/**
 * ================================================
 */

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC);
}

export function getContract(providerOrSigner) {
  return new ethers.Contract(REGISTRY, registryAbi, providerOrSigner);
}

export async function getSigner() {
  if (!window.ethereum) throw new Error("Install MetaMask");
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

export async function getConnectedAddress() {
  if (!window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return (accounts[0] || "").toLowerCase();
}

export async function getDonorProfile(address) {
  const provider = getProvider();
  const contract = getContract(provider);
  const p = await contract.getDonorProfile(address);
  return {
    donationsCount: Number(p.donationsCount ?? 0),
    level: Number(p.level ?? 0),
  };
}

export async function getInterested(id) {
  const provider = getProvider();
  const contract = getContract(provider);
  const list = await contract.getInterested(id);
  return list;
}

export function isAdminAddress(addr) {
  if (!addr) return false;
  return addr.toLowerCase() === ADMIN;
}

// Export constants for other modules if needed
export const CONFIG = {
  RPC,
  REGISTRY,
  NFT_ADDRESS,
  ADMIN,
};
