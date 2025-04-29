# Arduino Fingerprint Integration Guide

This guide explains how to set up and use the R307 fingerprint sensor with the SecureVote system.

## Hardware Requirements

- Arduino Uno or compatible
- R307 Fingerprint Sensor Module
- Jumper wires
- USB cable for Arduino

## Arduino Sketch

Upload the following sketch to your Arduino board:

```cpp
#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

#define FINGERPRINT_RX 2
#define FINGERPRINT_TX 3

SoftwareSerial mySerial(FINGERPRINT_RX, FINGERPRINT_TX);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(9600);
  while (!Serial);
  
  finger.begin(57600);
  
  if (finger.verifyPassword()) {
    Serial.println("SENSOR_STATUS:CONNECTED");
  } else {
    Serial.println("SENSOR_STATUS:ERROR");
  }
}

void loop() {
  // Process commands from the serial port
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    processCommand(command);
  }
}

void processCommand(String command) {
  if (command == "CHECK_SENSOR") {
    if (finger.verifyPassword()) {
      Serial.println("SENSOR_STATUS:CONNECTED");
    } else {
      Serial.println("SENSOR_STATUS:ERROR");
    }
  }
  else if (command == "GET_COUNT") {
    uint8_t count = 0;
    finger.getTemplateCount(&count);
    Serial.print("TEMPLATE_COUNT:");
    Serial.println(count);
  }
  else if (command.startsWith("ENROLL:")) {
    int id = command.substring(7).toInt();
    if (id > 0 && id < 128) {
      Serial.println("ENROLL:PLACE_FINGER");
      enrollFingerprint(id);
    } else {
      Serial.println("ENROLL:ERROR:INVALID_ID");
    }
  }
  else if (command == "VERIFY") {
    Serial.println("VERIFY:PLACE_FINGER");
    verifyFingerprint();
  }
  else if (command.startsWith("DELETE:")) {
    int id = command.substring(7).toInt();
    if (id > 0 && id < 128) {
      if (finger.deleteModel(id) == FINGERPRINT_OK) {
        Serial.print("DELETE:SUCCESS:");
        Serial.println(id);
      } else {
        Serial.println("DELETE:ERROR");
      }
    } else {
      Serial.println("DELETE:ERROR");
    }
  }
  else {
    Serial.println("ERROR:UNKNOWN_COMMAND");
  }
}

void enrollFingerprint(int id) {
  int p = -1;
  // First image
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK:
        Serial.println("ENROLL:IMAGE_TAKEN");
        break;
      case FINGERPRINT_NOFINGER:
        // Wait for finger
        break;
      default:
        Serial.println("ENROLL:ERROR:IMAGE_FAILED");
        return;
    }
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("ENROLL:ERROR:CONVERSION_FAILED");
    return;
  }

  Serial.println("ENROLL:REMOVE_FINGER");
  delay(2000);
  
  // Second image
  Serial.println("ENROLL:PLACE_AGAIN");
  p = 0;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK:
        Serial.println("ENROLL:IMAGE_TAKEN");
        break;
      case FINGERPRINT_NOFINGER:
        // Wait for finger
        break;
      default:
        Serial.println("ENROLL:ERROR:IMAGE_FAILED");
        return;
    }
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("ENROLL:ERROR:CONVERSION_FAILED");
    return;
  }

  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println("ENROLL:ERROR:MODEL_FAILED");
    return;
  }

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.print("ENROLL:SUCCESS:");
    Serial.println(id);
  } else {
    Serial.println("ENROLL:ERROR:STORAGE_FAILED");
  }
}

void verifyFingerprint() {
  int p = -1;
  // Get image
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK:
        Serial.println("VERIFY:IMAGE_TAKEN");
        break;
      case FINGERPRINT_NOFINGER:
        // Wait for finger
        break;
      default:
        Serial.println("VERIFY:ERROR:IMAGE_FAILED");
        return;
    }
  }

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    Serial.println("VERIFY:ERROR:CONVERSION_FAILED");
    return;
  }

  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
    Serial.print("VERIFY:MATCH:");
    Serial.println(finger.fingerID);
  } else {
    Serial.println("VERIFY:NO_MATCH");
  }
}
```

## Hardware Connection

1. Connect the R307 fingerprint sensor to Arduino:
   - R307 RED wire -> Arduino 5V
   - R307 BLACK wire -> Arduino GND
   - R307 GREEN wire -> Arduino Pin 2 (RX)
   - R307 WHITE wire -> Arduino Pin 3 (TX)

2. Connect the Arduino to your computer via USB.

3. Upload the sketch above to your Arduino board.

## Software Configuration

### Using Simulation Mode (No Hardware)

By default, the system runs in simulation mode, allowing you to test without actual hardware.

To ensure simulation mode is enabled:

1. Set `ARDUINO_SIMULATION_MODE=true` in your `.env` file, or simply don't set it (defaults to true)

### Using Real Hardware

To use the real fingerprint sensor:

1. Connect the hardware as described above
2. Set `ARDUINO_SIMULATION_MODE=false` in your `.env` file
3. Configure the correct port:
   - For Windows: Set `ARDUINO_PORT=COM3` (or whatever COM port your Arduino uses)
   - For Linux: Set `ARDUINO_PORT=/dev/ttyUSB0` (or other device path)
   - For MacOS: Set `ARDUINO_PORT=/dev/cu.usbmodem****` (check in Arduino IDE)

## Testing the Connection

1. Start the application
2. Go to the Settings page
3. Navigate to the Arduino & Biometrics tab
4. Click "Connect to Arduino"

## Troubleshooting

1. **Can't Connect to Arduino**
   - Check if the Arduino is properly connected via USB
   - Verify the correct port is set in your `.env` file
   - Make sure no other program is using the Arduino's serial port
   - Try restarting both the Arduino and the application

2. **Fingerprint Sensor Not Recognized**
   - Verify the wiring connections
   - Try a different USB port
   - Check if the Arduino sketch is properly uploaded

3. **Simulation Mode Not Working**
   - Check your `.env` file settings
   - Restart the application after changing environment variables

## Environment Variables Reference

```
# Arduino Configuration
# Set to 'false' to use real hardware, 'true' for simulation
ARDUINO_SIMULATION_MODE=true

# Arduino Serial Port 
# Windows usually uses COM3, COM4, etc.
# Linux uses /dev/ttyUSB0 or similar
# MacOS uses /dev/cu.usbmodem****
ARDUINO_PORT=/dev/ttyUSB0

# Arduino Communication Settings
ARDUINO_BAUD_RATE=9600
ARDUINO_TIMEOUT=5000
```