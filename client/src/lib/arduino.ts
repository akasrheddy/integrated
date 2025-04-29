// Arduino communication utility functions
import { apiRequest } from "./queryClient";

// Serial port connection parameters
interface SerialConfig {
  port: string;
  baudRate: number;
  timeout: number;
}

// Fingerprint enrollment and verification responses
export interface FingerprintResponse {
  success: boolean;
  message: string;
  fingerprintData?: string;
  fingerprintHash?: string;
  confidence?: number;
}

// Hardware status
export interface HardwareStatus {
  connected: boolean;
  firmwareVersion?: string;
  sensorStatus?: "ready" | "busy" | "error";
  errorMessage?: string;
}

/**
 * Connect to the Arduino fingerprint sensor
 */
export async function connectToArduino(config?: Partial<SerialConfig>): Promise<HardwareStatus> {
  try {
    const response = await apiRequest("POST", "/api/arduino/connect", config || {});
    return await response.json();
  } catch (error) {
    console.error("Error connecting to Arduino:", error);
    return {
      connected: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Disconnect from the Arduino fingerprint sensor
 */
export async function disconnectArduino(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest("POST", "/api/arduino/disconnect", {});
    return await response.json();
  } catch (error) {
    console.error("Error disconnecting Arduino:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Enroll a new fingerprint (registration)
 */
export async function enrollFingerprint(): Promise<FingerprintResponse> {
  try {
    const response = await apiRequest("POST", "/api/arduino/enroll-fingerprint", {});
    return await response.json();
  } catch (error) {
    console.error("Error enrolling fingerprint:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Verify a fingerprint (authentication)
 */
export async function verifyFingerprint(): Promise<FingerprintResponse> {
  try {
    const response = await apiRequest("POST", "/api/arduino/verify-fingerprint", {});
    return await response.json();
  } catch (error) {
    console.error("Error verifying fingerprint:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get the current status of the Arduino and fingerprint sensor
 */
export async function getArduinoStatus(): Promise<HardwareStatus> {
  try {
    const response = await fetch("/api/arduino/status");
    return await response.json();
  } catch (error) {
    console.error("Error getting Arduino status:", error);
    return {
      connected: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Calibrate the fingerprint sensor
 */
export async function calibrateFingerprint(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest("POST", "/api/arduino/calibrate", {});
    return await response.json();
  } catch (error) {
    console.error("Error calibrating fingerprint sensor:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Delete a fingerprint from the sensor
 */
export async function deleteFingerprint(fingerprintId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest("DELETE", `/api/arduino/fingerprint/${fingerprintId}`, {});
    return await response.json();
  } catch (error) {
    console.error("Error deleting fingerprint:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
