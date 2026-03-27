# 02 — Open Logic

This project demonstrates the same proximity-sensor-to-LED behavior from **01_ClosedLogic**, but with one key difference: the decision-making logic has been moved off the Arduino and onto your laptop.

The Arduino acts as a simple I/O bridge — it reads the sensor and controls the LED, but it doesn't decide *when* to turn the LED on or off. That logic now lives in a **Node.js server** that communicates with the Arduino over USB serial.

## Why This Matters

In **01_ClosedLogic**, the Arduino was a self-contained system: sensor input, logic, and actuator output all lived on the same board. That works well for simple rules, but what happens when the logic gets complex, needs to talk to the internet, or involves multiple devices?

By moving the logic to an external process, we open the door to:

- More complex decision-making (machine learning, database lookups, multi-sensor fusion)
- Coordination between multiple Arduinos
- Web dashboards and remote control
- Logging, analytics, and debugging with full programming-language tools

## Hardware Setup

**Use the exact same wiring from 01_ClosedLogic.** No changes needed.

| Component        | Arduino Pin |
|------------------|-------------|
| HC-SR04 Trig     | 12          |
| HC-SR04 Echo     | 11          |
| HC-SR04 VCC      | 5V          |
| HC-SR04 GND      | GND         |
| LED (+ via 220 Ω)| 3           |
| LED (−)          | GND         |

## Software Requirements

### Arduino IDE

You need the Arduino IDE to flash the bridge sketch onto the board.

- Download from [arduino.cc/en/software](https://www.arduino.cc/en/software)
- Version 2.0 or later recommended

### Node.js

Node.js runs the server on your laptop. Install the **LTS** (Long Term Support) version.

#### Windows

1. Go to [nodejs.org](https://nodejs.org/).
2. Download the **LTS** installer (`.msi`).
3. Run the installer — accept the defaults. Make sure **"Add to PATH"** is checked.
4. Close and reopen your terminal after installation.
5. Verify it worked. Open a terminal (**Start menu > search "Terminal"** or **"Command Prompt"**) and type each of these commands, pressing Enter after each one:
   ```
   node --version
   npm --version
   ```
   Each command should print a version number (e.g. `v20.11.0`). If you see an error like "command not found", try restarting your terminal.

#### Mac

**Option A — Homebrew (recommended):**

Homebrew is a package manager for macOS that makes it easy to install and update developer tools.

1. Open a terminal on your Mac: press **Cmd + Space** to open Spotlight, type **Terminal**, and press Enter.

2. Check if Homebrew is already installed. Type the following command into the terminal and press Enter:
   ```
   brew --version
   ```
   If this prints a version number (e.g. `Homebrew 4.2.0`), Homebrew is already installed — skip to step 4.

3. If the previous command showed an error like "command not found", you need to install Homebrew. Copy and paste this entire command into the terminal and press Enter:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   You will be asked for your Mac password — type it and press Enter (the characters won't appear on screen, that's normal). Follow the prompts until it finishes. **Important:** when the install completes, read the "Next steps" section it prints — on Apple Silicon Macs (M1/M2/M3/M4) you will need to copy and run two extra commands it gives you to add Homebrew to your PATH.

4. Install Node.js. Type the following command into the terminal and press Enter:
   ```
   brew install node
   ```
   Wait for it to finish downloading and installing.

5. Verify it worked. Type each of these commands into the terminal, pressing Enter after each one:
   ```
   node --version
   npm --version
   ```
   Each command should print a version number (e.g. `v20.11.0`). If you see an error, try closing and reopening the terminal first.

**Option B — Installer:**

1. Go to [nodejs.org](https://nodejs.org/).
2. Download the **LTS** installer (`.pkg`).
3. Run the installer — accept the defaults.
4. Verify it worked. Open a terminal (**Cmd + Space**, type **Terminal**, press Enter) and type each of these commands, pressing Enter after each one:
   ```
   node --version
   npm --version
   ```
   Each command should print a version number.

## Installation

1. Open a terminal:
   - **Windows:** Press the **Start menu**, search for **"Terminal"** or **"Command Prompt"**, and open it.
   - **Mac:** Press **Cmd + Space**, type **Terminal**, and press Enter.

2. Navigate to this project folder. Type the following command into the terminal and press Enter (adjust the path to match where you saved the workshop files):
   ```
   cd 02_OpenLogic
   ```

3. Install the Node.js dependencies. Type the following command into the terminal and press Enter:
   ```
   npm install
   ```
   This downloads the `serialport` library, which handles USB serial communication with the Arduino. You will see some progress output — wait for it to finish.

## Uploading the Arduino Sketch

1. Open `ProximitySensor_Bridge/ProximitySensor_Bridge.ino` in the Arduino IDE.
2. Select your board and port under **Tools**.
3. Click **Upload**.

This replaces the closed-logic sketch with a thin bridge that only reads the sensor and follows LED commands — it makes no decisions on its own.

## Running the Server

After uploading the Arduino sketch, go back to the terminal you used during installation (make sure you are still in the `02_OpenLogic` folder) and type one of the following commands, then press Enter:

**Windows:**
```
node server.js COM3
```

**Mac:**
```
node server.js /dev/tty.usbmodem1234
```

> **How to find your port:** In the Arduino IDE, look under **Tools > Port**. The port listed there (e.g. `COM3` on Windows or `/dev/tty.usbmodem1234` on Mac) is what you type after `server.js` in the command above. Replace the example with your actual port name.

You should see output like:

```
Connected to Arduino on COM3
Listening for distance readings...

Distance: 45.23 cm | LED: OFF
Distance: 44.87 cm | LED: OFF
Distance: 9.12 cm | LED: OFF
>>> LED ON
Distance: 8.55 cm | LED: ON
Distance: 31.40 cm | LED: ON
>>> LED OFF
Distance: 32.01 cm | LED: OFF
```

The LED turns on when an object comes within **10 cm** and doesn't turn off until the object moves beyond **30 cm** — identical behavior to 01_ClosedLogic, but the logic is running on your laptop.

## How It Works — The Communication Flow

```
┌──────────────┐         USB Serial (9600 baud)         ┌──────────────┐
│   Arduino    │  ── distance (e.g. "25.43\n") ──────>  │   Node.js    │
│   (bridge)   │  <── command ('1' = on, '0' = off) ──  │   (logic)    │
└──────────────┘                                        └──────────────┘
```

1. Every 100 ms, the Arduino reads the HC-SR04 sensor and sends the distance as a text line.
2. The Node.js server receives each line, parses the number, and applies the hysteresis logic.
3. When the LED state should change, the server sends `'1'` or `'0'` back to the Arduino.
4. The Arduino reads the command and sets the LED pin accordingly.
