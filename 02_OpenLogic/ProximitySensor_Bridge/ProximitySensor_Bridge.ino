// ============================================================
// Proximity Sensor Bridge
// ============================================================
// This sketch turns the Arduino into a thin "bridge" between
// the physical hardware (sensor + LED) and a Node.js server
// running on your laptop.
//
// The Arduino's only responsibilities are:
//   1. Read the HC-SR04 ultrasonic sensor and send the
//      measured distance to the laptop over serial.
//   2. Listen for commands from the laptop telling it
//      whether to turn the LED on or off.
//
// All decision-making logic (the hysteresis thresholds, when
// to turn the LED on/off) lives in the Node.js server — NOT
// here. This demonstrates an "open logic" architecture where
// the microcontroller is just an I/O interface and an external
// device handles the brains.
//
// Serial protocol:
//   Arduino → Laptop:  sends the distance in cm as a text
//                       line, e.g. "25.43\n", every 100 ms.
//   Laptop → Arduino:  sends a single character:
//                       '1' = turn LED on
//                       '0' = turn LED off
// ============================================================

// --- Pin assignments (same wiring as 01_ClosedLogic) ---
const int trigPin = 12;   // HC-SR04 Trig pin
const int echoPin = 11;   // HC-SR04 Echo pin
const int ledPin  = 3;    // LED anode (through 220 Ω resistor)

void setup() {
  // Open serial communication at 9600 baud.
  // This is the channel through which we talk to the Node.js server.
  Serial.begin(9600);

  // Configure pin directions — identical to the closed-logic version.
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  // --- Step 1: Read the HC-SR04 sensor ---
  // This part is identical to 01_ClosedLogic. We send a 10 µs
  // trigger pulse and measure the echo return time.
  digitalWrite(trigPin, LOW);
  delayMicroseconds(5);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);

  // Convert the round-trip time to a one-way distance in cm.
  float distance = duration * 0.0343 / 2;

  // --- Step 2: Send the distance to the laptop ---
  // We print it as a plain-text line. The Node.js server will
  // parse each line as a floating-point number.
  Serial.println(distance);

  // --- Step 3: Check for LED commands from the laptop ---
  // If the Node.js server has sent any bytes, read them.
  // '1' means turn the LED on, '0' means turn it off.
  // We use a while loop to drain the buffer in case multiple
  // characters have arrived since our last check.
  while (Serial.available() > 0) {
    char command = Serial.read();

    if (command == '1') {
      digitalWrite(ledPin, HIGH);   // LED on
    } else if (command == '0') {
      digitalWrite(ledPin, LOW);    // LED off
    }
    // Any other characters are ignored.
  }

  // Wait before the next reading cycle.
  delay(100);
}
