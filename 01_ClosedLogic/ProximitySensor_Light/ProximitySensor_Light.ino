// ============================================================
// Proximity Sensor Light
// ============================================================
// This sketch uses an HC-SR04 ultrasonic sensor to measure
// distance. When an object is detected within a threshold
// distance, an LED turns on. When the object moves away,
// the LED turns off.
//
// How the HC-SR04 works:
//   1. The Arduino sends a short HIGH pulse on the Trig pin.
//   2. The sensor emits an ultrasonic burst and listens for
//      the echo bouncing back off a nearby object.
//   3. The sensor drives the Echo pin HIGH for a duration
//      proportional to the round-trip travel time of the sound.
//   4. We measure that duration and convert it to a distance
//      using the speed of sound (~343 m/s at room temperature).
// ============================================================

// --- Pin assignments ---
const int trigPin = 12;   // Trig pin on the HC-SR04 (output from Arduino)
const int echoPin = 11;   // Echo pin on the HC-SR04 (input to Arduino)
const int ledPin  = 3;    // LED anode, connected through a 220 Ω resistor

// --- Hysteresis thresholds ---
// Using two separate thresholds prevents the LED from flickering when
// the measured distance hovers near a single boundary. The LED turns on
// when an object moves closer than onDistance, and doesn't turn off
// until the object moves farther than offDistance.
const int onDistance  = 10;  // cm — LED turns on below this distance
const int offDistance = 30;  // cm — LED turns off above this distance

// --- State tracking ---
bool ledOn = false;        // Tracks whether the LED is currently on

// --- Measurement variables ---
long duration;             // Time (in microseconds) for the echo to return
float distance;            // Calculated distance in centimeters

void setup() {
  // Start serial communication so we can monitor distance readings
  // in the Arduino IDE's Serial Monitor.
  Serial.begin(9600);

  // Configure pin modes:
  //   - trigPin as OUTPUT because we send a pulse from it
  //   - echoPin as INPUT because we read the returning signal
  //   - ledPin as OUTPUT because we drive the LED
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  // --- Step 1: Send a trigger pulse ---
  // The HC-SR04 expects a clean HIGH pulse of at least 10 µs on Trig.
  // We first pull Trig LOW briefly to ensure a clean rising edge.
  digitalWrite(trigPin, LOW);
  delayMicroseconds(5);

  // Send the 10 µs HIGH pulse that tells the sensor to fire.
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // --- Step 2: Measure the echo duration ---
  // pulseIn() waits for the Echo pin to go HIGH, then measures how
  // long it stays HIGH (in microseconds). This duration represents
  // the round-trip time of the ultrasonic pulse.
  duration = pulseIn(echoPin, HIGH);

  // --- Step 3: Convert duration to distance ---
  // Speed of sound ≈ 343 m/s = 0.0343 cm/µs.
  // The pulse travels to the object and back, so we divide by 2
  // to get the one-way distance.
  distance = duration * 0.0343 / 2;

  // Print the distance to the Serial Monitor for debugging.
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  // --- Step 4: Control the LED using hysteresis ---
  // Instead of a single threshold (which causes flickering when the
  // distance hovers near the boundary), we use two thresholds:
  //   - Turn ON when the object comes closer than onDistance (10 cm)
  //   - Turn OFF when the object moves farther than offDistance (30 cm)
  // When the distance is between the two thresholds, the LED stays
  // in whatever state it was already in (the "dead zone").
  if (!ledOn && distance < onDistance) {
    digitalWrite(ledPin, HIGH);   // LED on — object entered close range
    ledOn = true;
  } else if (ledOn && distance > offDistance) {
    digitalWrite(ledPin, LOW);    // LED off — object left far range
    ledOn = false;
  }

  // Short delay before the next reading to keep the loop stable
  // and avoid flooding the Serial Monitor.
  delay(100);
}
