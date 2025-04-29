// Face recognition utility functions
import { apiRequest } from "./queryClient";

// Response from facial recognition operations
export interface FacialRecognitionResponse {
  success: boolean;
  message: string;
  facialData?: string;
  facialHash?: string;
  confidence?: number;
}

// Options for facial recognition
export interface FacialRecognitionOptions {
  minConfidence?: number;
  enableLiveness?: boolean;
}

/**
 * Enroll a new face for a voter (registration)
 * @param facialData Base64 encoded image from the webcam
 * @param options Optional configuration for enrollment
 */
export async function enrollFace(facialData: string, options?: FacialRecognitionOptions): Promise<FacialRecognitionResponse> {
  try {
    const response = await apiRequest("POST", "/api/facial/enroll", {
      facialData,
      ...options
    });
    return await response.json();
  } catch (error) {
    console.error("Error enrolling facial data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Verify a face against stored data (authentication)
 * @param facialData Base64 encoded image from the webcam
 * @param options Optional configuration for verification
 */
export async function verifyFace(facialData: string, options?: FacialRecognitionOptions): Promise<FacialRecognitionResponse> {
  try {
    const response = await apiRequest("POST", "/api/facial/verify", {
      facialData,
      ...options
    });
    return await response.json();
  } catch (error) {
    console.error("Error verifying facial data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get facial landmarks for precise facial feature detection
 * @param facialData Base64 encoded image from the webcam
 */
export async function detectFacialLandmarks(facialData: string): Promise<{
  success: boolean;
  landmarks?: any[];
  message?: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/facial/landmarks", {
      facialData
    });
    return await response.json();
  } catch (error) {
    console.error("Error detecting facial landmarks:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Check if the face is a live person (anti-spoofing)
 * @param facialData Base64 encoded image from the webcam
 */
export async function checkLiveness(facialData: string): Promise<{
  success: boolean;
  isLive: boolean;
  confidence?: number;
  message?: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/facial/liveness", {
      facialData
    });
    return await response.json();
  } catch (error) {
    console.error("Error checking liveness:", error);
    return {
      success: false,
      isLive: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Delete stored facial data for a voter
 * @param voterId The ID of the voter whose facial data should be deleted
 */
export async function deleteFacialData(voterId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest("DELETE", `/api/facial/${voterId}`, {});
    return await response.json();
  } catch (error) {
    console.error("Error deleting facial data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get the status of the facial recognition system
 */
export async function getFacialRecognitionStatus(): Promise<{
  available: boolean;
  enabled: boolean;
  message?: string;
}> {
  try {
    const response = await fetch("/api/facial/status");
    return await response.json();
  } catch (error) {
    console.error("Error getting facial recognition status:", error);
    return {
      available: false,
      enabled: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
