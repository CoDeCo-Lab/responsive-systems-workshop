# 01 — Closed Logic

A basic Arduino project: an LED turns on when something is close to an ultrasonic sensor, and turns off when nothing is detected.

All the logic of this setup is built into the Arduino code; no external communication or logic. 

## Software Requirements

- **Arduino IDE** (2.0 or later) — download from [arduino.cc/en/software](https://www.arduino.cc/en/software)
- **USB driver** for your Arduino board (most boards work out of the box; some clones using a CH340 chip may need a separate driver)
- No additional libraries are required — this sketch uses only built-in Arduino functions.

## Components

- Arduino board (e.g. Uno)
- HC-SR04 ultrasonic proximity sensor
- LED
- 220 Ω resistor (for the LED)
- Breadboard and jumper wires

## Wiring

| Component       | Arduino Pin |
|-----------------|-------------|
| HC-SR04 Trig    | 12          |
| HC-SR04 Echo    | 11          |
| HC-SR04 VCC     | 5V          |
| HC-SR04 GND     | GND         |
| LED (+ via 220Ω)| 3           |
| LED (−)         | GND         |

## How It Works

1. The Arduino sends a pulse from the Trig pin and measures how long it takes for the echo to return.
2. The round-trip time is converted to a distance in centimeters.
3. The LED uses hysteresis (two thresholds) to avoid flickering: it turns on when an object comes within 10 cm, and doesn't turn off until the object moves beyond 30 cm. In between, the LED stays in its current state.
4. The measured distance is also printed to the Serial Monitor at 9600 baud.

## Upload

1. Open `ProximitySensor_Light.ino` in the Arduino IDE.
2. Select your board and port under **Tools**.
3. Click **Upload**.
4. Open the Serial Monitor (9600 baud) to see distance readings.
