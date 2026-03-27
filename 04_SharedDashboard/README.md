# 04 — Shared Dashboard

In this project, all students connect their Arduinos to a single central server run by the instructor. The instructor's dashboard shows every connected device in real time — distance readings and LED states — and can create **links** between devices: dragging a wire from one device's sensor to another device's LED makes the first device's proximity reading control the second device's light.

## Architecture

```
Student A's laptop               Student B's laptop
┌──────────┐  Serial  ┌────────┐  ┌────────┐  Serial  ┌──────────┐
│ Arduino  │ ──────── │ Client │  │ Client │ ──────── │ Arduino  │
└──────────┘          └───┬────┘  └───┬────┘          └──────────┘
                          │           │
                     WebSocket   WebSocket
                          │           │
                      ┌───┴───────────┴───┐
                      │   Central Server  │
                      │   (instructor)    │
                      └────────┬──────────┘
                               │
                          HTTP + WebSocket
                               │
                      ┌────────┴──────────┐
                      │    Dashboard      │
                      │    (browser)      │
                      └───────────────────┘
```

## Arduino Setup

Use the exact same Arduino bridge sketch and wiring from **02_OpenLogic**. If you haven't already uploaded the bridge sketch, follow the instructions in the [02_OpenLogic README](../02_OpenLogic/README.md).

## What's in This Folder

```
04_SharedDashboard/
  client/          ← runs on each student's laptop
    client.js
    package.json
  server/          ← runs on the instructor's machine (or cloud server)
    server.js
    public/
      index.html   ← the shared dashboard
    package.json
  README.md
```

---

## For Students: Running the Client

### 1. Install dependencies

Open a terminal:
- **Windows:** Press the **Start menu**, search for **"Terminal"** or **"Command Prompt"**, and open it.
- **Mac:** Press **Cmd + Space**, type **Terminal**, and press Enter.

Navigate to the client folder. Type the following command into the terminal and press Enter:
```
cd 04_SharedDashboard/client
```

Install the dependencies. Type the following command into the terminal and press Enter:
```
npm install
```

### 2. Set your device name and server URL

Open `client.js` in a text editor and find these two lines near the top:

```js
const DEVICE_NAME = "My Arduino";
```

Change `"My Arduino"` to your name or your team's name. **Make sure to keep the quotes.**

```js
const SERVER_URL = "ws://localhost:4000";
```

Change this to the URL your instructor gives you. It will look something like `ws://192.168.1.50:4000` or `ws://some-cloud-server.com`. **Make sure to keep the quotes.**

### 3. Run the client

Make sure your Arduino is plugged in with the bridge sketch uploaded, then type the following command into the terminal and press Enter:

**Windows:**
```
node client.js COM3
```

**Mac:**
```
node client.js /dev/tty.usbmodem1234
```

> **How to find your port:** In the Arduino IDE, look under **Tools > Port**. Replace the example above with your actual port name.

You should see output confirming the connection to both the Arduino and the server.

---

## For the Instructor: Running the Server

### 1. Install dependencies

Open a terminal and navigate to the server folder. Type the following commands into the terminal, pressing Enter after each one:
```
cd 04_SharedDashboard/server
npm install
```

### 2. Start the server

Type the following command into the terminal and press Enter:
```
node server.js
```

The server starts on port **4000**. Open a browser and go to:
```
http://localhost:4000
```

### 3. Share the server URL with students

Students need your machine's IP address to connect. To find it, open a terminal and type:

**Windows:**
```
ipconfig
```
Look for **IPv4 Address** under your active network adapter (e.g. `192.168.1.50`).

**Mac:**
```
ipconfig getifaddr en0
```

Give students the WebSocket URL: `ws://<your-ip>:4000` (e.g. `ws://192.168.1.50:4000`).

> **Important:** All devices must be on the same network (Wi-Fi or ethernet). If you're deploying to a cloud server instead, use that server's public URL.

---

## Using the Dashboard

Once devices are connected, the dashboard shows each one as a row with:

- **Device name** — whatever the student set in their `client.js`
- **Distance gauge** — a horizontal bar with a white marker showing the live reading, colored zones (red/yellow/green) showing the threshold regions, and two draggable slider handles for adjusting thresholds
- **Yellow triangle (output)** — represents this device's distance sensor. Dim when idle; lights up with a glow when the sensor detects something within the ON threshold, indicating the sensor is "emitting" a signal.
- **Blue triangle (input)** — represents this device's LED input. Dim when idle; lights up with a glow when the LED is on, indicating a signal is being received.
- **LED indicator** — glows red when the LED is on

### Adjusting Thresholds

Each device row has two slider handles on the distance gauge:

- **Red handle** — the ON threshold (LED turns on when distance drops below this)
- **Green handle** — the OFF threshold (LED turns off when distance rises above this)

Drag these handles to change the thresholds in real time. Small numbers below each handle show the current value in cm. Changes apply immediately to all outgoing links from that device.

### Linking Devices

To make one device's sensor control another device's LED:

1. **Click and drag** from a **yellow triangle** (the source device's sensor output).
2. A dashed wire follows your cursor.
3. **Drop it on a blue triangle** (the target device's LED input).
4. A solid wire appears, and the link is active.

You can also link a device to its own LED — drag from its yellow triangle to its own blue triangle.

When a link is active and the source device's sensor detects an object within the ON threshold, the target device's LED turns on. You'll see the yellow triangle light up on the source, and the blue triangle and LED light up on the target, as if electricity is flowing through the wire.

### Removing Links

**Click on any wire** to remove the link. The wire turns red on hover to show it's clickable.

### Multiple Links

- You can link one sensor to multiple LEDs (one-to-many).
- You can link multiple sensors to one LED (many-to-one) — the LED turns on if **any** source is active.

### Auto-Reconnect

If a student starts their client before the server is running, or if the connection drops, the client automatically retries every 10 seconds until it connects.