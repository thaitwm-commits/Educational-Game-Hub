const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');

// --- CẤU HÌNH & TRẠNG THÁI ---
let pairs = [];
let currentPair = null;
let totalPairsStart = 0;
let timeLeft = 0;
let gameState = 'START';
let holes = [];
let moles = [];
let nextCorrectAllowedAt = 0; // Thời điểm sớm nhất cho phép con đúng hiện lên

// Thông số độ khó
let config = {
    visibleMoles: 4,
    popSpeed: 2000, 
    spawnInterval: 1500,
    pauseBetweenCorrect: 1000 // Nghỉ 1 giây trước khi từ đúng mới xuất hiện
};

// --- KHỞI TẠO LƯỚI 8 LỖ ---
function initGrid() {
    holes = [];
    const cols = 4;
    const rows = 2;
    const w = canvas.width / cols;
    const h = (canvas.height - 100) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            holes.push({
                x: c * w + w / 2,
                y: r * h + h / 2 + 80,
                radius: Math.min(w, h) / 2.5 // Đã chỉnh hố to hơn một chút
            });
        }
    }
}

// --- QUẢN LÝ MOLES ---
class Mole {
    constructor(hole) {
        this.hole = hole;
        this.yOffset = hole.radius * 2;
        this.status = 'DOWN';
        this.word = "";
        this.isCorrect = false;
        this.timer = 0;
    }

    spawn(word, isCorrect) {
        this.word = word;
        this.isCorrect = isCorrect;
        this.status = 'RISING';
        this.timer = Date.now();
    }

    update() {
        const speed = 7; // Tăng tốc độ trồi sụt một chút
        if (this.status === 'RISING') {
            this.yOffset -= speed;
            if (this.yOffset <= 0) {
                this.yOffset = 0;
                this.status = 'UP';
                this.timer = Date.now();
            }
        } else if (this.status === 'UP') {
            if (Date.now() - this.timer > config.popSpeed) {
                this.status = 'SINKING';
            }
        } else if (this.status === 'SINKING') {
            this.yOffset += speed;
            if (this.yOffset >= this.hole.radius * 2) {
                this.status = 'DOWN';
            }
        }
    }

    draw() {
        if (this.status === 'DOWN') return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y, this.hole.radius, 0, Math.PI * 2);
        ctx.clip();

        // Vẽ thân Mole
        ctx.fillStyle = "#795548";
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y + this.yOffset, this.hole.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ mắt
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(this.hole.x - 15, this.hole.y + this.yOffset - 10, 5, 0, Math.PI * 2);
        ctx.arc(this.hole.x + 15, this.hole.y + this.yOffset - 10, 5, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ chữ (Đã tăng kích thước lên 24px)
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial"; 
        ctx.textAlign = "center";
        ctx.fillText(this.word, this.hole.x, this.hole.y + this.yOffset + 15);
        ctx.restore();
    }
}

// --- LOGIC TRÒ CHƠI ---
function startGame(data) {
    pairs = data;
    totalPairsStart = data.length;
    timeLeft = 30; 
    gameState = 'PLAYING';
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game-info').classList.remove('hidden');
    
    initGrid();
    moles = holes.map(h => new Mole(h));
    nextPair();
    requestAnimationFrame(gameLoop);
}

function nextPair() {
    if (pairs.length === 0) return endGame("CHIẾN THẮNG!");
    currentPair = pairs[Math.floor(Math.random() * pairs.length)];
    document.querySelector('#target-word span').innerText = currentPair.wordA;
    
    // Đặt thời gian nghỉ trước khi từ đúng mới xuất hiện
    nextCorrectAllowedAt = Date.now() + config.pauseBetweenCorrect;
    
    timeLeft += 15;
    updateDifficulty();
}

function updateDifficulty() {
    const progress = (totalPairsStart - pairs.length) / totalPairsStart;
    if (progress >= 0.75) { config.visibleMoles = 7; config.popSpeed = 1000; }
    else if (progress >= 0.5) { config.visibleMoles = 6; config.popSpeed = 1300; }
    else if (progress >= 0.25) { config.visibleMoles = 5; config.popSpeed = 1600; }
}

function spawnLogic() {
    const activeCount = moles.filter(m => m.status === 'RISING' || m.status === 'UP').length;

    if (activeCount < config.visibleMoles) {
        const availableMoles = moles.filter(m => m.status === 'DOWN');
        
        if (availableMoles.length > 0) {
            const mole = availableMoles[Math.floor(Math.random() * availableMoles.length)];
            
            // Kiểm tra xem đã có con đúng chưa và đã hết thời gian chờ chưa
            const hasCorrect = moles.some(m => (m.status === 'RISING' || m.status === 'UP') && m.isCorrect);
            const isDelayOver = Date.now() > nextCorrectAllowedAt;

            if (!hasCorrect && isDelayOver) {
                mole.spawn(currentPair.wordB, true);
            } else {
                // Chỉ mọc con sai để gây nhiễu
                const distractors = pairs.map(p => p.wordB).filter(w => w !== currentPair.wordB);
                const randomWord = distractors.length > 0 
                    ? distractors[Math.floor(Math.random() * distractors.length)] 
                    : "...";
                mole.spawn(randomWord, false);
            }
        }
    }
}

// --- XỬ LÝ CLICK/TOUCH ---
canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    moles.forEach(m => {
        if (m.status === 'RISING' || m.status === 'UP') {
            const dist = Math.hypot(x - m.hole.x, y - (m.hole.y + m.yOffset));
            if (dist < m.hole.radius) {
                handleHit(m);
            }
        }
    });
});

function handleHit(mole) {
    if (mole.isCorrect) {
        flashScreen('flash-green');
        showEmoji("❤️"); // Hiện tim khi đúng
        pairs = pairs.filter(p => p !== currentPair);
        mole.status = 'SINKING';
        nextPair();
    } else {
        flashScreen('flash-red');
        showEmoji("😛"); // Hiện lêu lêu khi sai
        timeLeft -= 10; // Phạt 10 giây
        mole.status = 'SINKING';
    }
}

function flashScreen(className) {
    document.body.classList.add(className);
    setTimeout(() => document.body.classList.remove(className), 200);
}

function showEmoji(emoji) {
    const el = document.getElementById('overlay-msg');
    el.innerText = emoji;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 1500); // Hiện 1.5s
}

// --- VÒNG LẶP GAME ---
function gameLoop() {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    timeLeft -= 1/60;
    document.getElementById('timer').innerText = `Thời gian: ${Math.max(0, Math.ceil(timeLeft))}s`;
    if (timeLeft <= 0) return endGame("HẾT GIỜ!");

    // Vẽ hố
    holes.forEach(h => {
        ctx.fillStyle = "#1a5e3a";
        ctx.beginPath();
        ctx.ellipse(h.x, h.y + 5, h.radius, h.radius/3, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    spawnLogic();

    moles.forEach(m => {
        m.update();
        m.draw();
    });

    requestAnimationFrame(gameLoop);
}

function endGame(msg) {
    gameState = 'END';
    alert(msg);
    location.reload();
}

// --- FILE LOADING ---
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        const lines = event.target.result.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lines.length % 2 !== 0 || lines.length > 120) {
            document.getElementById('error-msg').innerText = "File không hợp lệ.";
            return;
        }
        const data = [];
        for (let i = 0; i < lines.length; i += 2) {
            data.push({ wordA: lines[i], wordB: lines[i+1] });
        }
        startGame(data);
    };
    reader.readAsText(file);
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameState === 'PLAYING') initGrid();
});
window.dispatchEvent(new Event('resize'));