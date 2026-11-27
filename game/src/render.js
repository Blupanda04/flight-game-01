// Ridge Runner — everything the pilot sees: sky, valley, rings, the
// aircraft, the instruments, and the title, pause and end screens.
// The world is drawn in a chase view: the plane sits centre-frame, the
// valley rushes toward it, and the horizon rolls with the bank.

import { VIEW, SKY, WORLD } from './config.js';
import { feet, knots } from './plane.js';
import { riverX, roadX, fieldShade, terrainHeight, START_RUNWAY, FAR_RUNWAY } from './terrain.js';
import { makeRng } from './random.js';

// Clouds: fixed world positions from a seed, so the sky never reshuffles.
const cloudRng = makeRng(777);
const CLOUDS = [];
for (let i = 0; i < 16; i++) {
  CLOUDS.push({
    x: (cloudRng() * 2 - 1) * 700,
    y: 380 + cloudRng() * 320,
    z: cloudRng() * 5200,
    w: 120 + cloudRng() * 180,
  });
}

// Project a world point (x, y, z) to screen pixels. dz is metres ahead
// of the plane; points far ahead crowd toward the horizon line.
function project(plane, horizonY, wx, wy, wz) {
  const dz = Math.max(8, wz - plane.z);
  const depth = 170 / (dz + 170);
  const scale = 1500 / (dz + 170);
  const headingDrift = (plane.heading * Math.PI) / 180 * dz * 0.15;
  const sx = VIEW.width / 2 + (wx - plane.x - headingDrift) * scale;
  const sy = horizonY + (VIEW.height - horizonY) * depth - (wy - plane.y) * scale * 1.15;
  return { x: sx, y: sy, s: scale, depth };
}

function ridgePath(ctx, plane, horizonY, baseY, amplitude, seed, color, parallax) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, VIEW.height);
  const step = 64;
  for (let sx = -20; sx <= VIEW.width + 20; sx += step) {
    const worldX = (sx - VIEW.width / 2) * parallax + plane.x * parallax;
    const n = Math.sin(worldX * 0.004 + seed) * 0.55 + Math.sin(worldX * 0.011 + seed * 2.7) * 0.3 + Math.sin(worldX * 0.027 + seed * 1.3) * 0.15;
    const y = baseY - (n * 0.5 + 0.5) * amplitude - plane.y * 0.04;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(VIEW.width + 20, VIEW.height);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, palette, mission, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height * 0.55);
  g.addColorStop(0, palette.top);
  g.addColorStop(0.62, palette.mid);
  g.addColorStop(1, palette.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // The sun: high by day, low and fat at dusk. A wide, soft glow so it
  // reads as light in the sky, not a sticker pasted over the clouds.
  const sunX = VIEW.width * 0.78;
  const sunY = mission.dusk ? VIEW.height * 0.30 : VIEW.height * 0.17;
  const sunR = mission.dusk ? 46 : 34;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunR * 5);
  glow.addColorStop(0, palette.sun);
  glow.addColorStop(0.5, 'rgba(255,240,200,0.28)');
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 5, sunY - sunR * 5, sunR * 10, sunR * 10);
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  void time;
}

