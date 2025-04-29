import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to create a salted hash from biometric data
export function createSaltedHash(data: string, salt?: string): string {
  // In a real implementation, we would use a cryptographic hash function
  // This is just a placeholder to represent the concept
  const generatedSalt = salt || Math.random().toString(36).substring(2, 15);
  return `hash_${data}_${generatedSalt}`;
}

// Generate a ZKP proof (simplified for demonstration)
export function generateZkProof(privateData: string, publicKey: string): string {
  // In a real implementation, this would use a ZKP library
  return `zkp_proof_${privateData.substring(0, 5)}_${Date.now()}`;
}

// Verify a ZKP proof (simplified for demonstration)
export function verifyZkProof(proof: string, publicKey: string): boolean {
  // In a real implementation, this would use a ZKP library to verify
  return proof.startsWith('zkp_proof_');
}

// Format blockchain address for display
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format timestamp for display
export function formatTimestamp(timestamp: Date | string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Timer utilities
export function formatSeconds(seconds: number): string {
  return seconds.toString().padStart(2, '0');
}

// Generate Merkle tree proof (simplified)
export function generateMerkleProof(data: string[], index: number): string[] {
  // In a real implementation, this would construct an actual Merkle proof
  return [`merkle_proof_${index}_${Date.now()}`];
}

// Verify Merkle proof (simplified)
export function verifyMerkleProof(proof: string[], rootHash: string, leaf: string): boolean {
  // In a real implementation, this would verify the Merkle proof against the root hash
  return proof.length > 0 && proof[0].startsWith('merkle_proof_');
}

// Generate blind signature (simplified)
export function generateBlindSignature(message: string, privateKey: string): string {
  // In a real implementation, this would use a blind signature algorithm
  return `blind_sig_${message.substring(0, 5)}_${Date.now()}`;
}

// Verify blind signature (simplified)
export function verifyBlindSignature(message: string, signature: string, publicKey: string): boolean {
  // In a real implementation, this would verify the blind signature
  return signature.startsWith('blind_sig_');
}

// Generate NFT token ID (simplified)
export function generateNftTokenId(): string {
  // In a real implementation, this would create a real NFT token ID
  return `0x${Math.random().toString(16).slice(2, 14)}`;
}
