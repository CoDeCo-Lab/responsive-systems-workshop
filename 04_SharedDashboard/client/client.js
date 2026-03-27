// ============================================================
// Shared Dashboard — Client
// ============================================================
//
// This script runs on each student's laptop. It does two things:
//
//   1. Talks to the Arduino over USB serial (same bridge sketch
//      from 02_OpenLogic — reads distance, sends LED commands).
//
//   2. Connects to the instructor's central WebSocket server
//      and relays data in both directions:
//        - Sends distance readings TO the server.
//        - Receives LED commands FROM the server (triggered by
//          links created on the shared dashboard).
//
// The client itself has NO decision-making logic. All hysteresis
// and link logic lives on the central server.
//
// Usage:
//   node client.js <serial-port>
//
//   Examples:
//     node client.js COM3
//     node client.js /dev/tty.usbmodem1234
// ============================================================

// --- Device name ---
// *** CHANGE THIS to your name or your team's name! ***
// This identifies your device on the shared dashboard.
const DEVICE_NAME = "My Arduino";

// --- Server URL ---
// *** CHANGE THIS to the URL your instructor gives you! ***
// When the instructor is running the server on their laptop
// and you're on the same network, this will look something like:
//   ws://192.168.1.50:4000
// For testing locally, use:
//   ws://localhost:4000
const SERVER_URL = "ws://localhost:4000";

// --- Dependencies ---
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

// --- Read the serial port path from command-line arguments ---
const portPath = process.argv[2];

if (!portPath) {
  console.error("Error: No serial port specified.");
  console.error("Usage: node client.js <serial-port>");
  console.error("  Windows example:  node client.js COM3");
  console.error("  Mac example:      node client.js /dev/tty.usbmodem1234");
  process.exit(1);
}

// ============================================================
// 1. Serial communication with the Arduino
// ============================================================

// Open the serial connection (same as previous examples).
const serialPort = new SerialPort({
  path: portPath,
  baudRate: 9600,
});

// Parse incoming serial data line by line.
const parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));

serialPort.on("open", () => {
  console.log(`Connected to Arduino on ${portPath}`);
});

serialPort.on("error", (err) => {
  console.error(`Serial port error: ${err.message}`);
});

// ============================================================
// 2. WebSocket connection to the central server
// ============================================================

// The connection is wrapped in a function so we can reconnect
// automatically if the server isn't available yet or drops.
let ws = null;
const RECONNECT_INTERVAL = 10000; // 10 seconds between attempts

function connectToServer() {
  ws = new WebSocket(SERVER_URL);

  ws.on("open", () => {
    console.log(`Connected to server at ${SERVER_URL}`);
    console.log(`Registered as "${DEVICE_NAME}"\n`);

    // Tell the server who we are.
    ws.send(JSON.stringify({
      type: "register",
      deviceName: DEVICE_NAME,
    }));
  });

  ws.on("error", () => {
    // Errors are followed by a "close" event, so reconnect
    // logic is handled there — no need to duplicate it.
  });

  ws.on("close", () => {
    console.log(`Not connected to server. Retrying in ${RECONNECT_INTERVAL / 1000}s...`);
    setTimeout(connectToServer, RECONNECT_INTERVAL);
  });

  // --- Data flow: Server → Arduino ---
  // The server sends LED commands when a link on the dashboard
  // connects another device's distance reading to our LED.
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === "led") {
        serialPort.write(msg.state ? "1" : "0");
        console.log(`LED ${msg.state ? "ON" : "OFF"} (remote command)`);
      }
    } catch (err) {
      // Ignore malformed messages.
    }
  });
}

// Start the first connection attempt.
connectToServer();

// ============================================================
// 3. Data flow: Arduino → Server
// ============================================================

// Every time the Arduino sends a distance reading, forward it
// to the central server (if connected).
parser.on("data", (line) => {
  const distance = parseFloat(line.trim());
  if (isNaN(distance)) return;

  console.log(`Distance: ${distance.toFixed(2)} cm`);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "reading",
      distance: distance,
    }));
  }
});
