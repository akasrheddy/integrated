// Zero-Knowledge Proof utility functions
import { apiRequest } from "./queryClient";

// ZKP authentication request
export interface ZkpAuthRequest {
  publicData: {
    voterId: string;
    method: "fingerprint" | "facial";
  };
  privateData?: {
    biometricData: string;
    salt?: string;
  };
}

// ZKP authentication response
export interface ZkpAuthResponse {
  success: boolean;
  verified?: boolean;
  zkProof?: string;
  message?: string;
}

/**
 * Generate a Zero-Knowledge Proof for authentication
 * @param authRequest Authentication request containing public and private data
 */
export async function generateZkProof(authRequest: ZkpAuthRequest): Promise<ZkpAuthResponse> {
  try {
    const response = await apiRequest("POST", "/api/zkp/generate", authRequest);
    return await response.json();
  } catch (error) {
    console.error("Error generating ZK proof:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Verify a Zero-Knowledge Proof for authentication
 * @param publicData Public data for verification
 * @param zkProof The ZK proof to verify
 */
export async function verifyZkProof(
  publicData: ZkpAuthRequest["publicData"],
  zkProof: string
): Promise<ZkpAuthResponse> {
  try {
    const response = await apiRequest("POST", "/api/zkp/verify", {
      publicData,
      zkProof
    });
    return await response.json();
  } catch (error) {
    console.error("Error verifying ZK proof:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get the status of the ZKP system
 */
export async function getZkpStatus(): Promise<{
  enabled: boolean;
  version?: string;
  message?: string;
}> {
  try {
    const response = await fetch("/api/zkp/status");
    return await response.json();
  } catch (error) {
    console.error("Error getting ZKP status:", error);
    return {
      enabled: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Create a salted hash of biometric data for ZKP
 * @param biometricData The raw biometric data
 * @param salt Optional salt (generated if not provided)
 */
export async function createSaltedBiometricHash(
  biometricData: string,
  salt?: string
): Promise<{
  success: boolean;
  hash?: string;
  salt?: string;
  message?: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/zkp/hash-biometric", {
      biometricData,
      salt
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating salted biometric hash:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Create a ZKP-compatible commitment for biometric data
 * @param biometricHash The hashed biometric data
 */
export async function createBiometricCommitment(
  biometricHash: string
): Promise<{
  success: boolean;
  commitment?: string;
  message?: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/zkp/create-commitment", {
      biometricHash
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating biometric commitment:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
