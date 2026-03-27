// ============================================================
// Open Logic — Node.js Server
// ============================================================
//
// This server is the "brain" of the system. It communicates
// with an Arduino board over a USB serial connection and
// implements the exact same proximity-sensor-to-LED behavior
// as the 01_ClosedLogic example — but the decision-making
// happens here on the laptop, not on the Arduino.
//
// How it works:
//   1. The Arduino continuously reads its HC-SR04 ultrasonic
//      sensor and sends the measured distance (in cm) to this
//      server as text lines over serial.
//   2. This server applies hysteresis logic:
//        - Turn the LED ON  when distance drops below 10 cm.
//        - Turn the LED OFF when distance rises above 30 cm.
//        - In between, keep the LED in its current state.
//   3. When the decision changes, the server sends a single
//      character back to the Arduino: '1' for on, '0' for off.
//
// Usage:
//   node server.js <serial-port>
//
//   Examples:
//     node server.js COM3              (Windows)
//     node server.js /dev/tty.usbmodem1234   (Mac)
//
// The serial port name must match the port your Arduino is
// connected to. You can find this in the Arduino IDE under
// Tools > Port.
// ============================================================

// --- Dependencies ---
// SerialPort: handles the low-level USB serial communication.
// ReadlineParser: splits the incoming byte stream into lines
//   so we receive one complete distance reading at a time.
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

// --- Read the serial port path from command-line arguments ---
// process.argv[0] = 'node', process.argv[1] = 'server.js',
// process.argv[2] = the port the user provides.
const portPath = process.argv[2];

if (!portPath) {
  console.error("Error: No serial port specified.");
  console.error("Usage: node server.js <serial-port>");
  console.error("  Windows example:  node server.js COM3");
  console.error("  Mac example:      node server.js /dev/tty.usbmodem1234");
  process.exit(1);
}

// --- Hysteresis thresholds ---
// These match the values from 01_ClosedLogic so the behavior
// is identical. The LED turns on when something is closer than
// onDistance, and doesn't turn off until it moves farther than
// offDistance. The gap between the two prevents flickering.
const onDistance = 10;   // cm — LED turns on below this
const offDistance = 30;  // cm — LED turns off above this

// --- LED state ---
// We track whether the LED is currently on so we know which
// threshold to compare against (hysteresis requires memory of
// the previous state).
let ledOn = false;

// --- Open the serial connection to the Arduino ---
// The baud rate (9600) must match the value in the Arduino sketch.
const port = new SerialPort({
  path: portPath,
  baudRate: 9600,
});

// --- Set up the line parser ---
// The Arduino sends one distance reading per line (ending with \n).
// The ReadlineParser collects bytes until it sees a newline, then
// emits the complete line as a 'data' event.
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

// --- Handle incoming distance readings ---
parser.on("data", (line) => {
  // Parse the incoming line as a floating-point number.
  // If the line is garbled (e.g. during initial serial sync),
  // parseFloat will return NaN and we skip it.
  const distance = parseFloat(line.trim());

  if (isNaN(distance)) {
    return;
  }

  // Log every reading so students can watch the values in real time.
  console.log(`Distance: ${distance.toFixed(2)} cm | LED: ${ledOn ? "ON" : "OFF"}`);

  // --- Hysteresis logic ---
  // This is the core decision-making that used to live on the Arduino.
  // The two-threshold approach avoids rapid toggling near a boundary.
  if (!ledOn && distance < onDistance) {
    // Object just entered close range — turn the LED on.
    port.write("1");
    ledOn = true;
    console.log(">>> LED ON");
  } else if (ledOn && distance > offDistance) {
    // Object just left far range — turn the LED off.
    port.write("0");
    ledOn = false;
    console.log(">>> LED OFF");
  }
});

// --- Connection lifecycle events ---

port.on("open", () => {
  console.log(`Connected to Arduino on ${portPath}`);
  console.log("Listening for distance readings...\n");
});

port.on("error", (err) => {
  console.error(`Serial port error: ${err.message}`);
});

port.on("close", () => {
  console.log("Serial port closed.");
});
