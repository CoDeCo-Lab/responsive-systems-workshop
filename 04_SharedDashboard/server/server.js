// ============================================================
// Shared Dashboard — Central Server
// ============================================================
//
// This is the instructor's server. It does three things:
//
//   1. Accepts WebSocket connections from student clients
//      (the Arduino bridge scripts running on their laptops).
//
//   2. Serves a dashboard web page where the instructor can
//      see all connected devices in real time.
//
//   3. Manages "links" between devices — when the instructor
//      drags a wire from one device's distance reading to
//      another device's LED, this server routes the signals.
//
// Each link has its own hysteresis state:
//   - When the source device's distance drops below 10 cm,
//     the target device's LED turns on.
//   - When it rises above 30 cm, the LED turns off.
//
// If multiple links target the same device, the LED turns on
// if ANY of those links is active (OR logic).
//
// Usage:
//   node server.js
//
// Then open http://localhost:4000 in your browser.
// ============================================================

// --- Dependencies ---
const express = require("express");
const path = require("path");
const http = require("http");
const { WebSocketServer } = require("ws");

// --- Default hysteresis thresholds for new links ---
const DEFAULT_ON_DISTANCE = 10;   // cm
const DEFAULT_OFF_DISTANCE = 30;  // cm

// ============================================================
// State
// ============================================================

// Connected Arduino devices.
// Map: deviceName → { ws, distance, ledOn }
const devices = new Map();

// Connected dashboard browsers.
// Set of WebSocket connections.
const dashboards = new Set();

// Per-device thresholds.
// Map: deviceName → { onDistance, offDistance }
// When a device's thresholds change, all outgoing links from that
// device are updated to match.
const deviceThresholds = new Map();

// Links between devices.
// Each link means: "source device's distance controls target device's LED."
// Array of: { source, target, onDistance, offDistance, active }
const links = [];

// ============================================================
// HTTP server (serves the dashboard page)
// ============================================================

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const PORT = 4000;

server.listen(PORT, () => {
  console.log(`Shared dashboard server running at http://localhost:${PORT}`);
  console.log("Waiting for device connections...\n");
});

// ============================================================
// WebSocket server
// ============================================================

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  // Each connection starts unidentified. It becomes either a
  // "device" (student client) or a "dashboard" (browser) based
  // on the first message it sends.
  let clientType = null;
  let deviceName = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      return; // Ignore malformed messages.
    }

    // --- Device registration ---
    // A student client sends this when it first connects.
    if (msg.type === "register") {
      clientType = "device";
      deviceName = msg.deviceName;

      devices.set(deviceName, {
        ws: ws,
        distance: null,
        ledOn: false,
      });

      console.log(`Device connected: "${deviceName}"`);

      // Tell all dashboards about the new device list.
      broadcastFullState();
    }

    // --- Dashboard registration ---
    // A browser sends this when the dashboard page loads.
    if (msg.type === "dashboard") {
      clientType = "dashboard";
      dashboards.add(ws);

      // Send the current state so the dashboard initializes correctly.
      ws.send(JSON.stringify({
        type: "state",
        devices: getDeviceList(),
        links: getLinksForDashboard(),
      }));

      console.log("Dashboard client connected");
    }

    // --- Distance reading from a device ---
    if (msg.type === "reading" && clientType === "device") {
      const device = devices.get(deviceName);
      if (!device) return;

      device.distance = msg.distance;

      // Check all links where this device is the source.
      // If any link's hysteresis state changes, update the target LED.
      processLinksForSource(deviceName);

      // Push the update to all dashboards.
      broadcastToDashboards({
        type: "update",
        name: deviceName,
        distance: msg.distance,
        ledOn: device.ledOn,
      });
    }

    // --- Create a link (from the dashboard) ---
    if (msg.type === "link" && clientType === "dashboard") {
      // Don't create duplicate links.
      const exists = links.some(
        (l) => l.source === msg.source && l.target === msg.target
      );
      if (exists) return;

      // Use the source device's current thresholds (or defaults).
      const th = deviceThresholds.get(msg.source) || {
        onDistance: DEFAULT_ON_DISTANCE,
        offDistance: DEFAULT_OFF_DISTANCE,
      };

      links.push({
        source: msg.source,
        target: msg.target,
        onDistance: th.onDistance,
        offDistance: th.offDistance,
        active: false,
      });

      console.log(`Link created: "${msg.source}" → "${msg.target}"`);

      // Immediately evaluate the new link against current readings.
      processLinksForSource(msg.source);

      // Tell all dashboards about the updated link list.
      broadcastToDashboards({
        type: "links",
        links: getLinksForDashboard(),
      });
    }

    // --- Remove a link (from the dashboard) ---
    if (msg.type === "unlink" && clientType === "dashboard") {
      const idx = links.findIndex(
        (l) => l.source === msg.source && l.target === msg.target
      );
      if (idx === -1) return;

      const targetName = links[idx].target;
      links.splice(idx, 1);

      console.log(`Link removed: "${msg.source}" → "${targetName}"`);

      // Recalculate the target's LED (another link might still be active).
      updateTargetLed(targetName);

      broadcastToDashboards({
        type: "links",
        links: getLinksForDashboard(),
      });
    }

    // --- Update thresholds for a device (from the dashboard) ---
    if (msg.type === "thresholds" && clientType === "dashboard") {
      const newOn = parseFloat(msg.onDistance);
      const newOff = parseFloat(msg.offDistance);

      if (isNaN(newOn) || isNaN(newOff) || newOn <= 0 || newOff <= newOn) return;

      // Store the new per-device thresholds.
      deviceThresholds.set(msg.device, {
        onDistance: newOn,
        offDistance: newOff,
      });

      // Update all outgoing links from this device to use the new values.
      for (const link of links) {
        if (link.source === msg.device) {
          link.onDistance = newOn;
          link.offDistance = newOff;
        }
      }

      console.log(`Thresholds for "${msg.device}": ON < ${newOn} cm, OFF > ${newOff} cm`);

      // Re-evaluate links with the new thresholds.
      processLinksForSource(msg.device);

      // Broadcast to all dashboards so sliders stay in sync.
      broadcastToDashboards({
        type: "thresholds",
        device: msg.device,
        onDistance: newOn,
        offDistance: newOff,
      });
    }
  });

  // --- Handle disconnection ---
  ws.on("close", () => {
    if (clientType === "device" && deviceName) {
      console.log(`Device disconnected: "${deviceName}"`);
      devices.delete(deviceName);
      deviceThresholds.delete(deviceName);

      // Remove all links involving this device.
      for (let i = links.length - 1; i >= 0; i--) {
        if (links[i].source === deviceName || links[i].target === deviceName) {
          const targetName = links[i].target;
          links.splice(i, 1);
          // If this device was a source, recalculate the target's LED.
          if (targetName !== deviceName) {
            updateTargetLed(targetName);
          }
        }
      }

      broadcastFullState();
    }

    if (clientType === "dashboard") {
      dashboards.delete(ws);
      console.log("Dashboard client disconnected");
    }
  });
});

