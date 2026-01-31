const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');

// --- GAME STATE ---
let gameState = 'START'; // START, PLAYING, WIN, LOSE
let pairs = [];
let activePair = null;
let blackHoles = [];
let timeLeft = 0;
let flashType = null;
let explosionActive = false;
let stars = [];

// --- SHIP & POINTER ---
const ship = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    angle: 0,
    lerpSpeed: 0.08, // Adjust for smoothness
    size: 30
};

// Resize Handler
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
});
window.dispatchEvent(new Event('resize'));

// --- INPUT HANDLING ---
const updatePointer = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ship.targetX = clientX;
    ship.targetY = clientY;
};

canvas.addEventListener('mousemove', updatePointer);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); updatePointer(e); }, { passive: false });

// --- FILE LOADING ---
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        const lines = event.target.result.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lines.length % 2 !== 0 || lines.length > 120) {
            document.getElementById('error-msg').innerText = "Invalid File: Ensure even lines (max 120).";
            return;
        }
        
        pairs = [];
        for (let i = 0; i < lines.length; i += 2) {
            pairs.push({ shipWord: lines[i], targetWord: lines[i+1] });
        }
        startGame();
    };
    reader.readAsText(file);
});

// --- CORE LOGIC ---
function startGame() {
    gameState = 'PLAYING';
    timeLeft = pairs.length * 20;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    nextRound();
    requestAnimationFrame(gameLoop);
}

function nextRound() {
    if (pairs.length === 0) {
        endGame('Victory!');
        return;
    }
    activePair = pairs[Math.floor(Math.random() * pairs.length)];
    spawnBlackHoles();
}

function spawnBlackHoles() {
    blackHoles = [];
    const count = 5;
    const targets = [activePair.targetWord];
    
    // Fill distractors from other pairs if available
    let pool = pairs.filter(p => p !== activePair).map(p => p.targetWord);
    while (targets.length < count && pool.length > 0) {
        let randIdx = Math.floor(Math.random() * pool.length);
        targets.push(pool.splice(randIdx, 1)[0]);
    }

    targets.sort(() => Math.random() - 0.5).forEach((word, i) => {
        blackHoles.push({
            word: word,
            isCorrect: word === activePair.targetWord,
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height - 100) + 50,
            radius: 50,
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1
        });
    });
}

function gameLoop() {
    if (gameState !== 'PLAYING') return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Timer
    timeLeft -= 1/60;
    document.getElementById('timer').innerText = `Time: ${Math.ceil(timeLeft)}s`;
    if (timeLeft <= 0) endGame('Game Over');

    // Ship Movement (LERP)
    ship.x += (ship.targetX - ship.x) * ship.lerpSpeed;
    ship.y += (ship.targetY - ship.y) * ship.lerpSpeed;
    
    // Rotation logic
    let dx = ship.targetX - ship.x;
    let dy = ship.targetY - ship.y;
    ship.angle = Math.atan2(dy, dx) + Math.PI/2;

    // Black Hole drift & collision
    blackHoles.forEach(bh => {
        bh.x += bh.vx;
        bh.y += bh.vy;
        
        // Bounce off walls
        if (bh.x < 50 || bh.x > canvas.width - 50) bh.vx *= -1;
        if (bh.y < 50 || bh.y > canvas.height - 50) bh.vy *= -1;

        // Collision Check
        let dist = Math.hypot(ship.x - bh.x, ship.y - bh.y);
        if (dist < bh.radius + 15) {
            handleCollision(bh);
        }
    });
}

function handleCollision(bh) {
    if (bh.isCorrect) {
        flash('green');
        pairs = pairs.filter(p => p !== activePair);
        nextRound();
    } else {
        flash('red');
        triggerExplosion();
        timeLeft = Math.max(0, timeLeft - 40);
        spawnBlackHoles(); // Respawn distractors
    }
}

// --- VISUAL EFFECTS ---
function initStars() {
    stars = [];
    for(let i=0; i<100; i++) stars.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, s: Math.random()*2});
}

function flash(color) {
    flashType = color;
    document.body.className = color === 'red' ? 'flash-red' : 'flash-green';
    setTimeout(() => { 
        flashType = null; 
        document.body.className = '';
    }, 150);
}

function triggerExplosion() {
    explosionActive = true;
    setTimeout(() => explosionActive = false, 2000);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Stars
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    // Draw Black Holes
    blackHoles.forEach(bh => {
        const grad = ctx.createRadialGradient(bh.x, bh.y, 5, bh.x, bh.y, bh.radius);
        grad.addColorStop(0, '#000');
        grad.addColorStop(0.8, '#2a0052');
        grad.addColorStop(1, 'rgba(187, 134, 252, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(bh.word, bh.x, bh.y + 70);
    });

    // Draw Ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    
    ctx.fillStyle = "#4a90e2";
    ctx.beginPath(); // Main body (Triangle)
    ctx.moveTo(0, -20);
    ctx.lineTo(15, 15);
    ctx.lineTo(-15, 15);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = "#fff"; // Cockpit
    ctx.fillRect(-5, -5, 10, 8);
    ctx.restore();

    // Draw Word above Ship
    if (activePair) {
        ctx.fillStyle = "white";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(activePair.shipWord, ship.x, ship.y - 40);
    }

    // Draw Explosion
    if (explosionActive) {
        ctx.font = "200px sans-serif";
        ctx.fillText("💥", canvas.width/2, canvas.height/2);
    }
}

function endGame(msg) {
    gameState = 'END';
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').innerText = msg;
}

initStars();