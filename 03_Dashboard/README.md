# 03 — Dashboard

This project adds a real-time web dashboard to the proximity sensor system. The Arduino behavior is identical to **02_OpenLogic** — the same bridge sketch, the same wiring — but now you can see what's happening in a browser and adjust the thresholds on the fly.

## Arduino Setup

Use the exact same Arduino sketch and wiring from **02_OpenLogic**. If you haven't already uploaded the bridge sketch, go to the [02_OpenLogic README](../02_OpenLogic/README.md) and follow the **Hardware Setup** and **Uploading the Arduino Sketch** sections before continuing.

## Software Requirements

### Node.js

You need Node.js installed on your laptop. If you haven't installed it yet, follow the Node.js installation instructions in the [02_OpenLogic README](../02_OpenLogic/README.md#nodejs).

### A Web Browser

Any modern browser will work (Chrome, Firefox, Safari, Edge).

## Installation

1. Open a terminal:
   - **Windows:** Press the **Start menu**, search for **"Terminal"** or **"Command Prompt"**, and open it.
   - **Mac:** Press **Cmd + Space**, type **Terminal**, and press Enter.

2. Navigate to this project folder. Type the following command into the terminal and press Enter (adjust the path to match where you saved the workshop files):
   ```
   cd 03_Dashboard
   ```

3. Install the Node.js dependencies. Type the following command into the terminal and press Enter:
   ```
   npm install
   ```
   Wait for it to finish. This downloads the libraries the server needs (serial communication, web server, and WebSockets).

## Running the Dashboard

1. Make sure the Arduino is plugged into your laptop via USB and has the bridge sketch from 02_OpenLogic uploaded.

2. In your terminal (still inside the `03_Dashboard` folder), type the following command and press Enter:

   **Windows:**
   ```
   node server.js COM3
   ```

   **Mac:**
   ```
   node server.js /dev/tty.usbmodem1234
   ```

   > **How to find your port:** In the Arduino IDE, look under **Tools > Port**. The port listed there (e.g. `COM3` on Windows or `/dev/tty.usbmodem1234` on Mac) is what you type after `server.js` in the command above. Replace the example with your actual port name.

3. Open your web browser and go to the following address. Type it into the browser's address bar and press Enter:
   ```
   http://localhost:3000
   ```

You should see the dashboard with a live distance gauge, an LED indicator, and threshold sliders.

## What You'll See

- **Distance gauge** — a horizontal bar showing the current distance reading in real time. The colored zones show the threshold regions:
  - **Red zone** (close) — LED turns on when the reading enters this zone
  - **Yellow zone** (dead zone) — LED stays in its current state
  - **Green zone** (far) — LED turns off when the reading enters this zone
  - A **white marker** moves along the bar to show the current distance

- **LED indicator** — a circle that lights up with a glow effect when the LED on the Arduino is on, and goes dark when it's off.

- **Threshold sliders** — drag these to change the on/off distances in real time. The Arduino's behavior updates immediately — no need to restart anything.

## How It Works

This project adds two layers on top of 02_OpenLogic:

1. **HTTP server** — the Node.js server uses Express to serve the dashboard web page to your browser.

2. **WebSocket connection** — once the page loads, the browser opens a persistent WebSocket connection back to the server. This allows the server to push every distance reading and LED state change to the browser instantly, and allows the browser to send threshold changes back to the server.

```
┌──────────┐  USB Serial  ┌──────────────┐  WebSocket  ┌──────────────┐
│ Arduino  │ ───────────── │   Node.js    │ ──────────── │   Browser    │
│ (bridge) │               │   server     │              │  dashboard   │
└──────────┘               └──────────────┘              └──────────────┘
```
