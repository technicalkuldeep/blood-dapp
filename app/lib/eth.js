import { ethers } from "ethers";
import registryAbi from "../abi/BloodRegistry.json";

const RPC = process.env.NEXT_PUBLIC_RPC;
const REGISTRY = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;

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
