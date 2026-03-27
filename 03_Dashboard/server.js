// ============================================================
// Dashboard Server
// ============================================================
//
// This server extends the 02_OpenLogic server with a web-based
// dashboard. It does three things:
//
//   1. Communicates with the Arduino over USB serial (same as 02)
//      — receives distance readings, sends LED on/off commands.
//
//   2. Serves a dashboard web page over HTTP so you can open it
//      in a browser.
//
//   3. Pushes live data to the dashboard (and receives threshold
//      changes back) using WebSockets — a persistent two-way
//      connection between the browser and this server.
//
// Usage:
//   node server.js <serial-port>
//
//   Examples:
//     node server.js COM3
//     node server.js /dev/tty.usbmodem1234
//
// Then open http://localhost:3000 in your browser.
// ============================================================

// --- Device name ---
// *** CHANGE THIS to your name or your team's name! ***
// This label identifies your device on the dashboard (and will
// be used in later examples when multiple devices connect to
// the same server).
const DEVICE_NAME = "My Arduino";

// --- Dependencies ---
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const express = require("express");
const path = require("path");
const { WebSocketServer } = require("ws");
const http = require("http");

// --- Read the serial port path from command-line arguments ---
const portPath = process.argv[2];

if (!portPath) {
  console.error("Error: No serial port specified.");
  console.error("Usage: node server.js <serial-port>");
  console.error("  Windows example:  node server.js COM3");
  console.error("  Mac example:      node server.js /dev/tty.usbmodem1234");
  process.exit(1);
}

// --- Hysteresis thresholds ---
// These start with the same defaults as 02_OpenLogic, but can
// now be changed at runtime from the dashboard. That's why they
// are declared with "let" instead of "const".
let onDistance = 10;   // cm — LED turns on below this
let offDistance = 30;  // cm — LED turns off above this

// --- LED state ---
let ledOn = false;

// ============================================================
// 1. Serial communication with the Arduino
// ============================================================

// Open the serial connection at 9600 baud (must match the Arduino sketch).
const serialPort = new SerialPort({
  path: portPath,
  baudRate: 9600,
});

// The Arduino sends one distance reading per line.
const parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));

// Handle incoming distance readings from the Arduino.
parser.on("data", (line) => {
  const distance = parseFloat(line.trim());
  if (isNaN(distance)) return;

  console.log(`Distance: ${distance.toFixed(2)} cm | LED: ${ledOn ? "ON" : "OFF"}`);

  // --- Hysteresis logic (identical to 02_OpenLogic) ---
  if (!ledOn && distance < onDistance) {
    serialPort.write("1");
    ledOn = true;
    console.log(">>> LED ON");
  } else if (ledOn && distance > offDistance) {
    serialPort.write("0");
    ledOn = false;
    console.log(">>> LED OFF");
  }

  // --- Broadcast to all connected dashboard clients ---
  // We send a JSON object with the current state so the
  // dashboard can update its visuals in real time.
  broadcastToClients({
    type: "reading",
    deviceName: DEVICE_NAME,
    distance: distance,
    ledOn: ledOn,
    onDistance: onDistance,
    offDistance: offDistance,
  });
});

serialPort.on("open", () => {
  console.log(`Connected to Arduino on ${portPath}`);
});

serialPort.on("error", (err) => {
  console.error(`Serial port error: ${err.message}`);
});

// ============================================================
// 2. HTTP server (serves the dashboard page)
// ============================================================

const app = express();

// Serve everything in the "public" folder as static files.
// When you open http://localhost:3000, Express will serve
// public/index.html automatically.
app.use(express.static(path.join(__dirname, "public")));

// Create an HTTP server from the Express app. We need the raw
// HTTP server object so we can attach the WebSocket server to it.
const server = http.createServer(app);

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
  console.log("Listening for distance readings...\n");
});

// ============================================================
// 3. WebSocket server (real-time browser communication)
// ============================================================

// Attach the WebSocket server to the same HTTP server.
// This means both the dashboard page (HTTP) and the live data
// stream (WebSocket) run on the same port.
const wss = new WebSocketServer({ server });

// When a new browser tab connects to the WebSocket:
wss.on("connection", (ws) => {
  console.log("Dashboard client connected");

  // Immediately send the current thresholds so the dashboard
  // can initialize its controls with the right values.
  ws.send(
    JSON.stringify({
      type: "init",
      deviceName: DEVICE_NAME,
      onDistance: onDistance,
      offDistance: offDistance,
      ledOn: ledOn,
    })
  );

  // Listen for messages from the dashboard (threshold changes).
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);

      // The dashboard sends a "thresholds" message when the
      // user adjusts the on/off distance values.
      if (message.type === "thresholds") {
        const newOn = parseFloat(message.onDistance);
        const newOff = parseFloat(message.offDistance);

        // Basic validation: on threshold must be less than off threshold,
        // and both must be positive numbers.
        if (!isNaN(newOn) && !isNaN(newOff) && newOn > 0 && newOff > newOn) {
          onDistance = newOn;
          offDistance = newOff;
          console.log(`Thresholds updated: ON < ${onDistance} cm, OFF > ${offDistance} cm`);

          // Broadcast the updated thresholds to all connected clients
          // so every open dashboard tab stays in sync.
          broadcastToClients({
            type: "thresholds",
            onDistance: onDistance,
            offDistance: offDistance,
          });
        }
      }
    } catch (err) {
      // Ignore malformed messages.
    }
  });

  ws.on("close", () => {
    console.log("Dashboard client disconnected");
  });
});

// --- Helper: send a message to every connected dashboard client ---
function broadcastToClients(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(json);
    }
  });
}
