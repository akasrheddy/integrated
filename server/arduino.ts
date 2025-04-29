// Arduino and R307 Fingerprint Sensor integration
import { SerialPort, ReadlineParser } from "serialport";
import { createSaltedHash } from "../client/src/lib/utils";

// Global configuration for Arduino mode
export interface ArduinoConfig {
  useSimulation: boolean;
  port: string;
  baudRate: number;
  timeout: number;
}

// Default configuration
export const arduinoConfig: ArduinoConfig = {
  // Check environment variable - Set ARDUINO_SIMULATION_MODE=false to use real hardware
  useSimulation: process.env.ARDUINO_SIMULATION_MODE !== 'false',
  port: "/dev/ttyUSB0", // Linux default - change to COM port for Windows
  baudRate: 9600, // Match Arduino's Serial.begin(9600)
  timeout: 5000
};

/**
 * Controller for communicating with Arduino R307 fingerprint sensor
 * This implementation matches the Arduino code provided that uses Adafruit_Fingerprint library
 */
class ArduinoController {
  private serialPort: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private connected: boolean = false;
  private firmwareVersion: string = "2.1.4";
  
  // Connection settings
  private port: string = "/dev/ttyUSB0"; // Linux default
  // For Windows users: Update this to "COM3" or similar
  private baudRate: number = 9600; // Match Arduino's Serial.begin(9600)
  private timeout: number = 5000;
  
  // Sensor status
  private sensorStatus: "disconnected" | "ready" | "busy" | "error" = "disconnected";
  private lastError: string | null = null;
  private lastActive: Date | null = null;
  private responseQueue: Array<(response: string) => void> = [];
  
  // For simulation mode
  private useSimulation: boolean = true;
  private fingerprintTemplates: Map<number, { 
    template: string, 
    hash: string 
  }> = new Map();
  private nextTemplateId: number = 1;

  constructor(port?: string, baudRate?: number, timeout?: number) {
    // Load initial configuration from global settings
    this.useSimulation = arduinoConfig.useSimulation;
    this.port = port || arduinoConfig.port;
    this.baudRate = baudRate || arduinoConfig.baudRate;
    this.timeout = timeout || arduinoConfig.timeout;
  }
  
  /**
   * Set whether to use simulation mode or real hardware
   */
  setSimulationMode(useSimulation: boolean): void {
    // If changing modes and currently connected, disconnect first
    if (this.connected && this.useSimulation !== useSimulation) {
      this.disconnect().then(() => {
        this.useSimulation = useSimulation;
        // Update global config
        arduinoConfig.useSimulation = useSimulation;
      });
    } else {
      this.useSimulation = useSimulation;
      // Update global config
      arduinoConfig.useSimulation = useSimulation;
    }
  }

  /**
   * Connect to the Arduino via serial port
   */
  async connect(): Promise<{ connected: boolean; message: string }> {
    if (this.connected) {
      return { 
        connected: true, 
        message: this.useSimulation 
          ? "Already connected to simulator" 
          : `Already connected to Arduino on ${this.port}` 
      };
    }

    // If using simulation mode, we'll simulate the connection
    if (this.useSimulation) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate connection delay
      
      this.connected = true;
      this.sensorStatus = "ready";
      this.lastActive = new Date();
      
      console.log("Using fingerprint simulator mode");
      
      return { 
        connected: true, 
        message: "Connected to fingerprint simulator (SIMULATION MODE)" 
      };
    }