// ============================================================
// Link processing logic
// ============================================================

// Evaluate all links where `sourceName` is the source device.
// Apply hysteresis and update target LEDs as needed.
function processLinksForSource(sourceName) {
  const source = devices.get(sourceName);
  if (!source || source.distance === null) return;

  for (const link of links) {
    if (link.source !== sourceName) continue;

    const prevActive = link.active;

    // Hysteresis: two separate thresholds for on and off.
    if (!link.active && source.distance < link.onDistance) {
      link.active = true;
    } else if (link.active && source.distance > link.offDistance) {
      link.active = false;
    }

    // If this link's state changed, recalculate the target's LED.
    if (link.active !== prevActive) {
      updateTargetLed(link.target);
    }
  }
}

// Recalculate whether a target device's LED should be on or off.
// The LED is on if ANY link targeting it is active (OR logic).
function updateTargetLed(targetName) {
  const target = devices.get(targetName);
  if (!target) return;

  const shouldBeOn = links.some(
    (l) => l.target === targetName && l.active
  );

  if (shouldBeOn !== target.ledOn) {
    target.ledOn = shouldBeOn;

    // Send the LED command to the student's client.
    if (target.ws.readyState === target.ws.OPEN) {
      target.ws.send(JSON.stringify({
        type: "led",
        state: shouldBeOn,
      }));
    }

    // Notify all dashboards.
    broadcastToDashboards({
      type: "update",
      name: targetName,
      distance: target.distance,
      ledOn: target.ledOn,
    });
  }
}

// ============================================================
// Helpers
// ============================================================

function getDeviceList() {
  const list = [];
  for (const [name, device] of devices) {
    const th = deviceThresholds.get(name) || {
      onDistance: DEFAULT_ON_DISTANCE,
      offDistance: DEFAULT_OFF_DISTANCE,
    };
    list.push({
      name: name,
      distance: device.distance,
      ledOn: device.ledOn,
      onDistance: th.onDistance,
      offDistance: th.offDistance,
    });
  }
  return list;
}

function getLinksForDashboard() {
  return links.map((l) => ({
    source: l.source,
    target: l.target,
  }));
}

function broadcastFullState() {
  broadcastToDashboards({
    type: "state",
    devices: getDeviceList(),
    links: getLinksForDashboard(),
  });
}

function broadcastToDashboards(data) {
  const json = JSON.stringify(data);
  for (const ws of dashboards) {
    if (ws.readyState === ws.OPEN) {
      ws.send(json);
    }
  }
}
