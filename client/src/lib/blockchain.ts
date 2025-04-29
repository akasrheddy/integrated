// Blockchain utility functions
import { apiRequest } from "./queryClient";

// Transaction response from blockchain operations
export interface TransactionResponse {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  message?: string;
}

// Blockchain status information
export interface BlockchainStatus {
  connected: boolean;
  network?: string;
  activeNodes?: number;
  latestBlock?: {
    number: number;
    hash: string;
    timestamp: number;
  };
  smartContract?: {
    address: string;
    deployed: boolean;
  };
  merkleRoot?: string;
  message?: string;
}

// Vote record for blockchain
export interface VoteRecord {
  voterId: string;
  candidateId: number;
  timestamp: number;
  blindSignature?: string;
  nftTokenId?: string;
}

/**
 * Connect to the blockchain network
 * @param providerUrl Blockchain provider URL
 */
export async function connectToBlockchain(providerUrl?: string): Promise<BlockchainStatus> {
  try {
    const response = await apiRequest("POST", "/api/blockchain/connect", {
      providerUrl
    });
    return await response.json();
  } catch (error) {
    console.error("Error connecting to blockchain:", error);
    return {
      connected: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Record a vote on the blockchain
 * @param voteData Vote data to record
 */
export async function recordVoteOnBlockchain(voteData: VoteRecord): Promise<TransactionResponse> {
  try {
    const response = await apiRequest("POST", "/api/blockchain/record-vote", voteData);
    return await response.json();
  } catch (error) {
    console.error("Error recording vote on blockchain:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Generate a blind signature for a vote
 * @param voteData Vote data to sign
 */
export async function generateBlindSignature(voteData: Partial<VoteRecord>): Promise<{
  success: boolean;
  blindSignature?: string;
  message?: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/blockchain/blind-signature", voteData);
    return await response.json();
  } catch (error) {
    console.error("Error generating blind signature:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Issue an NFT token for a vote
 * @param voteData Vote data for which to issue an NFT
 */
export async function issueNftForVote(voteData: VoteRecord): Promise<{
  success: boolean;
  nftTokenId?: string;
  transactionHash?: string;
  message?: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/blockchain/issue-nft", voteData);
    return await response.json();
  } catch (error) {
    console.error("Error issuing NFT for vote:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get the Merkle proof for a vote
 * @param voterId ID of the voter whose vote proof to retrieve
 */
export async function getMerkleProof(voterId: string): Promise<{
  success: boolean;
  proof?: string[];
  leafIndex?: number;
  message?: string;
}> {
  try {
    const response = await apiRequest("GET", `/api/blockchain/merkle-proof/${voterId}`, {});
    return await response.json();
  } catch (error) {
    console.error("Error getting Merkle proof:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Verify a Merkle proof for a vote
 * @param voterId ID of the voter
 * @param proof Merkle proof to verify
 * @param leafIndex Index of the leaf in the Merkle tree
 */
export async function verifyMerkleProof(
  voterId: string,
  proof: string[],
  leafIndex: number
): Promise<{
  success: boolean;
  verified: boolean;
  message?: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/blockchain/verify-merkle-proof", {
      voterId,
      proof,
      leafIndex
    });
    return await response.json();
  } catch (error) {
    console.error("Error verifying Merkle proof:", error);
    return {
      success: false,
      verified: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get the current blockchain status
 */
export async function getBlockchainStatus(): Promise<BlockchainStatus> {
  try {
    const response = await fetch("/api/blockchain/status");
    return await response.json();
  } catch (error) {
    console.error("Error getting blockchain status:", error);
    return {
      connected: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get voting results from the blockchain
 */
export async function getVotingResults(): Promise<{
  success: boolean;
  results?: Array<{
    candidateId: number;
    votes: number;
  }>;
  message?: string;
}> {
  try {
    const response = await fetch("/api/blockchain/results");
    return await response.json();
  } catch (error) {
    console.error("Error getting voting results:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