    // Real hardware mode
    try {
      // Create a connection to the serial port
      this.serialPort = new SerialPort({
        path: this.port,
        baudRate: this.baudRate,
        autoOpen: false
      });

      // Create a parser to read line-by-line
      this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));
      
      // Setup response handler
      this.parser.on('data', (data: string) => {
        const response = data.toString().trim();
        console.log(`Arduino response: ${response}`);
        
        // Process response
        if (this.responseQueue.length > 0) {
          const handler = this.responseQueue.shift();
          if (handler) {
            handler(response);
          }
        }
        
        // Update status based on responses
        if (response.startsWith('SENSOR_STATUS:')) {
          const status = response.substring('SENSOR_STATUS:'.length);
          if (status === 'CONNECTED') {
            this.sensorStatus = 'ready';
          } else {
            this.sensorStatus = 'error';
          }
        } else if (response.startsWith('ERROR:')) {
          this.lastError = response.substring('ERROR:'.length);
          this.sensorStatus = 'error';
        }
      });

      // Open the connection
      return new Promise((resolve, reject) => {
        if (!this.serialPort) {
          reject(new Error('Serial port not initialized'));
          return;
        }

        this.serialPort.open((err) => {
          if (err) {
            this.connected = false;
            this.sensorStatus = "error";
            this.lastError = err.message;
            resolve({ 
              connected: false, 
              message: `Failed to connect: ${err.message}` 
            });
            return;
          }

          // Check sensor status
          this.sendCommand('CHECK_SENSOR')
            .then((response) => {
              if (response.startsWith('SENSOR_STATUS:CONNECTED')) {
                this.connected = true;
                this.sensorStatus = "ready";
                this.lastActive = new Date();
                resolve({ 
                  connected: true, 
                  message: `Connected to Arduino on ${this.port} at ${this.baudRate} baud` 
                });
              } else {
                this.connected = false;
                this.sensorStatus = "error";
                this.lastError = "Fingerprint sensor not connected";
                resolve({ 
                  connected: false, 
                  message: `Failed to connect: Fingerprint sensor not detected` 
                });
              }
            })
            .catch((error) => {
              this.connected = false;
              this.sensorStatus = "error";
              this.lastError = error.message;
              resolve({ 
                connected: false, 
                message: `Failed to connect: ${error.message}` 
              });
            });
        });
      });
    } catch (error) {
      this.connected = false;
      this.sensorStatus = "error";
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      return { 
        connected: false, 
        message: `Failed to connect: ${this.lastError}` 
      };
    }
  }

  /**
   * Disconnect from the Arduino
   */
  async disconnect(): Promise<{ success: boolean; message: string }> {
    if (!this.connected) {
      return { 
        success: true, 
        message: "Already disconnected" 
      };
    }

    // If in simulation mode, just simulate disconnection
    if (this.useSimulation) {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate disconnect delay
      
      this.connected = false;
      this.sensorStatus = "disconnected";
      
      return { 
        success: true, 
        message: "Disconnected from fingerprint simulator" 
      };
    }

    // Handle real hardware disconnect
    if (!this.serialPort) {
      this.connected = false;
      this.sensorStatus = "disconnected";
      return { 
        success: true, 
        message: "Disconnected (serial port was not initialized)" 
      };
    }

    try {
      return new Promise((resolve) => {
        if (!this.serialPort) {
          resolve({ 
            success: false, 
            message: "Serial port not initialized" 
          });
          return;
        }

        this.serialPort.close((err) => {
          if (err) {
            this.lastError = err.message;
            resolve({ 
              success: false, 
              message: `Failed to disconnect: ${err.message}` 
            });
            return;
          }

          this.connected = false;
          this.sensorStatus = "disconnected";
          this.serialPort = null;
          this.parser = null;
          
          resolve({ 
            success: true, 
            message: "Disconnected from Arduino" 
          });
        });
      });
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      return { 
        success: false, 
        message: `Failed to disconnect: ${this.lastError}` 
      };
    }
  }

  /**
   * Send a command to Arduino and wait for response
   * In simulation mode, it simulates Arduino responses
   */
  private async sendCommand(command: string, timeout = this.timeout): Promise<string> {
    if (!this.connected) {
      throw new Error("Arduino is not connected");
    }

    // Simulation mode
    if (this.useSimulation) {
      return this.simulateCommand(command, timeout);
    }

    // Real hardware mode
    if (!this.serialPort) {
      throw new Error("Serial port not initialized");
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Command timed out"));
      }, timeout);

      this.responseQueue.push((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      this.serialPort!.write(`${command}\n`, (err) => {
        if (err) {
          clearTimeout(timeoutId);
          this.responseQueue.pop(); // Remove the queued handler
          reject(err);
        }
      });
    });
  }

  /**
   * Simulate Arduino responses for testing without hardware
   */
  private async simulateCommand(command: string, timeout: number): Promise<string> {
    console.log(`[Simulator] Received command: ${command}`);
    
    // Add random delay to simulate processing time
    const delay = Math.floor(Math.random() * 500) + 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (command === 'CHECK_SENSOR') {
      return 'SENSOR_STATUS:CONNECTED';
    }
    
    if (command === 'GET_COUNT') {
      return `TEMPLATE_COUNT:${this.fingerprintTemplates.size}`;
    }
    
    if (command.startsWith('ENROLL:')) {
      // Simulate the enrollment process with delays
      const enrollId = parseInt(command.split(':')[1]);
      
      // Simulate first finger placement
      console.log('[Simulator] ENROLL:PLACE_FINGER');
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('[Simulator] ENROLL:IMAGE_TAKEN');
      
      // Simulate finger removal
      console.log('[Simulator] ENROLL:REMOVE_FINGER');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate second finger placement
      console.log('[Simulator] ENROLL:PLACE_AGAIN');
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('[Simulator] ENROLL:IMAGE_TAKEN');
      
      // Store template in our simulation map
      const templateData = `fingerprint_template_${enrollId}_${Date.now()}`;
      const templateHash = createSaltedHash(templateData);
      this.fingerprintTemplates.set(enrollId, {
        template: templateData,
        hash: templateHash
      });
      
      this.nextTemplateId = Math.max(this.nextTemplateId, enrollId + 1);
      
      return `ENROLL:SUCCESS:${enrollId}`;
    }
    
    if (command === 'VERIFY') {
      // If we have no templates, always return no match
      if (this.fingerprintTemplates.size === 0) {
        console.log('[Simulator] VERIFY:PLACE_FINGER');
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('[Simulator] VERIFY:IMAGE_TAKEN');
        return 'VERIFY:NO_MATCH';
      }
      
      // Simulate fingerprint scan
      console.log('[Simulator] VERIFY:PLACE_FINGER');
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('[Simulator] VERIFY:IMAGE_TAKEN');
      
      // Get a random template for simulation
      const templateIds = Array.from(this.fingerprintTemplates.keys());
      const randomId = templateIds[Math.floor(Math.random() * templateIds.length)];
      
      // 80% chance of success in simulation
      const success = Math.random() < 0.8;
      
      return success ? `VERIFY:MATCH:${randomId}` : 'VERIFY:NO_MATCH';
    }
    
    if (command.startsWith('DELETE:')) {
      const deleteId = parseInt(command.split(':')[1]);
      
      if (this.fingerprintTemplates.has(deleteId)) {
        this.fingerprintTemplates.delete(deleteId);
        return `DELETE:SUCCESS:${deleteId}`;
      } else {
        return 'DELETE:ERROR';
      }
    }
    
    // Default unknown command response
    return 'ERROR:UNKNOWN_COMMAND';
  }

  /**
   * Enroll a new fingerprint
   */
  async enrollFingerprint(): Promise<{ 
    success: boolean;
    fingerprintData?: string;
    fingerprintHash?: string;
    templateId?: number;
    message: string;
  }> {
    if (!this.connected) {
      return { 
        success: false, 
        message: "Arduino is not connected" 
      };
    }

    try {
      this.sensorStatus = "busy";
      
      // Find the next available ID
      const templateId = await this.getNextAvailableId();
      
      // Start enrollment process
      const enrollResponse = await this.sendCommand(`ENROLL:${templateId}`, 60000);
      
      // Process enrollment stages - progress messages will be handled by the responseQueue
      if (enrollResponse.startsWith('ENROLL:SUCCESS:')) {
        const id = parseInt(enrollResponse.substring('ENROLL:SUCCESS:'.length));
        
        // Generate a hash from the ID
        const fingerprintData = `fingerprint_template_${id}_${Date.now()}`;
        const fingerprintHash = createSaltedHash(fingerprintData);
        
        this.sensorStatus = "ready";
        this.lastActive = new Date();
        
        return {
          success: true,
          fingerprintData,
          fingerprintHash,
          templateId: id,
          message: "Fingerprint enrolled successfully"
        };
      } else if (enrollResponse.startsWith('ENROLL:ERROR:')) {
        const errorMsg = enrollResponse.substring('ENROLL:ERROR:'.length);
        throw new Error(errorMsg);
      } else {
        throw new Error("Unexpected enrollment response");
      }
    } catch (error) {
      this.sensorStatus = "error";
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      return {
        success: false,
        message: `Failed to enroll fingerprint: ${this.lastError}`
      };
    }
  }

  /**
   * Get the next available template ID
   */
  private async getNextAvailableId(): Promise<number> {
    try {
      const response = await this.sendCommand('GET_COUNT');
      
      if (response.startsWith('TEMPLATE_COUNT:')) {
        const count = parseInt(response.substring('TEMPLATE_COUNT:'.length));
        // Start from ID 1, or use the count + 1 if there are existing templates
        return count + 1 > 0 ? count + 1 : 1;
      } else if (response === 'TEMPLATE_COUNT:ERROR') {
        return 1; // Default to 1 if count fails
      } else {
        return 1;
      }
    } catch (error) {
      return 1; // Default to ID 1 if there's an error
    }
  }

  /**
   * Verify a fingerprint against stored templates
   */
  async verifyFingerprint(): Promise<{
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
        message: "Arduino is not connected" 
      };
    }

    try {
      this.sensorStatus = "busy";
      
      // Start verification process
      const verifyResponse = await this.sendCommand('VERIFY', 60000);
      
      if (verifyResponse.startsWith('VERIFY:MATCH:')) {
        const id = parseInt(verifyResponse.substring('VERIFY:MATCH:'.length));
        
        // Generate data for the matched fingerprint
        const fingerprintData = `fingerprint_template_${id}_verified`;
        
        this.sensorStatus = "ready";
        this.lastActive = new Date();
        
        return {
          success: true,
          verified: true,
          fingerprintData,
          templateId: id,
          confidence: 95, // Default confidence for matches
          message: "Fingerprint verified successfully"
        };
      } else if (verifyResponse === 'VERIFY:NO_MATCH') {
        this.sensorStatus = "ready";
        this.lastActive = new Date();
        
        return {
          success: true,
          verified: false,
          confidence: 0,
          message: "No matching fingerprint found"
        };
      } else if (verifyResponse.startsWith('VERIFY:ERROR')) {
        const errorMsg = verifyResponse.includes(':') 
          ? verifyResponse.split(':')[2] 
          : "Unknown verification error";
        throw new Error(errorMsg);
      } else {
        throw new Error("Unexpected verification response");
      }
    } catch (error) {
      this.sensorStatus = "error";
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      return {
        success: false,
        verified: false,
        message: `Failed to verify fingerprint: ${this.lastError}`
      };
    }
  }

  /**
   * Delete a fingerprint template
   */
  async deleteFingerprint(templateId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.connected) {
      return { 
        success: false, 
        message: "Arduino is not connected" 
      };
    }

    try {
      this.sensorStatus = "busy";
      
      if (templateId <= 0 || templateId > 127) {
        return {
          success: false,
          message: "Invalid template ID: must be between 1 and 127"
        };
      }
      
      const deleteResponse = await this.sendCommand(`DELETE:${templateId}`);
      
      if (deleteResponse.startsWith('DELETE:SUCCESS:')) {
        this.sensorStatus = "ready";
        this.lastActive = new Date();
        
        return {
          success: true,
          message: `Fingerprint template ${templateId} deleted successfully`
        };
      } else if (deleteResponse === 'DELETE:ERROR') {
        throw new Error("Failed to delete template");
      } else {
        throw new Error("Unexpected delete response");
      }
    } catch (error) {
      this.sensorStatus = "error";
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      return {
        success: false,
        message: `Failed to delete fingerprint: ${this.lastError}`
      };
    }
  }

  /**
   * Calibrate the fingerprint sensor
   */
  async calibrateSensor(): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.connected) {
      return { 
        success: false, 
        message: "Arduino is not connected" 
      };
    }

    try {
      this.sensorStatus = "busy";
      
      // Check the sensor status as a form of calibration
      const response = await this.sendCommand('CHECK_SENSOR');
      
      if (response.startsWith('SENSOR_STATUS:CONNECTED')) {
        this.sensorStatus = "ready";
        this.lastActive = new Date();
        
        return {
          success: true,
          message: "Fingerprint sensor calibrated successfully"
        };
      } else {
        throw new Error("Sensor not responding correctly to calibration");
      }
    } catch (error) {
      this.sensorStatus = "error";
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      return {
        success: false,
        message: `Failed to calibrate sensor: ${this.lastError}`
      };
    }
  }

  /**
   * Get the current status of the Arduino and fingerprint sensor
   */
  getStatus(): {
    connected: boolean;
    firmwareVersion: string;
    sensorStatus: string;
    lastError: string | null;
    lastActive: Date | null;
    port: string;
    baudRate: number;
    simulationMode: boolean;
    enrolledTemplates: number;
  } {
    return {
      connected: this.connected,
      firmwareVersion: this.firmwareVersion,
      sensorStatus: this.sensorStatus,
      lastError: this.lastError,
      lastActive: this.lastActive,
      port: this.port,
      baudRate: this.baudRate,
      simulationMode: this.useSimulation,
      enrolledTemplates: this.fingerprintTemplates.size
    };
  }

  /**
   * Modify the connection settings
   */
  updateSettings(settings: { port?: string; baudRate?: number; timeout?: number }): void {
    const needsReconnect = 
      (settings.port && settings.port !== this.port) || 
      (settings.baudRate && settings.baudRate !== this.baudRate);
    
    if (settings.port) this.port = settings.port;
    if (settings.baudRate) this.baudRate = settings.baudRate;
    if (settings.timeout) this.timeout = settings.timeout;
    
    // If connected and settings changed, we should disconnect and reconnect
    if (this.connected && needsReconnect) {
      this.disconnect().then(() => {
        this.connect();
      }).catch(err => {
        console.error("Error during reconnect:", err);
      });
    }
  }
}

// Export a singleton instance
export const arduinoController = new ArduinoController();

// Add default settings for Windows users
// Uncomment and modify the following line for Windows:
// arduinoController.updateSettings({ port: "COM3" }); // Change COM3 to your Arduino port
