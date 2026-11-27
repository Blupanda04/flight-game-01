// Ridge Runner — tuning and mission definitions.
// One place for every number the flight model, the terrain and the
// missions share, so balancing the game means editing this file only.

// World: forward is +z in metres, x is lateral metres from the valley
// centre, y is altitude in metres above sea level. The valley floor sits
// near y = 0 and the walls rise with |x|.
export const WORLD = {
  valleyHalfWidth: 260, // metres of flat-ish floor before the walls rise
  wallSlope: 0.55, // extra metres of terrain per metre beyond the floor
  wallRoughness: 26, // metres of rolling noise on the walls
  courseLength: 4800, // metres from the start runway to the finish line
  farRunwayZ: 6000, // metres out: the destination runway, mission 2
  runwayWidth: 46, // metres of tarmac
  groundLevel: 0,
};

// The aircraft. Speeds are metres per second; the HUD shows knots and feet.
export const PLANE = {
  minSpeed: 24, // m/s, below this the wing stops flying
  cruiseSpeed: 62, // m/s at 60% throttle, level
  maxSpeed: 96, // m/s at full throttle, level
  climbRate: 9.5, // m/s of climb at full pitch up and cruise speed
  sinkRate: 7.0, // m/s of sink at full pitch down
  turnRate: 26, // degrees per second at full bank
  maxBank: 52, // degrees of roll
  throttleStep: 34, // percent per second while the key is held
  fuelCapacity: 100, // units
  fuelBurnCruise: 0.55, // units per second at 60% throttle
  fuelBurnFull: 1.5, // units per second at 100% throttle
  ringFuelBonus: 6, // units back for each ring flown through
  startAltitude: 90, // metres above the valley floor
  startSpeed: 58, // m/s
};

// Rings: hoops to fly through. radius in metres; a pass counts when the
// plane crosses the ring's z within the radius.
export const RINGS = {
  radius: 26,
  countMission1: 8,
  countMission3: 6,
  scorePerRing: 100,
  scorePerSecondLeft: 4, // time bonus at the finish, per second under par
};

// Three sorties with different goals, so flying rewards different choices:
// ring discipline, fuel discipline, and flying steady in gusts.
export const MISSIONS = [
  {
    id: 'ring-run',
    name: 'Ring Run',
    tag: '8 rings · valley course',
    blurb: 'Thread all eight rings down the valley. Smooth turns win: every ring pays 100 points and 6 fuel.',
    rings: 8,
    wind: 0,
    dusk: false,
    parSeconds: 150,
    goal: 'Pass 8 rings, then cross the finish line.',
  },
  {
    id: 'valley-dash',
    name: 'Valley Dash',
    tag: 'land on the far runway',
    blurb: 'A 6 km dash to the far runway. Mind the fuel gauge: arrive fast and you land with fuel to spare.',
    rings: 4,
    wind: 0,
    dusk: false,
    parSeconds: 120,
    goal: 'Land on the far runway before the fuel runs out.',
  },
  {
    id: 'storm-courier',
    name: 'Storm Courier',
    tag: '6 rings · gusts at dusk',
    blurb: 'Carry the mail through a gusty dusk. The wind shoves you sideways: small corrections, steady hands.',
    rings: 6,
    wind: 14, // m/s of lateral gust, changing direction
    dusk: true,
    parSeconds: 170,
    goal: 'Pass 6 rings in the gusts, then cross the finish line.',
  },
];

// Look: one palette for sky, terrain and instruments, per time of day.
export const SKY = {
  day: {
    top: '#2f6fb2', mid: '#7fb2dd', horizon: '#cfe4f2',
    sun: '#fff3c4', cloud: 'rgba(255,255,255,0.92)',
    ridgeFar: '#8fa8c4', ridgeMid: '#6d8a68', ridgeNear: '#4c7048',
    ground: '#6f9a55', fieldA: '#77a45c', fieldB: '#679251', fieldC: '#7fae5f',
    river: '#4f8fc4', road: '#8a7a5a',
  },
  dusk: {
    top: '#2c2a55', mid: '#8a5578', horizon: '#e8a06a',
    sun: '#ffb37a', cloud: 'rgba(255,196,160,0.85)',
    ridgeFar: '#5d5470', ridgeMid: '#4c4459', ridgeNear: '#38333f',
    ground: '#4d5a3f', fieldA: '#52663f', fieldB: '#495a3c', fieldC: '#576b45',
    river: '#7a6a9a', road: '#6a5a4a',
  },
};

// The canvas is fixed to this size; screenshots are taken at 1280 x 800.
export const VIEW = { width: 1280, height: 800 };
