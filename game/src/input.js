// Ridge Runner — keyboard and mouse. The keyboard flies the plane; the
// mouse (and Enter) works the menus. Nothing here touches the game state
// directly: it only reports which controls are held right now.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    pitchUp: false,
    pitchDown: false,
    throttleUp: false,
    throttleDown: false,
    turnLeft: false,
    turnRight: false,
    pressedEnter: false,
    clicked: null, // { x, y } in canvas pixels, consumed by the game loop
  };

  function refresh() {
    input.pitchUp = keys.has('ArrowUp') || keys.has('KeyW');
    input.pitchDown = keys.has('ArrowDown') || keys.has('KeyS');
    input.throttleUp = keys.has('KeyE') || keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.throttleDown = keys.has('KeyQ') || keys.has('ControlLeft');
    input.turnLeft = keys.has('ArrowLeft') || keys.has('KeyA');
    input.turnRight = keys.has('ArrowRight') || keys.has('KeyD');
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'Enter' && !e.repeat) input.pressedEnter = true;
    if (e.code === 'KeyP' && !e.repeat) input.pressedP = true;
    if (e.code === 'KeyM' && !e.repeat) input.pressedM = true;
    keys.add(e.code);
    refresh();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    refresh();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    refresh();
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.clicked = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  });

  // The game loop calls this once a frame to take the one-shot events.
  input.consume = function consume() {
    const out = { enter: input.pressedEnter, p: input.pressedP, m: input.pressedM, click: input.clicked };
    input.pressedEnter = false;
    input.pressedP = false;
    input.pressedM = false;
    input.clicked = null;
    return out;
  };

  return input;
}
