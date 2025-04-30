import { SerialPort } from "serialport";
import { createSaltedHash } from "../client/src/lib/utils";
import { storage } from "./storage"; // Using DatabaseStorage
import dotenv from "dotenv";

dotenv.config();

// Global configuration
export interface ArduinoConfig {
  useRealArduino: boolean;
  enableSimulation: boolean;
  port: string;
  baudRate: number;
  timeout: number;
}

export const arduinoConfig: ArduinoConfig = {
  useRealArduino: process.env.USE_REAL_ARDUINO === "true",
  enableSimulation: process.env.ENABLE_SIMULATION === "true",
  port: process.env.ARDUINO_PORT || "COM11",
  baudRate: process.env.ARDUINO_BAUDRATE ? parseInt(process.env.ARDUINO_BAUDRATE) : 9600,
  timeout: process.env.ARDUINO_TIMEOUT ? parseInt(process.env.ARDUINO_TIMEOUT) : 20000, // Increased timeout
};

/**
 * Controller for communicating with Arduino R307 fingerprint sensor
 * Matches the provided Arduino sketch using Adafruit_Fingerprint library
 */
class ArduinoController {
  private serialPort: SerialPort | null = null;
  private connected: boolean = false;
  private sensorConnected: boolean = false;
  private sensorMessage: string = "Not initialized";
  private responseHandler: ((response: string) => void) | null = null;
  private responseBuffer: string = ""; // Buffer to collect partial responses
  private port: string;
  private baudRate: number;
  private timeout: number;
  private useRealArduino: boolean;
  private enableSimulation: boolean;
  private fingerprintIdMap: Map<number, number> = new Map(); // Map user IDs to fingerprint template IDs

  constructor(port?: string, baudRate?: number, timeout?: number) {
    this.useRealArduino = arduinoConfig.useRealArduino;
    this.enableSimulation = arduinoConfig.enableSimulation;
    this.port = port || arduinoConfig.port;
    this.baudRate = baudRate || arduinoConfig.baudRate;
    this.timeout = timeout || arduinoConfig.timeout;
  }

