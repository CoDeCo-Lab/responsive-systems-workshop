# Responsive Systems Workshop

A series of hands-on projects exploring how physical environments can sense and respond to people. Students build progressively — starting with a self-contained Arduino, then moving logic to a laptop, adding a live dashboard, and finally connecting all devices into a shared interactive system.

Authors: Jose Luis Garcia del Castillo y Lopez & Katarina Richter-Lunn
Code creation, editing, and documentation augmented by AI. 

## Projects

| # | Name | What It Does |
|---|------|-------------|
| 01 | [Closed Logic](01_ClosedLogic/) | Arduino reads a proximity sensor and controls an LED — all logic on the board |
| 02 | [Open Logic](02_OpenLogic/) | Same behavior, but the decision-making moves to a Node.js server on your laptop |
| 03 | [Dashboard](03_Dashboard/) | Adds a real-time browser dashboard with adjustable thresholds |
| 04 | [Shared Dashboard](04_SharedDashboard/) | All students connect to one central server — link any sensor to any LED via drag-and-drop |

## Hardware

- Arduino (e.g. Uno)
- HC-SR04 ultrasonic sensor
- LED + 220 Ω resistor
- Breadboard and jumper wires

The wiring stays the same across all projects. See [01_ClosedLogic](01_ClosedLogic/) for the full wiring table.

## Software

- [Arduino IDE](https://www.arduino.cc/en/software) (2.0+)
- [Node.js](https://nodejs.org/) LTS (required from project 02 onward)

Each project folder has its own README with detailed setup instructions.
