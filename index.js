var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// get the canvas, set it to screen size, get it's context
var canvas = document.getElementById("root-canvas");
var ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// speed, in px/s
var PLAYER_VELOCITY = 200;
// *average* velocity of the asteroids (will be slightly randomized)
var ASTEROID_VELOCITY = 300;
// how often new asteroids are generated
var ASTEROID_GENERATE_INTERVAL = 600;
// game data
// tracks the start of the current game
var gameStartTime = document.timeline.currentTime;
// player object
var player = {
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
var asteroids = __spreadArray([], new Array(4), true).map(function (_v) { return generateAsteroid(); });
//  very basic gc - remove all asteroids that are far away from screen
//  this is just to make sure we don't overuse memory in very long games
setInterval(function () {
    asteroids = asteroids.filter(function (a) {
        return Math.abs(a.x) < 2 * window.innerWidth &&
            Math.abs(a.y) < 2 * window.innerHeight;
    });
}, 4000);
// generate new asteroids periodically
var interval = setInterval(function () { return asteroids.push(generateAsteroid()); }, ASTEROID_GENERATE_INTERVAL);
// reset all parameters of the game (when collision happens) and just start over
function resetGame() {
    gameStartTime = document.timeline.currentTime;
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
    asteroids = __spreadArray([], new Array(4), true).map(function (_v) { return generateAsteroid(); });
    interval && clearInterval(interval);
    interval = setInterval(function () { return asteroids.push(generateAsteroid()); }, ASTEROID_GENERATE_INTERVAL);
}
// draws a rectangle
var drawRect = function (_a) {
    var x = _a.x, y = _a.y, size = _a.size, color = _a.color;
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
function getPositionOnEdge(angle) {
    // get the slope of the linear function
    var slope = Math.tan(angle);
    // these just tell us whether the coordinate is negative or positive
    var xSign = Math.sign(Math.cos(angle - Math.PI));
    var ySign = Math.sign(Math.sin(angle - Math.PI));
    // try calculating the position so x coordinate would be on the edge of the screen
    var x = (window.innerWidth / 2) * xSign;
    var y = slope * x;
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
function generateAsteroid() {
    var angle = Math.random() * 2 * Math.PI;
    // we need to find coordinates where the asteroid will travel from the edge of the screen to the screen center
    var coordinates = getPositionOnEdge(angle);
    // generate a random value for a hex component (r/g/b) - since we need a gray colour this will be same for all components
    // we want the shade to be light grey because contrast
    var colorComponent = Math.round(Math.random() * 128 + 128).toString(16);
    return __assign({ color: "#".concat(colorComponent + colorComponent + colorComponent), 
        // this is dimensions of the asteroid, like wiht player
        size: 40 + Math.random() * 40, 
        // this is the angle (in radians) of where the asteroid is traveling towards
        // add jitter to direction so the asteroids don't always pass through the middle
        direction: angle - 0.6 + Math.random() * 0.6, 
        // make the asteroid's velocity a random number between 0.8x and 1.2x of the setting
        velocity: ASTEROID_VELOCITY * 0.8 + 0.4 * ASTEROID_VELOCITY }, coordinates);
}
// moves the asteroid according to it's velocity and direction
function updateAsteroid(_a) {
    var asteroid = _a.asteroid, timeSinceLastUpdate = _a.timeSinceLastUpdate;
    asteroid.y +=
        ((Math.sin(asteroid.direction) * timeSinceLastUpdate) / 1000) *
            asteroid.velocity;
    asteroid.x +=
        ((Math.cos(asteroid.direction) * timeSinceLastUpdate) / 1000) *
            asteroid.velocity;
}
// given an asteroid, detect it's collision with the player
// if a collision is detected reset the game [and save the new record]
function collisionWithPlayer(asteroid) {
    if (Math.abs(asteroid.x - player.x) <= (asteroid.size + player.size) / 2 &&
        Math.abs(asteroid.y - player.y) <= (asteroid.size + player.size) / 2) {
        if (window.localStorage) {
            var currentTime = document.timeline.currentTime - gameStartTime;
            var bestTime = Number(localStorage.getItem("bestTime"));
            if (currentTime > bestTime)
                localStorage.setItem("bestTime", currentTime.toString());
        }
        resetGame();
    }
}
// listen to keydown event, and store the player's new direction
document.addEventListener("keydown", function (ev) {
    // ignore longpress
    if (ev.repeat)
        return;
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
document.addEventListener("keyup", function (ev) {
    if (ev.repeat)
        return;
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
function updatePlayer(timeSinceLastUpdate) {
    // we want to concat two directions, so we can use them in a switch
    var direction = player.yDirection + player.xDirection;
    if (!direction)
        return;
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
    if (player.x < player.size / 2 + 5)
        player.x = player.size / 2 + 5;
    if (player.y < player.size / 2 + 5)
        player.y = player.size / 2 + 5;
    if (player.x > window.innerWidth - player.size / 2 - 5)
        player.x = window.innerWidth - player.size / 2 - 5;
    if (player.y > window.innerHeight - player.size / 2 - 5)
        player.y = window.innerHeight - player.size / 2 - 5;
}
// updates the displayed time of the current game, as well as the record time
function trackGameTime() {
    var currentTime = document.timeline.currentTime - gameStartTime;
    var currentTimeElement = document.getElementById("currentTime");
    // properly format the string, as required by the exercise
    currentTimeElement.innerText = "".concat(Math.floor(currentTime / 1000 / 60)
        .toString()
        .padStart(2, "0"), ":").concat(((currentTime / 1000) % 60)
        .toFixed(3)
        .padStart(6, "0"));
    var bestTimeElement = document.getElementById("bestTime");
    // if the browser has localStorage disabled, we can't display anything
    if (!window.localStorage)
        return (bestTimeElement.innerHTML = "not supported");
    var bestTime = localStorage.getItem("bestTime");
    bestTimeElement.innerText = bestTime
        ? "".concat(Math.floor(Number(bestTime) / 1000 / 60)
            .toString()
            .padStart(2, "0"), ":").concat(((Number(bestTime) / 1000) % 60)
            .toFixed(3)
            .padStart(6, "0"))
        : "--:--.--";
}
var prevTime = document.timeline.currentTime;
// function that runs on every repaint; manages all interaction with canvas
function update() {
    // to keep physics consistent, we need to know how often the update function is called
    var timeSinceLastUpdate = document.timeline.currentTime - prevTime;
    prevTime = document.timeline.currentTime;
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
    asteroids.forEach(function (asteroid) {
        updateAsteroid({ asteroid: asteroid, timeSinceLastUpdate: timeSinceLastUpdate });
        drawRect(asteroid);
        collisionWithPlayer(asteroid);
    });
    // call self again on next paint
    requestAnimationFrame(update);
}
update();