  /**
   * Connect to the Arduino
   */
  async connect(maxRetries: number = 3, retryDelay: number = 2000): Promise<{ connected: boolean; message: string }> {
    if (this.connected) {
      return {
        connected: true,
        message: this.enableSimulation ? "Already connected to simulator" : `Already connected to Arduino on ${this.port}`,
      };
    }

    if (this.enableSimulation) {
      this.connected = true;
      this.sensorConnected = true;
      this.sensorMessage = "Simulated sensor connected";
      await storage.updateHardwareStatus({ arduinoStatus: "online", fingerprintScannerConnected: true });
      return { connected: true, message: "Connected to fingerprint simulator (SIMULATION MODE)" };
    }

    if (!this.useRealArduino) {
      this.connected = true;
      this.sensorConnected = true;
      this.sensorMessage = "Simulated sensor connected (hardware mode disabled)";
      await storage.updateHardwareStatus({ arduinoStatus: "online", fingerprintScannerConnected: true });
      return { connected: true, message: "Connected to fingerprint simulator (hardware mode disabled)" };
    }

    let retries = 0;
    while (retries < maxRetries) {
      try {
        console.log(`Attempting to connect to Arduino on ${this.port} (attempt ${retries + 1}/${maxRetries})...`);
        const ports = await SerialPort.list();
        console.log("Available ports:", ports);

        this.serialPort = new SerialPort({
          path: this.port,
          baudRate: this.baudRate,
        });

        this.serialPort.on("open", async () => {
          console.log("Arduino connected on port:", this.port);
          this.connected = true;
          await storage.updateHardwareStatus({ 
            arduinoStatus: "online", 
            fingerprintScannerConnected: this.sensorConnected,
            lastActiveFingerprint: new Date()
          });
          this.sendCommand("CHECK_SENSOR");
        });

        this.serialPort.on("data", (data) => {
          const incomingData = data.toString();
          this.responseBuffer += incomingData; // Add incoming data to buffer
          
          // Check for complete messages in the buffer
          let lines = this.responseBuffer.split('\n');
          // Process all complete lines except the last one (which might be incomplete)
          for (let i = 0; i < lines.length - 1; i++) {
            const message = lines[i].trim();
            if (message) {
              console.log("Arduino response:", message);
              this.handleResponse(message);
            }
          }
          // Keep the last (potentially incomplete) line in the buffer
          this.responseBuffer = lines[lines.length - 1];
        });

        this.serialPort.on("error", async (error) => {
          console.error("Arduino connection error:", error.message);
          this.connected = false;
          this.sensorConnected = false;
          this.sensorMessage = `Connection error: ${error.message}`;
          await storage.updateHardwareStatus({ 
            arduinoStatus: "error", 
            fingerprintScannerConnected: false 
          });
        });

        this.serialPort.on("close", async () => {
          console.log("Arduino connection closed");
          this.connected = false;
          this.sensorConnected = false;
          this.sensorMessage = "Connection closed";
          await storage.updateHardwareStatus({ 
            arduinoStatus: "disconnected", 
            fingerprintScannerConnected: false 
          });
        });

        return await new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            resolve({
              connected: false,
              message: `Failed to connect: Connection timed out after ${this.timeout}ms`,
            });
          }, this.timeout);

          this.serialPort!.on("open", () => {
            clearTimeout(timeoutId);
            resolve({
              connected: true,
              message: `Connected to Arduino on ${this.port} at ${this.baudRate} baud`,
            });
          });

          this.serialPort!.on("error", (err) => {
            clearTimeout(timeoutId);
            resolve({
              connected: false,
              message: `Failed to connect: ${err.message}. Try closing other programs or running as Administrator.`,
            });
          });
        });
      } catch (error) {
        this.connected = false;
        this.sensorConnected = false;
        this.sensorMessage = `Setup error: ${(error as Error).message}`;
        await storage.updateHardwareStatus({ 
          arduinoStatus: "error", 
          fingerprintScannerConnected: false 
        });

        if ((error as Error).message.includes("Access denied") && retries < maxRetries - 1) {
          retries++;
          console.log(`Retrying connection after ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        return {
          connected: false,
          message: `Failed to connect after ${retries + 1} attempts: ${(error as Error).message}. Try closing other programs or running as Administrator.`,
        };
      }
    }

    return {
      connected: false,
      message: `Failed to connect after ${maxRetries} attempts: Max retries reached`,
    };
  }

  /**
   * Disconnect from the Arduino
   */
  async disconnect(): Promise<{ success: boolean; message: string }> {
    if (!this.connected) {
      return { success: true, message: "Already disconnected" };
    }

    if (this.enableSimulation || !this.useRealArduino) {
      this.connected = false;
      this.sensorConnected = false;
      this.sensorMessage = "Disconnected from simulator";
      await storage.updateHardwareStatus({ 
        arduinoStatus: "disconnected", 
        fingerprintScannerConnected: false 
      });
      return { success: true, message: "Disconnected from fingerprint simulator" };
    }

    if (!this.serialPort) {
      this.connected = false;
      this.sensorConnected = false;
      this.sensorMessage = "Disconnected (serial port not initialized)";
      await storage.updateHardwareStatus({ 
        arduinoStatus: "disconnected", 
        fingerprintScannerConnected: false 
      });
      return { success: true, message: this.sensorMessage };
    }

    try {
      this.serialPort.close();
      this.connected = false;
      this.sensorConnected = false;
      this.sensorMessage = "Disconnected from Arduino";
      await storage.updateHardwareStatus({ 
        arduinoStatus: "disconnected", 
        fingerprintScannerConnected: false 
      });
      this.serialPort = null;
      return { success: true, message: "Disconnected from Arduino" };
    } catch (error) {
      this.sensorMessage = `Failed to disconnect: ${(error as Error).message}`;
      await storage.updateHardwareStatus({ 
        arduinoStatus: "error", 
        fingerprintScannerConnected: false 
      });
      return { success: false, message: this.sensorMessage };
    }
  }

  /**
   * Handle Arduino responses
   */
  private handleResponse(message: string): void {
    // Handle progress messages
    if (message.startsWith("DEBUG:") || 
        message.includes("PLACE_FINGER") || 
        message.includes("REMOVE_FINGER") || 
        message.includes("PLACE_AGAIN") || 
        message.includes("IMAGE_TAKEN") || 
        message === ".") {
      console.log(`Progress: ${message}`);
      return;
    }

    // Handle sensor status messages
    if (message.startsWith("SENSOR_STATUS:")) {
      this.sensorConnected = message === "SENSOR_STATUS:CONNECTED";
      this.sensorMessage = this.sensorConnected ? "Sensor connected" : "Sensor not found";
      storage.updateHardwareStatus({ 
        fingerprintScannerConnected: this.sensorConnected,
        lastActiveFingerprint: new Date()
      });
      if (this.responseHandler && message.startsWith("SENSOR_STATUS:")) {
        this.responseHandler(message);
      }
      return;
    }

    // Handle template count response
    if (message.startsWith("TEMPLATE_COUNT:")) {
      if (this.responseHandler) {
        this.responseHandler(message);
      }
      return;
    }

    // Handle enrollment errors or success
    if (message.startsWith("ENROLL:")) {
      if (this.responseHandler) {
        this.responseHandler(message);
        if (message.includes("SUCCESS") || message.includes("ERROR")) {
          this.responseHandler = null;
        }
      }
      return;
    }

    // Handle verify responses
    if (message.startsWith("VERIFY:")) {
      if (this.responseHandler) {
        this.responseHandler(message);
        if (message.includes("MATCH") || message.includes("NO_MATCH") || message.includes("ERROR")) {
          this.responseHandler = null;
        }
      }
      return;
    }

    // Handle delete responses
    if (message.startsWith("DELETE:")) {
      if (this.responseHandler) {
        this.responseHandler(message);
        if (message.includes("SUCCESS") || message.includes("ERROR")) {
          this.responseHandler = null;
        }
      }
      return;
    }

    // Pass message to response handler if available
    if (this.responseHandler) {
      this.responseHandler(message);
    } else {
      console.log("Unhandled Arduino message:", message);
    }
  }

  /**
   * Send a command to the Arduino
   */
  private async sendCommand(command: string, timeout = this.timeout): Promise<string> {
    if (this.enableSimulation) {
      console.log(`SIMULATION MODE: Command '${command}'`);
      return this.simulateCommand(command);
    }

    if (!this.useRealArduino) {
      console.log(`Simulating command '${command}' (hardware mode disabled)`);
      return this.simulateCommand(command);
    }

    if (!this.serialPort || !this.serialPort.isOpen) {
      throw new Error("Arduino is not connected");
    }

    // Clear response buffer before sending a new command
    this.responseBuffer = "";

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.responseHandler = null;
        reject(new Error(`Command '${command}' timed out after ${timeout}ms`));
      }, timeout);

      this.responseHandler = (response) => {
        // Check if this is the response we're waiting for
        if ((command === "GET_COUNT" && response.startsWith("TEMPLATE_COUNT:")) ||
            (command === "CHECK_SENSOR" && response.startsWith("SENSOR_STATUS:")) ||
            (command.startsWith("ENROLL:") && response.startsWith("ENROLL:") && (response.includes("SUCCESS") || response.includes("ERROR"))) ||
            (command === "VERIFY" && response.startsWith("VERIFY:") && (response.includes("MATCH") || response.includes("NO_MATCH") || response.includes("ERROR"))) ||
            (command.startsWith("DELETE:") && response.startsWith("DELETE:") && (response.includes("SUCCESS") || response.includes("ERROR")))) {
          clearTimeout(timeoutId);
          resolve(response);
        }
      };

      this.serialPort!.write(`${command}\n`, (err) => {
        if (err) {
          clearTimeout(timeoutId);
          this.responseHandler = null;
          reject(err);
        }
      });
    });
  }

  /**
   * Simulate Arduino responses
   */
  private async simulateCommand(command: string): Promise<string> {
    if (command === "CHECK_SENSOR") {
      return "SENSOR_STATUS:CONNECTED";
    }
    if (command === "GET_COUNT") {
      return "TEMPLATE_COUNT:0";
    }
    if (command.startsWith("ENROLL:")) {
      const id = parseInt(command.split(":")[1]);
      return `ENROLL:SUCCESS:${id}`;
    }
    if (command === "VERIFY") {
      return "VERIFY:NO_MATCH";
    }
    if (command.startsWith("DELETE:")) {
      return `DELETE:SUCCESS:${command.split(":")[1]}`;
    }
    return "ERROR:UNKNOWN_COMMAND";
  }

  /**
   * Get Arduino status
   */
  async getStatus(): Promise<{
    isConnected: boolean;
    message: string;
    isSensorConnected: boolean;
    sensorMessage: string;
  }> {
    if (this.enableSimulation) {
      return {
        isConnected: true,
        message: "SIMULATION MODE - no hardware required",
        isSensorConnected: true,
        sensorMessage: "SIMULATION MODE ACTIVE - place finger on the sensor graphic",
      };
    }

    if (this.useRealArduino) {
      if (this.serialPort && this.serialPort.isOpen) {
        return {
          isConnected: true,
          message: `R307 connected on port ${this.port}`,
          isSensorConnected: this.sensorConnected,
          sensorMessage: this.sensorConnected
            ? "R307 fingerprint sensor READY - place finger on sensor"
            : "R307 sensor not detected - check wiring",
        };
      } else {
        return {
          isConnected: false,
          message: `Unable to connect to Arduino on port ${this.port}`,
          isSensorConnected: false,
          sensorMessage: "Fingerprint sensor unavailable - check device connection",
        };
      }
    }

    return {
      isConnected: true,
      message: "SIMULATION MODE - hardware mode disabled",
      isSensorConnected: true,
      sensorMessage: "SIMULATION MODE ACTIVE - place finger on the sensor graphic",
    };
  }

  /**
   * Get the next available fingerprint ID
   */
  async getNextAvailableFingerprintId(): Promise<number> {
    try {
      if (!this.connected) {
        throw new Error("Arduino is not connected");
      }

      if (this.enableSimulation || !this.useRealArduino) {
        // In simulation mode, just return ID 1
        return 1;
      }

      // Get template count from Arduino
      const response = await this.sendCommand("GET_COUNT");
      if (response.startsWith("TEMPLATE_COUNT:")) {
        const countStr = response.split(":")[1].trim();
        const count = parseInt(countStr);
        
        if (isNaN(count)) {
          console.error(`Invalid template count: ${countStr}`);
          return 1;
        }
        
        console.log(`Template count: ${count}`);
        
        // If no templates, start from 1
        if (count === 0) {
          return 1;
        }
        
        // Find the next available ID (simple implementation - more sophisticated logic might be needed)
        // For simplicity, we'll use count + 1, ensuring it's within range (1-127)
        const nextId = Math.min(count + 1, 127);
        return nextId;
      } else {
        throw new Error(`Unexpected response: ${response}`);
      }
    } catch (error) {
      console.error("Error getting next fingerprint ID:", error);
      // Default to ID 1 if we can't determine the next available ID
      return 1;
    }
  }

  /**
   * Register a fingerprint ID for a user
   */
  async registerFingerprint(userId: number, fingerprintId: number): Promise<void> {
    this.fingerprintIdMap.set(userId, fingerprintId);
  }

  /**
   * Get the fingerprint ID for a user
   */
  async getFingerprintByUserId(userId: number): Promise<number | null> {
    return this.fingerprintIdMap.get(userId) || null;
  }

  /**
   * Enroll a fingerprint
   */
  async enrollFingerprint(userId: number): Promise<{
    success: boolean;
    fingerprintData?: string;
    fingerprintHash?: string;
    templateId?: number;
    message: string;
  }> {
    if (!this.connected) {
      return { success: false, message: "Arduino is not connected" };
    }

    try {
      // For simulation mode or hardware disabled, use simplified enrollment
      if (this.enableSimulation || !this.useRealArduino) {
        const templateId = 1; // Use fixed ID for simulation
        const fingerprintData = `fingerprint_template_${templateId}_${Date.now()}`;
        const fingerprintHash = createSaltedHash(fingerprintData);
        await this.registerFingerprint(userId, templateId);

        return {
          success: true,
          fingerprintData,
          fingerprintHash,
          templateId,
          message: "Fingerprint enrolled successfully (simulation)",
        };
      }

      // Real hardware enrollment
      const templateId = await this.getNextAvailableFingerprintId();
      console.log(`Enrolling fingerprint with template ID: ${templateId}`);
      
      const response = await this.sendCommand(`ENROLL:${templateId}`, 60000);
      console.log(`Enrollment response: ${response}`);

      if (response.startsWith("ENROLL:SUCCESS:")) {
        const id = parseInt(response.split(":")[2]);
        const fingerprintData = `fingerprint_template_${id}_${Date.now()}`;
        const fingerprintHash = createSaltedHash(fingerprintData);
        await this.registerFingerprint(userId, id);

        return {
          success: true,
          fingerprintData,
          fingerprintHash,
          templateId: id,
          message: "Fingerprint enrolled successfully",
        };
      } else if (response.startsWith("ENROLL:ERROR:")) {
        const errorCode = response.split(":")[2];
        let message = "Failed to enroll fingerprint: ";
        switch (errorCode) {
          case "INVALID_ID":
            message += "Template ID must be between 1 and 127";
            break;
          case "ERROR_IMAGING":
            message += "Failed to capture fingerprint image. Clean sensor and try again.";
            break;
          case "ERROR_TEMPLATE":
            message += "Failed to process first fingerprint image.";
            break;
          case "ERROR_TEMPLATE2":
            message += "Second fingerprint scan didn't match the first. Ensure consistent placement.";
            break;
          case "ERROR_MODEL":
            message += "Failed to create fingerprint model. Fingerprints may be too different.";
            break;
          case "ERROR_STORE":
            message += "Failed to store fingerprint template.";
            break;
          default:
            message += errorCode;
        }
        throw new Error(message);
      } else if (response === "ENROLL:ERROR_MODEL") {
        // Handle the specific ERROR_MODEL case that doesn't follow the standard format
        throw new Error("Failed to enroll fingerprint: Failed to create fingerprint model. Fingerprints may be too different.");
      } else {
        throw new Error(`Unknown enrollment error: ${response}`);
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      this.sensorMessage = `Enrollment error: ${(error as Error).message}`;
      await storage.updateHardwareStatus({ 
        fingerprintScannerConnected: this.sensorConnected 
      });
      return {
        success: false,
        message: this.sensorMessage,
      };
    }
  }

  /**
   * Verify a fingerprint
   */
  async verifyFingerprint(voterId?: string): Promise<{
    success: boolean;
    verified: boolean;
    fingerprintData?: string;
    templateId?: number;
    confidence?: number;
    message: string;
  }> {
    if (!this.connected) {
      return {
        success: false,
        verified: false,
        message: "Arduino is not connected",
      };
    }

    if (this.enableSimulation || !this.useRealArduino) {
      try {
        if (!voterId) {
          return {
            success: true,
            verified: true,
            templateId: 1,
            confidence: 95,
            message: "SIMULATION MODE: Default fingerprint verified",
          };
        }

        const user = await storage.getVoterByVoterId(voterId);
        if (!user) {
          return {
            success: true,
            verified: false,
            message: `SIMULATION MODE: No user found with voter ID ${voterId}`,
          };
        }

        if (user.fingerprintHash) {
          const fingerprintId = await this.getFingerprintByUserId(user.id);
          if (fingerprintId !== null) {
            return {
              success: true,
              verified: true,
              templateId: fingerprintId,
              confidence: 95,
              message: `SIMULATION MODE: Fingerprint verified for user ${user.id}`,
            };
          } else {
            const newId = await this.getNextAvailableFingerprintId();
            await this.registerFingerprint(user.id, newId);
            return {
              success: true,
              verified: true,
              templateId: newId,
              confidence: 95,
              message: `SIMULATION MODE: Registered and verified new fingerprint for user ${user.id}`,
            };
          }
        } else {
          return {
            success: true,
            verified: false,
            message: `SIMULATION MODE: User ${user.id} has no fingerprint registered`,
          };
        }
      } catch (error) {
        return {
          success: false,
          verified: false,
          message: `SIMULATION MODE: Error in verification: ${(error as Error).message}`,
        };
      }
    }

    try {
      const response = await this.sendCommand("VERIFY", 30000);

      if (response.startsWith("VERIFY:MATCH:")) {
        const id = parseInt(response.split(":")[2]);
        const fingerprintData = `fingerprint_template_${id}_verified`;

        return {
          success: true,
          verified: true,
          fingerprintData,
          templateId: id,
          confidence: 95,
          message: "Fingerprint verified successfully",
        };
      } else if (response === "VERIFY:NO_MATCH") {
        return {
          success: true,
          verified: false,
          confidence: 0,
          message: "No matching fingerprint found",
        };
      } else if (response.startsWith("VERIFY:ERROR:")) {
        const errorCode = response.split(":")[2];
        let message = "Failed to verify fingerprint: ";
        switch (errorCode) {
          case "ERROR_IMAGING":
            message += "Failed to capture fingerprint image. Clean sensor and try again.";
            break;
          case "ERROR_TEMPLATE":
            message += "Failed to process fingerprint image.";
            break;
          default:
            message += errorCode;
        }
        throw new Error(message);
      } else {
        throw new Error(`Unexpected response: ${response}`);
      }
    } catch (error) {
      console.error("Verification error:", error);
      this.sensorMessage = `Verification error: ${(error as Error).message}`;
      await storage.updateHardwareStatus({ 
        fingerprintScannerConnected: this.sensorConnected 
      });
      return {
        success: false,
        verified: false,
        message: this.sensorMessage,
      };
    }
  }

  /**
   * Delete a fingerprint
   */
  async deleteFingerprint(templateId: number): Promise<{ success: boolean; message: string }> {
    if (!this.connected) {
      return { success: false, message: "Arduino is not connected" };
    }

    try {
      if (templateId <= 0 || templateId > 127) {
        throw new Error("Invalid template ID: must be between 1 and 127");
      }

      const response = await this.sendCommand(`DELETE:${templateId}`);

      if (response.startsWith("DELETE:SUCCESS:")) {
        return {
          success: true,
          message: `Fingerprint template ${templateId} deleted successfully`,
        };
      } else if (response === "DELETE:ERROR") {
        throw new Error("Failed to delete template: Template not found or error occurred");
      } else {
        throw new Error(`Unexpected response: ${response}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      this.sensorMessage = `Delete error: ${(error as Error).message}`;
      await storage.updateHardwareStatus({ 
        fingerprintScannerConnected: this.sensorConnected 
      });
      return {
        success: false,
        message: this.sensorMessage,
      };
    }
  }

  /**
   * Calibrate sensor
   */
  async calibrateSensor(): Promise<{ success: boolean; message: string }> {
    if (!this.connected) {
      return { success: false, message: "Arduino is not connected" };
    }

    try {
      const response = await this.sendCommand("CHECK_SENSOR");
      if (response === "SENSOR_STATUS:CONNECTED") {
        this.sensorConnected = true;
        this.sensorMessage = "Sensor connected";
        await storage.updateHardwareStatus({ 
          fingerprintScannerConnected: true,
          lastActiveFingerprint: new Date()
        });
        return {
          success: true,
          message: "Fingerprint sensor calibrated successfully",
        };
      } else {
        throw new Error("Sensor not responding correctly to calibration");
      }
    } catch (error) {
      console.error("Calibration error:", error);
      this.sensorConnected = false;
      this.sensorMessage = `Calibration error: ${(error as Error).message}`;
      await storage.updateHardwareStatus({ 
        fingerprintScannerConnected: false 
      });
      return {
        success: false,
        message: this.sensorMessage,
      };
    }
  }
}

export const arduinoController = new ArduinoController();