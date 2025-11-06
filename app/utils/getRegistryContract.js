// app/utils/getRegistryContract.js
import { ethers } from "ethers";
import REGISTRY_ABI from "../abi/bloodRegistry.json"; // ✅ correct relative path

// ✅ Hardcoded constants (no .env needed)
const REGISTRY_ADDRESS = "0x804FC2756e69EE020667520C758b75A208655968";
const RPC_URL = "https://rpc-amoy.polygon.technology";

/**
 * Get the Blood Registry contract instance.
 * Uses a read-only provider (for reading data).
 */
export function getRegistryContract() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
    console.log("✅ Registry contract initialized:", contract.target);
    return contract;
  } catch (error) {
    console.error("❌ Error initializing contract:", error);
    return null;
  }
}

/**
 * Optional: get contract with wallet (for write actions)
 */
export async function getRegistryContractWithSigner() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
    console.log("✅ Registry contract (signer) initialized:", contract.target);
    return contract;
  } catch (error) {
    console.error("❌ Error initializing contract with signer:", error);
    return null;
  }
}
