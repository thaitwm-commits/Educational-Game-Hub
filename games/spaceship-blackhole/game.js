const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');

// --- TRẠNG THÁI GAME ---
let gameState = 'START'; 
let gameMode = 'TXT'; 
let pairs = [];
let activePair = null;
let blackHoles = [];
let timeLeft = 0;
let explosionActive = false;
let stars = [];

const ship = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    angle: 0,
    lerpSpeed: 0.08
};

// Khởi tạo Canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
}
window.addEventListener('resize', resize);
resize();

// --- ĐIỀU KHIỂN ---
const updatePointer = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ship.targetX = clientX;
    ship.targetY = clientY;
};
canvas.addEventListener('mousemove', updatePointer);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); updatePointer(e); }, { passive: false });

// --- NẠP FILE (FIXED) ---
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target.result;
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.json')) {
                gameMode = 'JSON';
                const data = JSON.parse(content);
                // Map theo đúng key "en" và "url" trong ảnh của bạn
                pairs = data.map(item => {
                    const img = new Image();
                    img.src = item.url;
                    return { 
                        shipWord: item.en || "Error", 
                        targetWord: item.en || "Error", 
                        imageObj: img 
                    };
                });
            } else {
                gameMode = 'TXT';
                const lines = content.split(/\r?\n/).filter(l => l.trim() !== "");
                pairs = [];
                for (let i = 0; i < lines.length; i += 2) {
                    if (lines[i+1]) {
                        pairs.push({ shipWord: lines[i], targetWord: lines[i+1], imageObj: null });
                    }
                }
            }

            if (pairs.length > 0) {
                console.log("Dữ liệu đã nạp thành công:", pairs.length, "cặp.");
                startGame();
            } else {
                alert("File không có dữ liệu hợp lệ!");
            }
        } catch (err) {
            console.error(err);
            document.getElementById('error-msg').innerText = "Lỗi đọc file JSON/TXT!";
        }
    };
    reader.readAsText(file);
});

function startGame() {
    gameState = 'PLAYING';
    timeLeft = pairs.length * 7; // Tăng thêm thời gian cho dễ chơi
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    nextRound();
    gameLoop();
}

function nextRound() {
    if (pairs.length === 0) {
        gameState = 'END';
        endGame('VICTORY! 🎉');
        return;
    }
    activePair = pairs[Math.floor(Math.random() * pairs.length)];
    spawnBlackHoles();
}

function findSafePosition() {
    let x, y, isSafe = false;
    let attempts = 0;
    while (!isSafe && attempts < 100) {
        x = Math.random() * (canvas.width - 200) + 100;
        y = Math.random() * (canvas.height - 200) + 100;
        attempts++;
        const distToShip = Math.hypot(x - ship.x, y - ship.y);
        const tooCloseToOthers = blackHoles.some(bh => Math.hypot(x - bh.x, y - bh.y) < 130);
        if (distToShip > 200 && !tooCloseToOthers) isSafe = true;
    }
    return { x, y };
}

function spawnBlackHoles() {
    blackHoles = [];
    let roundPairs = [activePair];
    let pool = pairs.filter(p => p !== activePair);
    
    // Lấy tối đa 5 lỗ đen
    let count = Math.min(5, pairs.length);
    while (roundPairs.length < count && pool.length > 0) {
        roundPairs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }

    roundPairs.sort(() => Math.random() - 0.5).forEach((p) => {
        let pos = findSafePosition();
        blackHoles.push({
            word: p.targetWord,
            image: p.imageObj,
            isCorrect: p === activePair,
            x: pos.x, y: pos.y, radius: 55,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5
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
    timeLeft -= 1/60;
    document.getElementById('timer').innerText = `Time: ${Math.ceil(timeLeft)}s`;
    if (timeLeft <= 0) endGame('GAME OVER 💀');

    ship.x += (ship.targetX - ship.x) * ship.lerpSpeed;
    ship.y += (ship.targetY - ship.y) * ship.lerpSpeed;
    ship.angle = Math.atan2(ship.targetY - ship.y, ship.targetX - ship.x) + Math.PI/2;

    blackHoles.forEach(bh => {
        bh.x += bh.vx; bh.y += bh.vy;
        if (bh.x < 50 || bh.x > canvas.width - 50) bh.vx *= -1;
        if (bh.y < 50 || bh.y > canvas.height - 50) bh.vy *= -1;

        if (Math.hypot(ship.x - bh.x, ship.y - bh.y) < bh.radius + 15) {
            if (bh.isCorrect) {
                flash('green');
                pairs = pairs.filter(p => p !== activePair);
                nextRound();
            } else {
                flash('red');
                triggerExplosion();
                timeLeft = Math.max(0, timeLeft - 5);
                spawnBlackHoles();
            }
        }
    });
}

function initStars() {
    stars = [];
    for(let i=0; i<80; i++) stars.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, s: Math.random()*2});
}

function flash(color) {
    document.body.className = color === 'red' ? 'flash-red' : 'flash-green';
    setTimeout(() => { document.body.className = ''; }, 150);
}

function triggerExplosion() {
    explosionActive = true;
    setTimeout(() => explosionActive = false, 1000);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ Sao
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    // Vẽ Lỗ đen
    blackHoles.forEach(bh => {
        const grad = ctx.createRadialGradient(bh.x, bh.y, 5, bh.x, bh.y, bh.radius);
        grad.addColorStop(0, '#000');
        grad.addColorStop(0.8, bh.isCorrect ? '#2a0052' : '#2a0052');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius + 10, 0, Math.PI*2);
        ctx.fill();

        if (gameMode === 'JSON' && bh.image && bh.image.complete) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, bh.radius - 5, 0, Math.PI*2);
            ctx.clip();
            ctx.fillStyle = "white";
            ctx.fill();
            const size = (bh.radius - 5) * 2;
            ctx.drawImage(bh.image, bh.x - size/2, bh.y - size/2, size, size);
            ctx.restore();
        } else {
            ctx.fillStyle = "white";
            ctx.font = "bold 16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(bh.word, bh.x, bh.y + 7);
        }
    });

    // Vẽ Phi thuyền
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.fillStyle = "#4a90e2";
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(15, 15); ctx.lineTo(-15, 15);
    ctx.fill();
    ctx.restore();

    // Chữ mục tiêu trên phi thuyền
    if (activePair && gameState === 'PLAYING') {
        ctx.fillStyle = "white";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(activePair.shipWord.toUpperCase(), ship.x, ship.y - 45);
    }

    if (explosionActive) {
        ctx.font = "100px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("💥", canvas.width/2, canvas.height/2);
    }
}

function endGame(msg) {
    gameState = 'END';
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').innerText = msg;
}

initStars();