function drawClouds(ctx, plane, horizonY, palette) {
  // One soft blur for all clouds: it melts the hard ellipse edges that
  // read as seams or stickers.
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = palette.cloud;
  for (const c of CLOUDS) {
    const dz = ((c.z - plane.z) % 5200 + 5200) % 5200;
    const p = project(plane, horizonY, c.x, c.y, plane.z + dz);
    if (p.y > horizonY + 40 || p.x < -200 || p.x > VIEW.width + 200) continue;
    const w = c.w * p.s * 0.9;
    const h = w * 0.32;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w, h, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - w * 0.5, p.y + h * 0.25, w * 0.55, h * 0.7, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + w * 0.5, p.y + h * 0.25, w * 0.55, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGround(ctx, plane, horizonY, palette) {
  // Valley floor: a trapezoid from the horizon to the bottom of the frame.
  const near = project(plane, horizonY, 0, 0, plane.z + 10);
  const farL = project(plane, horizonY, -WORLD.valleyHalfWidth, 0, plane.z + 4200);
  const farR = project(plane, horizonY, WORLD.valleyHalfWidth, 0, plane.z + 4200);
  ctx.fillStyle = palette.ground;
  ctx.beginPath();
  ctx.moveTo(farL.x, farL.y);
  ctx.lineTo(farR.x, farR.y);
  ctx.lineTo(VIEW.width + 40, VIEW.height + 40);
  ctx.lineTo(-40, VIEW.height + 40);
  ctx.closePath();
  ctx.fill();

  // Field patchwork: strips of ground every 220 m, in three close greens
  // at low alpha so the floor reads as fields, not boards.
  for (let z = Math.floor(plane.z / 220) * 220; z < plane.z + 4200; z += 220) {
    const strip = Math.floor(z / 220);
    const a = project(plane, horizonY, -WORLD.valleyHalfWidth, 0, z);
    const b = project(plane, horizonY, WORLD.valleyHalfWidth, 0, z);
    const c = project(plane, horizonY, WORLD.valleyHalfWidth, 0, z + 220);
    const d = project(plane, horizonY, -WORLD.valleyHalfWidth, 0, z + 220);
    ctx.fillStyle = [palette.fieldA, palette.fieldB, palette.fieldC][fieldShade(strip)];
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // The river: a winding band down the floor.
  ctx.fillStyle = palette.river;
  ctx.beginPath();
  let started = false;
  for (let z = plane.z + 4200; z > plane.z - 40; z -= 120) {
    const cx = riverX(z);
    const p = project(plane, horizonY, cx, 0, z);
    const w = 16 * p.s + 2;
    if (!started) {
      ctx.moveTo(p.x - w, p.y);
      started = true;
    } else {
      ctx.lineTo(p.x - w, p.y);
    }
  }
  for (let z = plane.z - 40; z < plane.z + 4200; z += 120) {
    const cx = riverX(z);
    const p = project(plane, horizonY, cx, 0, z);
    const w = 16 * p.s + 2;
    ctx.lineTo(p.x + w, p.y);
  }
  ctx.closePath();
  ctx.fill();

  // The road along the east wall.
  ctx.fillStyle = palette.road;
  ctx.beginPath();
  started = false;
  for (let z = plane.z + 4200; z > plane.z - 40; z -= 140) {
    const cx = roadX(z);
    const p = project(plane, horizonY, cx, 0, z);
    const w = 5 * p.s + 1;
    if (!started) {
      ctx.moveTo(p.x - w, p.y);
      started = true;
    } else {
      ctx.lineTo(p.x - w, p.y);
    }
  }
  for (let z = plane.z - 40; z < plane.z + 4200; z += 140) {
    const cx = roadX(z);
    const p = project(plane, horizonY, cx, 0, z);
    const w = 5 * p.s + 1;
    ctx.lineTo(p.x + w, p.y);
  }
  ctx.closePath();
  ctx.fill();

  // Runways: flat tarmac quads with a centre line and threshold bars.
  for (const r of [START_RUNWAY, FAR_RUNWAY]) {
    const z0 = r.z - r.length / 2;
    const z1 = r.z + r.length / 2;
    const a = project(plane, horizonY, -r.width / 2, 0, z0);
    const b = project(plane, horizonY, r.width / 2, 0, z0);
    const c = project(plane, horizonY, r.width / 2, 0, z1);
    const d = project(plane, horizonY, -r.width / 2, 0, z1);
    if (Math.min(a.y, b.y, c.y, d.y) < horizonY - 4 && Math.max(a.y, b.y, c.y, d.y) < horizonY - 4) continue;
    ctx.fillStyle = '#3c4148';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    // Centre dashes.
    ctx.fillStyle = '#f4f6f8';
    for (let z = z0 + 20; z < z1 - 10; z += 60) {
      const p1 = project(plane, horizonY, -1.2, 0.2, z);
      const p2 = project(plane, horizonY, 1.2, 0.2, z);
      const p3 = project(plane, horizonY, 1.2, 0.2, z + 26);
      const p4 = project(plane, horizonY, -1.2, 0.2, z + 26);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRings(ctx, plane, horizonY, rings, time) {
  const sorted = [...rings].sort((a, b) => b.z - a.z);
  // Only the next ring gets a distance tag: tags on every ring pile up
  // into unreadable clutter near the horizon.
  let next = null;
  for (const r of rings) {
    if (!r.passed && !r.missed && r.z > plane.z && (!next || r.z < next.z)) next = r;
  }
  for (const ring of sorted) {
    if (ring.z < plane.z - 30) continue;
    const p = project(plane, horizonY, ring.x, ring.y, ring.z);
    if (p.y < -80 || p.y > VIEW.height + 80) continue;
    const rx = ring.radius * p.s * 1.05;
    const ry = rx * 0.92;
    if (rx < 2) continue;
    const pulse = 0.75 + 0.25 * Math.sin(time * 5 + ring.z);
    ctx.lineWidth = Math.max(2, rx * 0.14);
    if (ring.passed) {
      ctx.strokeStyle = 'rgba(120,220,130,0.9)';
    } else if (ring.missed) {
      ctx.strokeStyle = 'rgba(200,80,70,0.55)';
    } else {
      ctx.strokeStyle = `rgba(255,176,66,${0.85 * pulse + 0.15})`;
    }
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, rx * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * 0.86, ry * 0.86, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Distance tag above the next ring only, on a dark pill so it stays
    // readable over bright cloud, and only while the ring is close enough
    // that the tag cannot collide with the far rings near the horizon.
    if (ring === next) {
      const dz = Math.max(0, Math.round(ring.z - plane.z));
      if (dz <= 800) {
        const label = `${dz} m`;
        ctx.font = `bold ${Math.max(13, Math.min(24, rx * 0.5))}px Arial, sans-serif`;
        const tw = ctx.measureText(label).width;
        const tx = p.x - tw / 2 - 8;
        const ty = p.y - ry - 32;
        ctx.fillStyle = 'rgba(10,20,30,0.72)';
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw + 16, 26, 13);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, ty + 19);
      }
    }
  }
}

// The aircraft, rear chase view, banked with the roll. Drawn big and
// built-looking: shaded fuselage, swept wings, tail, nav lights, exhaust.
function drawPlane(ctx, plane, time) {
  const cx = VIEW.width / 2;
  const cy = VIEW.height * 0.70 + Math.sin(time * 2.2) * 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-plane.roll * Math.PI) / 180);
  const s = 1.15;
  ctx.scale(s, s);
  // Main wings.
  ctx.fillStyle = '#b8c4d0';
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-118, 34);
  ctx.lineTo(-112, 44);
  ctx.lineTo(-10, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(118, 34);
  ctx.lineTo(112, 44);
  ctx.lineTo(10, 18);
  ctx.closePath();
  ctx.fill();
  // Wing shading.
  ctx.fillStyle = '#8fa0b2';
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  ctx.lineTo(-112, 44);
  ctx.lineTo(-10, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 12);
  ctx.lineTo(112, 44);
  ctx.lineTo(10, 18);
  ctx.closePath();
  ctx.fill();
  // Tailplane and fin.
  ctx.fillStyle = '#9fb0c0';
  ctx.beginPath();
  ctx.moveTo(-8, -52);
  ctx.lineTo(-44, -66);
  ctx.lineTo(-40, -58);
  ctx.lineTo(-6, -44);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -52);
  ctx.lineTo(44, -66);
  ctx.lineTo(40, -58);
  ctx.lineTo(6, -44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c33';
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(-7, -96);
  ctx.lineTo(7, -96);
  ctx.closePath();
  ctx.fill();
  // Fuselage: shaded tube with a cockpit hump.
  const body = ctx.createLinearGradient(-14, 0, 14, 0);
  body.addColorStop(0, '#7e8ea0');
  body.addColorStop(0.5, '#e8eef4');
  body.addColorStop(1, '#7e8ea0');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, 26);
  ctx.quadraticCurveTo(-16, -30, -6, -62);
  ctx.quadraticCurveTo(0, -70, 6, -62);
  ctx.quadraticCurveTo(16, -30, 13, 26);
  ctx.quadraticCurveTo(0, 34, -13, 26);
  ctx.fill();
  ctx.fillStyle = '#1d2f45';
  ctx.beginPath();
  ctx.ellipse(0, -44, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,210,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-2, -47, 4.5, 8, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Engine exhaust glow, stronger with throttle.
  const glow = 0.35 + (plane.throttle / 100) * 0.65;
  ctx.fillStyle = `rgba(255,${Math.round(140 + 60 * glow)},60,${0.55 * glow})`;
  ctx.beginPath();
  ctx.ellipse(0, 36, 7, 10 + 12 * glow, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nav lights: red port, green starboard, blinking white tail.
  ctx.fillStyle = '#ff2e2e';
  ctx.beginPath();
  ctx.arc(-116, 39, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2eff5e';
  ctx.beginPath();
  ctx.arc(116, 39, 4, 0, Math.PI * 2);
  ctx.fill();
  if (Math.sin(time * 6) > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -94, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- HUD -----------------------------------------------------------------

function hudText(ctx, x, y, label, value, align = 'left', big = false) {
  ctx.textAlign = align;
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(x - (align === 'right' ? 118 : 0), y - (big ? 34 : 24), 118, big ? 46 : 34);
  ctx.fillStyle = '#9fe8ff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillText(label, x + (align === 'right' ? -108 : 10), y - (big ? 18 : 12));
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${big ? 26 : 20}px "Courier New", monospace`;
  ctx.fillText(value, x + (align === 'right' ? -10 : 10), y + (big ? 12 : 8));
}

function drawCompass(ctx, plane) {
  const cx = VIEW.width / 2;
  const y = 30;
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(cx - 150, 8, 300, 44);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 150, 8, 300, 44);
  ctx.clip();
  const points = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'], [360, 'N']];
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  for (const [deg, label] of points) {
    let d = deg - plane.heading;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    const x = cx + d * 2.1;
    if (x < cx - 160 || x > cx + 160) continue;
    ctx.fillStyle = deg % 90 === 0 ? '#ffd24a' : '#cfe6f5';
    ctx.fillText(label, x, 26);
    ctx.fillRect(x - 1, 32, 2, 8);
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, 44);
  ctx.lineTo(cx - 6, 34);
  ctx.lineTo(cx + 6, 34);
  ctx.closePath();
  ctx.fill();
  // Heading number on its own dark pill: white text over white cloud
  // vanishes without it.
  const hdg = Math.round(((plane.heading % 360) + 360) % 360);
  const hdgLabel = `${String(hdg).padStart(3, '0')}°`;
  ctx.font = 'bold 15px "Courier New", monospace';
  const hw = ctx.measureText(hdgLabel).width;
  ctx.fillStyle = 'rgba(10,20,30,0.72)';
  ctx.beginPath();
  ctx.roundRect(cx - hw / 2 - 10, 52, hw + 20, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(hdgLabel, cx, 69);
}

function drawArtificialHorizon(ctx, plane) {
  const cx = 92;
  const cy = VIEW.height - 92;
  const r = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate((-plane.roll * Math.PI) / 180);
  ctx.translate(0, plane.pitch * 1.6);
  ctx.fillStyle = '#3f7fc4';
  ctx.fillRect(-r - 4, -r - 60, r * 2 + 8, r + 60);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(-r - 4, 0, r * 2 + 8, r + 60);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r - 4, 0);
  ctx.lineTo(r + 4, 0);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#dfe9f2';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx - 4, cy);
  ctx.lineTo(cx, cy - 5);
  ctx.lineTo(cx + 4, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.lineTo(cx + 4, cy + 3);
  ctx.lineTo(cx - 4, cy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9fe8ff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', cx, cy + r + 16);
}

function drawBars(ctx, plane) {
  // Fuel and throttle, bottom left beside the attitude gauge. The panel
  // lines up with the gauge (same top, same height) and the numbers sit
  // inside it with room to spare.
  const x = 170;
  const y = VIEW.height - 144;
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(x - 8, y - 8, 212, 112);
  ctx.fillStyle = plane.fuel < 20 ? '#ff5a4a' : '#9fe8ff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FUEL', x, y + 8);
  ctx.fillStyle = '#22303c';
  ctx.fillRect(x + 52, y - 2, 118, 12);
  ctx.fillStyle = plane.fuel < 20 ? '#ff5a4a' : '#37d67a';
  ctx.fillRect(x + 52, y - 2, 118 * (plane.fuel / 100), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(plane.fuel)}`, x + 196, y + 9);
  ctx.fillStyle = '#9fe8ff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THR', x, y + 32);
  ctx.fillStyle = '#22303c';
  ctx.fillRect(x + 52, y + 22, 118, 12);
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(x + 52, y + 22, 118 * (plane.throttle / 100), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(plane.throttle)}%`, x + 196, y + 33);
  ctx.fillStyle = '#9fe8ff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SPD', x, y + 56);
  ctx.fillStyle = '#22303c';
  ctx.fillRect(x + 52, y + 46, 118, 12);
  ctx.fillStyle = '#7fb2dd';
  ctx.fillRect(x + 52, y + 46, 118 * Math.min(1, plane.speed / 96), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${knots(plane.speed)} kt`, x + 196, y + 57);
}

function drawWarnings(ctx, game, time) {
  const warnings = [];
  const ground = terrainHeight(game.plane.x, game.plane.z);
  if (game.state === 'flying' && game.plane.y - ground < 25 && !game.plane.landed) warnings.push('PULL UP');
  if (game.state === 'flying' && game.plane.fuel < 20) warnings.push('LOW FUEL');
  if (game.state === 'flying' && game.plane.speed < 38) warnings.push('STALL');
  if (warnings.length === 0) return;
  if (Math.sin(time * 8) < -0.2) return;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3b2e';
  ctx.font = 'bold 34px Arial, sans-serif';
  ctx.fillText(warnings.join('  ·  '), VIEW.width / 2, 128);
}

function drawHud(ctx, game, time) {
  const p = game.plane;
  hudText(ctx, 16, 44, 'ALTITUDE', `${feet(p.y)} FT`, 'left', true);
  hudText(ctx, 16, 96, 'SPEED', `${knots(p.speed)} KT`, 'left', false);
  drawCompass(ctx, p);
  hudText(ctx, VIEW.width - 16, 44, 'SCORE', `${game.score}`, 'right', true);
  hudText(ctx, VIEW.width - 16, 96, 'RINGS', `${game.ringsPassed}/${game.rings.length}`, 'right', false);
  // Mission objective, centred under the compass.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(VIEW.width / 2 - 260, 74, 520, 26);
  ctx.fillStyle = '#e8f4ff';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText(game.mission.goal, VIEW.width / 2, 92);
  // Centre reticle.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(VIEW.width / 2, VIEW.height * 0.52, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(VIEW.width / 2 - 22, VIEW.height * 0.52);
  ctx.lineTo(VIEW.width / 2 - 16, VIEW.height * 0.52);
  ctx.moveTo(VIEW.width / 2 + 16, VIEW.height * 0.52);
  ctx.lineTo(VIEW.width / 2 + 22, VIEW.height * 0.52);
  ctx.stroke();
  drawArtificialHorizon(ctx, p);
  drawBars(ctx, p);
  // Wind, only where the mission has it.
  if (game.mission.wind > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(10,20,30,0.55)';
    ctx.fillRect(VIEW.width - 216, VIEW.height - 64, 200, 48);
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`WIND ${game.windDir > 0 ? '→' : '←'} ${Math.abs(Math.round(game.windNow))} m/s`, VIEW.width - 26, VIEW.height - 34);
  }
  drawWarnings(ctx, game, time);
}

// --- Screens ---------------------------------------------------------------

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(8,16,28,${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,22,36,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(159,232,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawTitle(ctx, game) {
  dim(ctx, 0.45);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px Arial, sans-serif';
  ctx.fillText('RIDGE RUNNER', VIEW.width / 2, 150);
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('A flight game over the valley  ·  three sorties, one sky', VIEW.width / 2, 188);
  // Mission cards.
  const cardW = 330;
  const cardH = 210;
  const gap = 26;
  const totalW = cardW * 3 + gap * 2;
  const x0 = (VIEW.width - totalW) / 2;
  const y0 = 250;
  game.missionRects = [];
  game.missions.forEach((m, i) => {
    const x = x0 + i * (cardW + gap);
    const selected = game.missionIndex === i;
    panel(ctx, x, y0, cardW, cardH);
    if (selected) {
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 2, y0 - 2, cardW + 4, cardH + 4);
    }
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText(m.tag.toUpperCase(), VIEW.width / 2 + (x + cardW / 2 - VIEW.width / 2), y0 + 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText(m.name, x + cardW / 2, y0 + 76);
    ctx.fillStyle = '#cfe6f5';
    ctx.font = '15px Arial, sans-serif';
    wrapText(ctx, m.blurb, x + cardW / 2, y0 + 108, cardW - 36, 21);
    ctx.fillStyle = selected ? '#ffd24a' : '#9fe8ff';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(selected ? '▶ SELECTED — click or press Enter' : 'click to select', x + cardW / 2, y0 + cardH - 18);
    game.missionRects.push({ x, y: y0, w: cardW, h: cardH, index: i });
  });
  // Controls and tagline on their own dark strip: without it the text
  // sinks into the hills behind it.
  ctx.fillStyle = 'rgba(10,20,30,0.62)';
  ctx.fillRect(VIEW.width / 2 - 470, 512, 940, 84);
  ctx.fillStyle = '#e8f4ff';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillText('W / ↑ climb    S / ↓ descend    A D / ← → turn    E / Q or Shift / Ctrl throttle    P pause    M mute', VIEW.width / 2, 540);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('Fly the rings, mind the fuel, and bring her home in one piece.', VIEW.width / 2, 572);
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function drawEndScreen(ctx, game) {
  dim(ctx, 0.55);
  const won = game.state === 'complete';
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7be495' : '#ff6a5a';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.fillText(won ? (game.plane.landed ? 'LANDED — WELL FLOWN' : 'MISSION COMPLETE') : 'CRASHED', VIEW.width / 2, 210);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(
    won ? game.mission.name : game.plane.crashed || 'Flight over',
    VIEW.width / 2,
    252,
  );
  panel(ctx, VIEW.width / 2 - 260, 300, 520, 220);
  const rows = [
    ['Score', `${game.score}`],
    ['Rings', `${game.ringsPassed}/${game.rings.length}`],
    ['Distance', `${Math.round(game.plane.z)} m`],
    ['Time', `${Math.round(game.elapsed)} s`],
    ['Fuel left', `${Math.round(game.plane.fuel)}`],
  ];
  ctx.font = 'bold 19px "Courier New", monospace';
  rows.forEach(([label, value], i) => {
    const y = 340 + i * 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fe8ff';
    ctx.fillText(label, VIEW.width / 2 - 230, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, VIEW.width / 2 + 230, y);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('Press Enter or click to fly again', VIEW.width / 2, 580);
}

function drawPaused(ctx) {
  dim(ctx, 0.5);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px Arial, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
  ctx.fillStyle = '#cfe6f5';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('Press P or click to keep flying', VIEW.width / 2, VIEW.height / 2 + 34);
}

// --- Frame -----------------------------------------------------------------

// A hex colour with an alpha channel, for the horizon fog.
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function render(ctx, game, time) {
  const palette = SKY[game.mission.dusk ? 'dusk' : 'day'];
  const horizonY = VIEW.height * 0.42 - game.plane.pitch * 2.2 - game.plane.y * 0.02;
  drawSky(ctx, palette, game.mission, time);
  drawClouds(ctx, game.plane, horizonY, palette);
  ctx.save();
  // Roll the world with the bank, but only half as far as the wing: the
  // full roll belongs to the aircraft, and swinging the whole valley with
  // it reads as a wall instead of a turn. The HUD is drawn unrotated.
  ctx.translate(VIEW.width / 2, VIEW.height * 0.7);
  ctx.rotate((-game.plane.roll * 0.5 * Math.PI) / 180);
  ctx.translate(-VIEW.width / 2, -VIEW.height * 0.7);
  ridgePath(ctx, game.plane, horizonY, horizonY + 4, 62, 1.7, palette.ridgeFar, 0.25);
  ridgePath(ctx, game.plane, horizonY, horizonY + 26, 96, 4.2, palette.ridgeMid, 0.5);
  ridgePath(ctx, game.plane, horizonY, horizonY + 52, 118, 8.9, palette.ridgeNear, 0.85);
  drawGround(ctx, game.plane, horizonY, palette);
  drawRings(ctx, game.plane, horizonY, game.rings, time);
  ctx.restore();
  // Horizon fog: a soft band of haze where sky meets mountains, so the
  // two read as one landscape instead of two stacked pictures.
  const fog = ctx.createLinearGradient(0, horizonY - 48, 0, horizonY + 48);
  fog.addColorStop(0, hexA(palette.horizon, 0));
  fog.addColorStop(0.5, hexA(palette.horizon, 0.38));
  fog.addColorStop(1, hexA(palette.horizon, 0));
  ctx.fillStyle = fog;
  ctx.fillRect(0, horizonY - 48, VIEW.width, 96);
  drawPlane(ctx, game.plane, time);
  if (game.state === 'flying' || game.state === 'paused') {
    drawHud(ctx, game, time);
  }
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'paused') drawPaused(ctx);
  if (game.state === 'crashed' || game.state === 'complete') drawEndScreen(ctx, game);
}
