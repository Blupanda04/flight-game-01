// Ridge Runner — the aircraft: its state and how it flies.
// Pitch, throttle and bank are the only three things the pilot commands;
// everything else (speed, climb, turn, fuel, stall) follows from them.

import { PLANE, WORLD } from './config.js';
import { groundUnder, runwayAt } from './terrain.js';

// A fresh aircraft on the start runway, lined up down the valley.
export function newPlane() {
  return {
    x: 0, // lateral metres from the valley centre line
    y: PLANE.startAltitude, // altitude, metres
    z: 0, // forward metres from the start line
    heading: 0, // degrees, 0 = straight down the valley
    pitch: 0, // degrees, + = nose up
    roll: 0, // degrees, + = banked right
    speed: PLANE.startSpeed, // m/s
    throttle: 60, // percent
    fuel: PLANE.fuelCapacity,
    crashed: null, // null, or the reason the flight ended
    landed: false,
  };
}

// One physics step. dt is seconds. input is { pitchUp, pitchDown,
// throttleUp, throttleDown, turnLeft, turnRight }. wind is the lateral
// gust in m/s for this step. Returns nothing; mutates the plane.
export function updatePlane(p, input, wind, dt) {
  if (p.crashed || p.landed) return;

  // Throttle moves toward its target; speed chases the throttle.
  if (input.throttleUp) p.throttle = Math.min(100, p.throttle + PLANE.throttleStep * dt);
  if (input.throttleDown) p.throttle = Math.max(0, p.throttle - PLANE.throttleStep * dt);
  const targetSpeed = PLANE.minSpeed + (PLANE.maxSpeed - PLANE.minSpeed) * (p.throttle / 100);
  p.speed += (targetSpeed - p.speed) * Math.min(1, 0.9 * dt);

  // Pitch: the stick sets the target, the nose follows smoothly.
  const targetPitch = (input.pitchUp ? 14 : 0) + (input.pitchDown ? -12 : 0);
  p.pitch += (targetPitch - p.pitch) * Math.min(1, 3.2 * dt);

  // Roll: the stick banks the wing, and the bank turns the heading.
  const targetRoll = (input.turnRight ? PLANE.maxBank : 0) - (input.turnLeft ? PLANE.maxBank : 0);
  p.roll += (targetRoll - p.roll) * Math.min(1, 3.0 * dt);
  p.heading += (p.roll / PLANE.maxBank) * PLANE.turnRate * dt;
  if (p.heading > 180) p.heading -= 360;
  if (p.heading < -180) p.heading += 360;

  // Climb and sink: pitch trades speed for height; a slow wing sinks.
  const rad = (p.heading * Math.PI) / 180;
  const forward = p.speed * dt;
  p.z += Math.cos(rad) * forward;
  p.x += Math.sin(rad) * forward + wind * dt;
  const climb = Math.sin((p.pitch * Math.PI) / 180) * p.speed;
  const stallSink = p.speed < 38 ? (38 - p.speed) * 0.55 : 0;
  p.y += (climb - stallSink * 0.6) * dt;
  if (p.y < 0) p.y = 0;

  // Fuel: thirsty at full throttle, sipping at cruise.
  const burn = PLANE.fuelBurnCruise + (PLANE.fuelBurnFull - PLANE.fuelBurnCruise) * (p.throttle / 100);
  p.fuel = Math.max(0, p.fuel - burn * dt);
  if (p.fuel <= 0 && p.throttle > 0) p.throttle = 0;

  // The ground: touch it away from a runway and the flight is over.
  // On a runway, slow and gentle means a landing; fast or steep is a crash.
  const ground = groundUnder(p.x, p.z);
  if (p.y <= ground + 0.5) {
    const strip = runwayAt(p.x, p.z);
    const verticalSpeed = climb - stallSink * 0.6;
    if (strip && p.speed < 46 && verticalSpeed > -4) {
      p.y = ground;
      p.landed = true;
    } else {
      p.y = ground;
      p.crashed = strip ? 'Too fast for the runway' : 'Flew into the terrain';
    }
  }

  // The valley walls are a hard edge: drift too far sideways and the
  // rising ground does the rest, but say so plainly.
  if (Math.abs(p.x) > WORLD.valleyHalfWidth + 420) {
    p.crashed = 'Lost in the mountains';
  }
}

// Display conversions for the HUD: knots and feet, the way pilots read them.
export function knots(speedMs) {
  return Math.round(speedMs * 1.94384);
}
export function feet(altitudeM) {
  return Math.round(altitudeM * 3.28084);
}
