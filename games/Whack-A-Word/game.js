const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');

// --- TÀI NGUYÊN ---
const boardImg = new Image();
boardImg.src = 'board.png'; 

// --- CẤU HÌNH & TRẠNG THÁI ---
let pairs = [];
let currentPair = null;
let totalPairsStart = 0;
let timeLeft = 0;
let gameState = 'START';
let holes = [];
let moles = [];
let nextCorrectAllowedAt = 0;
let gameMode = 'TXT'; 

let config = {
    visibleMoles: 4,
    popSpeed: 2000, 
    spawnInterval: 1500,
    pauseBetweenCorrect: 1000
};

// --- KHỞI TẠO LƯỚI ---
function initGrid() {
    holes = [];
    const cols = 4;
    const rows = 2;
    const w = canvas.width / cols;
    // Chỉnh lại chiều cao hố để không đè lên bảng ở góc trái
    const h = (canvas.height - 120) / rows; 

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            holes.push({
                x: c * w + w / 2,
                y: r * h + h / 2 + 100, 
                radius: Math.min(w, h) / 3
            });
        }
    }
}

// --- LỚP MOLE (CHUỘT) ---
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
        this.yOffset = this.hole.radius * 2;
        this.timer = Date.now();
    }

    update() {
        const speed = 8;
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
                this.yOffset = this.hole.radius * 2;
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

        ctx.fillStyle = "#795548";
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y + this.yOffset, this.hole.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeText(this.word, this.hole.x, this.hole.y + this.yOffset + 10);
        ctx.fillText(this.word, this.hole.x, this.hole.y + this.yOffset + 10);
        
        ctx.restore();
    }
}

// --- VẼ BẢNG MỤC TIÊU (GÓC TRÁI & NHỎ HƠN) ---
function drawBoard() {
    const bW = 110; // Giảm kích thước bảng
    const bH = 110;
    const bX = 30;  // Đặt ở bên trái
    const bY = 30;  // Đặt ở trên cùng

    if (boardImg.complete) {
        ctx.drawImage(boardImg, bX, bY, bW, bH);
    }

    if (!currentPair) return;

    if (gameMode === 'JSON' && currentPair.imgObj) {
        // Ảnh con nhỏ hơn board một chút để lộ viền board
        const padding = 12;
        ctx.drawImage(currentPair.imgObj, bX + padding, bY + padding, bW - padding * 2, bH - padding * 2);
    } else {
        // Vẽ chữ mục tiêu (Chữ đen highlight trắng)
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.strokeText(currentPair.wordA, bX + bW/2, bY + bH/2);
        
        ctx.fillStyle = "black";
        ctx.fillText(currentPair.wordA, bX + bW/2, bY + bH/2);
    }
}

// --- CÁC LOGIC CÒN LẠI (GIỮ NGUYÊN & CẬP NHẬT TRỪ 30S) ---

function startGame(data) {
    pairs = data;
    totalPairsStart = data.length;
    timeLeft = 40; 
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
    nextCorrectAllowedAt = Date.now() + config.pauseBetweenCorrect;
}

function spawnLogic() {
    const activeCount = moles.filter(m => m.status !== 'DOWN').length;
    if (activeCount < config.visibleMoles) {
        const availableMoles = moles.filter(m => m.status === 'DOWN');
        if (availableMoles.length > 0) {
            const mole = availableMoles[Math.floor(Math.random() * availableMoles.length)];
            const hasCorrect = moles.some(m => m.status !== 'DOWN' && m.isCorrect);
            if (!hasCorrect && Date.now() > nextCorrectAllowedAt) {
                mole.spawn(currentPair.wordB, true);
            } else {
                const distractors = pairs.map(p => p.wordB).filter(w => w !== currentPair.wordB);
                const randomWord = distractors.length > 0 ? distractors[Math.floor(Math.random() * distractors.length)] : "...";
                mole.spawn(randomWord, false);
            }
        }
    }
}

function triggerTableShake() {
    canvas.classList.add('shake');
    moles.forEach(m => { if (m.status !== 'DOWN') m.status = 'SINKING'; });
    setTimeout(() => { canvas.classList.remove('shake'); }, 800);
}

canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    moles.forEach(m => {
        if (m.status === 'RISING' || m.status === 'UP') {
            const dist = Math.hypot(x - m.hole.x, y - (m.hole.y + m.yOffset));
            if (dist < m.hole.radius) {
                if (m.isCorrect) {
                    flashScreen('flash-green');
                    showEmoji("❤️");
                    pairs = pairs.filter(p => p !== currentPair);
                    m.status = 'SINKING';
                    nextPair();
                } else {
                    flashScreen('flash-red');
                    showEmoji("😛");
                    timeLeft = Math.max(0, timeLeft - 10); 
                    triggerTableShake();
                }
            }
        }
    });
});

function flashScreen(className) {
    document.body.classList.add(className);
    setTimeout(() => document.body.classList.remove(className), 200);
}

function showEmoji(emoji) {
    const el = document.getElementById('overlay-msg');
    el.innerText = emoji;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 1000);
}

function gameLoop() {
    if (gameState !== 'PLAYING') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    timeLeft -= 1/60;
    document.getElementById('timer').innerText = `Thời gian: ${Math.max(0, Math.ceil(timeLeft))}s`;
    if (timeLeft <= 0) return endGame("HẾT GIỜ!");

    holes.forEach(h => {
        ctx.fillStyle = "#1a5e3a";
        ctx.beginPath();
        ctx.ellipse(h.x, h.y + 5, h.radius, h.radius/3, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    drawBoard();
    spawnLogic();
    moles.forEach(m => { m.update(); m.draw(); });
    requestAnimationFrame(gameLoop);
}

function endGame(msg) {
    gameState = 'END';
    alert(msg);
    location.reload();
}

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target.result;
        const data = [];
        if (file.name.endsWith('.json')) {
            gameMode = 'JSON';
            try {
                const json = JSON.parse(content);
                json.forEach(item => {
                    const img = new Image();
                    img.src = item.url;
                    data.push({ wordA: item.en, wordB: item.en, imgObj: img });
                });
            } catch(err) { alert("Lỗi JSON"); return; }
        } else {
            gameMode = 'TXT';
            const lines = content.split(/\r?\n/).filter(l => l.trim() !== "");
            for (let i = 0; i < lines.length; i += 2) {
                if(lines[i+1]) data.push({ wordA: lines[i], wordB: lines[i+1] });
            }
        }
        if (data.length > 0) startGame(data);
    };
    reader.readAsText(file);
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameState === 'PLAYING') initGrid();
});
window.dispatchEvent(new Event('resize'));