type RectConfig = {
  size: number;
  x: number;
  y: number;
  color: string;
};

type PlayerDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | "";

type AsteroidConfig = RectConfig & {
  velocity: number;
  direction: number;
};

// get the canvas, set it to screen size, get it's context
const canvas = document.getElementById("root-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// speed, in px/s
const PLAYER_VELOCITY = 200;
// *average* velocity of the asteroids (will be slightly randomized)
const ASTEROID_VELOCITY = 300;
// how often new asteroids are generated
const ASTEROID_GENERATE_INTERVAL = 600;

// game data

// tracks the start of the current game
let gameStartTime = document.timeline.currentTime as number;

// player object
let player = {
  // size of the player rect
  size: 50,
  // their color (red)
  color: "#eb4e3f",
  // their current position (center of the rect, with how the rects are drawn)
  x: canvas.width / 2,
  y: canvas.height / 2,
  // where the player is moving (cardinal directions - south/west/north/east)
  // these are later combined for easier calculations
  xDirection: "",
  yDirection: "",
};

// the array of stored asteroids
let asteroids = [...new Array(4)].map((_v) => generateAsteroid());

//  very basic gc - remove all asteroids that are far away from screen
//  this is just to make sure we don't overuse memory in very long games
setInterval(() => {
  asteroids = asteroids.filter(
    (a) =>
      Math.abs(a.x) < 2 * window.innerWidth &&
      Math.abs(a.y) < 2 * window.innerHeight
  );
}, 4000);

// generate new asteroids periodically
let interval = setInterval(
  () => asteroids.push(generateAsteroid()),
  ASTEROID_GENERATE_INTERVAL
);

// reset all parameters of the game (when collision happens) and just start over
function resetGame() {
  gameStartTime = document.timeline.currentTime as number;

  player = {
    size: 50,
    color: "#eb4e3f",
    x: canvas.width / 2,
    y: canvas.height / 2,
    // these need to stay the same because of how we track directions
    // (otherwise keyUp will mess this up, and this is the cleanest solution)
    xDirection: player.xDirection,
    yDirection: player.yDirection,
  };

  asteroids = [...new Array(4)].map((_v) => generateAsteroid());

  interval && clearInterval(interval);
  interval = setInterval(
    () => asteroids.push(generateAsteroid()),
    ASTEROID_GENERATE_INTERVAL
  );
}

// draws a rectangle
const drawRect = ({ x, y, size, color }: RectConfig) => {
  ctx.beginPath();
  // we want the center of the rectangle to be in the given coordinates
  ctx.rect(x - size / 2, y - size / 2, size, size);

  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 10;

  ctx.fillStyle = color;

  ctx.fill();
  ctx.closePath();
};

// returns the coordinates of where to spawn an asteroid, given it's direction angle
function getPositionOnEdge(angle: number) {
  // get the slope of the linear function
  const slope = Math.tan(angle);

  // these just tell us whether the coordinate is negative or positive
  const xSign = Math.sign(Math.cos(angle - Math.PI));
  const ySign = Math.sign(Math.sin(angle - Math.PI));

  // try calculating the position so x coordinate would be on the edge of the screen
  let x = (window.innerWidth / 2) * xSign;
  let y = slope * x;

  // if y is outside of the screen, flip it (as that means the coordinates are not on the edge of the screen, but outside of it)
  if (Math.abs(y) > window.innerHeight / 2) {
    y = (window.innerHeight / 2) * ySign;
    x = y / slope;
  }

  // add jitter to spawn position, to make it feel more natural (and also make sure they don't spawn right on the edge)
  x *= 1.2 + Math.random() * 0.2;
  y *= 1.2 + Math.random() * 0.2;

  return {
    // translate these coordinates to the middle of the screen
    x: x + window.innerWidth / 2,
    y: y + window.innerHeight / 2,
  };
}

function generateAsteroid(): AsteroidConfig {
  const angle = Math.random() * 2 * Math.PI;

  // we need to find coordinates where the asteroid will travel from the edge of the screen to the screen center
  const coordinates = getPositionOnEdge(angle);

  // generate a random value for a hex component (r/g/b) - since we need a gray colour this will be same for all components
  // we want the shade to be light grey because contrast
  const colorComponent = Math.round(Math.random() * 128 + 128).toString(16);

  return {
    color: `#${colorComponent + colorComponent + colorComponent}`,
    // this is dimensions of the asteroid, like wiht player
    size: 40 + Math.random() * 40,
    // this is the angle (in radians) of where the asteroid is traveling towards
    // add jitter to direction so the asteroids don't always pass through the middle
    direction: angle - 0.6 + Math.random() * 0.6,
    // make the asteroid's velocity a random number between 0.8x and 1.2x of the setting
    velocity: ASTEROID_VELOCITY * 0.8 + 0.4 * ASTEROID_VELOCITY,
    ...coordinates,
  };
}

// moves the asteroid according to it's velocity and direction
function updateAsteroid({
  asteroid,
  timeSinceLastUpdate,
}: {
  asteroid: AsteroidConfig;
  timeSinceLastUpdate: number;
}) {
  asteroid.y +=
    ((Math.sin(asteroid.direction) * timeSinceLastUpdate) / 1000) *
    asteroid.velocity;

  asteroid.x +=
    ((Math.cos(asteroid.direction) * timeSinceLastUpdate) / 1000) *
    asteroid.velocity;
}

// given an asteroid, detect it's collision with the player
// if a collision is detected reset the game [and save the new record]
function collisionWithPlayer(asteroid: AsteroidConfig) {
  if (
    Math.abs(asteroid.x - player.x) <= (asteroid.size + player.size) / 2 &&
    Math.abs(asteroid.y - player.y) <= (asteroid.size + player.size) / 2
  ) {
    if (window.localStorage) {
      const currentTime =
        (document.timeline.currentTime as number) - gameStartTime;
      const bestTime = Number(localStorage.getItem("bestTime"));

      if (currentTime > bestTime)
        localStorage.setItem("bestTime", currentTime.toString());
    }

    resetGame();
  }
}

// listen to keydown event, and store the player's new direction
document.addEventListener("keydown", (ev) => {
  // ignore longpress
  if (ev.repeat) return;

  switch (ev.key) {
    case "ArrowUp":
      return player.yDirection
        ? (player.yDirection = "")
        : (player.yDirection = "n");
    case "ArrowDown":
      return player.yDirection
        ? (player.yDirection = "")
        : (player.yDirection = "s");

    case "ArrowRight":
      return player.xDirection
        ? (player.xDirection = "")
        : (player.xDirection = "e");
    case "ArrowLeft":
      return player.xDirection
        ? (player.xDirection = "")
        : (player.xDirection = "w");
  }
});

// listen to keyup event, and store the player's new direction
document.addEventListener("keyup", (ev) => {
  if (ev.repeat) return;

  switch (ev.key) {
    case "ArrowUp":
      return player.yDirection
        ? (player.yDirection = "")
        : (player.yDirection = "s");
    case "ArrowDown":
      return player.yDirection
        ? (player.yDirection = "")
        : (player.yDirection = "n");

    case "ArrowRight":
      return player.xDirection
        ? (player.xDirection = "")
        : (player.xDirection = "w");
    case "ArrowLeft":
      return player.xDirection
        ? (player.xDirection = "")
        : (player.xDirection = "e");
  }
});

// update player position in game, according to their position and direction
function updatePlayer(timeSinceLastUpdate: number) {
  // we want to concat two directions, so we can use them in a switch
  const direction = player.yDirection + player.xDirection;

  if (!direction) return;

  // depending on user's direction, move their x and y coordinates
  switch (direction) {
    case "n":
      player.y -= PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
    case "e":
      player.x += PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
    case "e":
    case "s":
      player.y += PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
    case "w":
      player.x -= PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
    // for diagonal movement, reduce axis movement appropriately, to keep constant velocity
    case "ne":
      player.x +=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      player.y -=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
    case "se":
      player.x +=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      player.y +=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
    case "sw":
      player.x -=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      player.y +=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
    case "nw":
      player.x -=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      player.y -=
        (1 / Math.sqrt(2)) * PLAYER_VELOCITY * (timeSinceLastUpdate / 1000);
      break;
  }

  // make sure the player can't exit the screen
  // (also account for the drawn border)
  if (player.x < player.size / 2 + 5) player.x = player.size / 2 + 5;
  if (player.y < player.size / 2 + 5) player.y = player.size / 2 + 5;

  if (player.x > window.innerWidth - player.size / 2 - 5)
    player.x = window.innerWidth - player.size / 2 - 5;
  if (player.y > window.innerHeight - player.size / 2 - 5)
    player.y = window.innerHeight - player.size / 2 - 5;
}

// updates the displayed time of the current game, as well as the record time
function trackGameTime() {
  const currentTime = (document.timeline.currentTime as number) - gameStartTime;
  const currentTimeElement = document.getElementById(
    "currentTime"
  ) as HTMLSpanElement;
  // properly format the string, as required by the exercise
  currentTimeElement.innerText = `${Math.floor(currentTime / 1000 / 60)
    .toString()
    .padStart(2, "0")}:${((currentTime / 1000) % 60)
    .toFixed(3)
    .padStart(6, "0")}`;

  const bestTimeElement = document.getElementById(
    "bestTime"
  ) as HTMLSpanElement;
  // if the browser has localStorage disabled, we can't display anything
  if (!window.localStorage)
    return (bestTimeElement.innerHTML = "not supported");

  const bestTime = localStorage.getItem("bestTime");
  bestTimeElement.innerText = bestTime
    ? `${Math.floor(Number(bestTime) / 1000 / 60)
        .toString()
        .padStart(2, "0")}:${((Number(bestTime) / 1000) % 60)
        .toFixed(3)
        .padStart(6, "0")}`
    : "--:--.--";
}

let prevTime = document.timeline.currentTime as number;
// function that runs on every repaint; manages all interaction with canvas
function update() {
  // to keep physics consistent, we need to know how often the update function is called
  const timeSinceLastUpdate =
    (document.timeline.currentTime as number) - prevTime;
  prevTime = document.timeline.currentTime as number;

  // clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // create a border around the canvas
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  ctx.closePath();

  // update game time
  trackGameTime();

  // manage user's position
  updatePlayer(timeSinceLastUpdate);
  // draw the user cube
  drawRect(player);

  // for each asteroid, update it's position, draw it and check if it collides
  asteroids.forEach((asteroid) => {
    updateAsteroid({ asteroid, timeSinceLastUpdate });
    drawRect(asteroid);
    collisionWithPlayer(asteroid);
  });

  // call self again on next paint
  requestAnimationFrame(update);
}

update();
