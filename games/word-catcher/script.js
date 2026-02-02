const fileInput = document.getElementById('file-input');
const basket = document.getElementById('basket');
const basketWordDisplay = document.getElementById('basket-word');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const flashOverlay = document.getElementById('flash-overlay');
const ghost = document.getElementById('ghost-scare');

let phrasalVerbs = []; 
let currentPairs = [];
let completedVerbs = [];
let targetPair = null;
let gameTime = 0;
let basketX = window.innerWidth / 2;
let moveDir = 0; 
let gameActive = false;
let gameMode = 'txt'; // 'txt' hoặc 'json'

const emojis = ['📦', '⭐', '🍀', '💎', '🍎'];

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const content = evt.target.result;
        if (file.name.endsWith('.json')) {
            phrasalVerbs = JSON.parse(content);
            gameMode = 'json';
        } else {
            const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
            phrasalVerbs = [];
            for (let i = 0; i < lines.length; i += 2) {
                if (lines[i+1]) phrasalVerbs.push({ v: lines[i], p: lines[i+1] });
            }
            gameMode = 'txt';
        }
        startGame();
    };
    reader.readAsText(file);
});

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameActive = true;
    currentPairs = [...phrasalVerbs];
    completedVerbs = [];
    // Tính thời gian: 15s mỗi từ
    gameTime = currentPairs.length * 15;
    setNextTarget();
    
    // Movement Loop (60fps) - Giữ cơ chế cũ mượt mà
    function moveLoop() {
        if (!gameActive) return;
        if (moveDir !== 0) {
            basketX += moveDir * 10; // Tốc độ di chuyển cố định
            basketX = Math.max(50, Math.min(window.innerWidth - 50, basketX));
            basket.style.left = basketX + 'px';
        }
        requestAnimationFrame(moveLoop);
    }
    requestAnimationFrame(moveLoop);

    // Timer
    const timerInterval = setInterval(() => {
        if (!gameActive) return clearInterval(timerInterval);
        gameTime--;
        timerDisplay.innerText = `Thời gian: ${gameTime}s`;
        if (gameTime <= 0) endGame(false);
    }, 1000);

    // Spawner
    const spawnInterval = setInterval(() => {
        if (!gameActive) return clearInterval(spawnInterval);
        spawnParticle();
    }, 1500);

    initControls();
}

function initControls() {
    document.addEventListener('keydown', (e) => {
        if (e.key === "ArrowLeft") moveDir = -1;
        if (e.key === "ArrowRight") moveDir = 1;
    });
    document.addEventListener('keyup', () => moveDir = 0);

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const startMove = (dir) => moveDir = dir;
    const stopMove = () => moveDir = 0;

    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(-1); });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(1); });
    btnLeft.addEventListener('touchend', stopMove);
    btnRight.addEventListener('touchend', stopMove);
}

function setNextTarget() {
    if (currentPairs.length > 0) {
        // Chọn ngẫu nhiên từ danh sách còn lại (Cơ chế bản cũ)
        const randIndex = Math.floor(Math.random() * currentPairs.length);
        targetPair = currentPairs[randIndex];
        
        // Hiển thị chữ lên giỏ
        const displayWord = gameMode === 'json' ? targetPair.en : targetPair.v;
        basketWordDisplay.innerText = displayWord.toUpperCase();
        
        scoreDisplay.innerText = `Hoàn thành: ${completedVerbs.length}/${phrasalVerbs.length}`;
    } else {
        endGame(true);
    }
}

function spawnParticle() {
    if (!targetPair) return;
    const isCorrect = Math.random() < 0.4;
    
    // Lấy dữ liệu rơi (đúng hoặc sai)
    let dropData;
    if (isCorrect) {
        dropData = targetPair;
    } else {
        dropData = phrasalVerbs[Math.floor(Math.random() * phrasalVerbs.length)];
    }

    const el = document.createElement('div');
    el.className = 'falling-item';
    
    if (gameMode === 'json') {
        el.innerHTML = `<img src="${dropData.url}">`;
        el.dataset.val = dropData.en;
    } else {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        el.innerHTML = `${emoji}<br>${dropData.p.toUpperCase()}`;
        el.dataset.val = dropData.p;
    }

    el.style.left = Math.random() * (window.innerWidth - 100) + 50 + 'px';
    el.style.top = '-100px';
    document.getElementById('game-container').appendChild(el);

    let top = -100;
    const speed = 3 + Math.random() * 2;
    
    function fall() {
        if (!gameActive) return el.remove();
        top += speed;
        el.style.top = top + 'px';

        if (checkHit(basket, el)) {
            const correctVal = gameMode === 'json' ? targetPair.en : targetPair.p;
            if (el.dataset.val === correctVal) {
                handleCorrect();
            } else {
                handleWrong();
            }
            el.remove();
        } else if (top > window.innerHeight) {
            el.remove();
        } else {
            requestAnimationFrame(fall);
        }
    }
    requestAnimationFrame(fall);
}

function checkHit(a, b) {
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function handleCorrect() {
    triggerEffect('green');
    const entry = gameMode === 'json' ? targetPair.en : `${targetPair.v} ${targetPair.p}`;
    completedVerbs.push(entry);
    currentPairs = currentPairs.filter(p => p !== targetPair);
    setNextTarget();
}

function handleWrong() {
    triggerEffect('red');
    ghost.classList.add('ghost-appear');
    setTimeout(() => ghost.classList.remove('ghost-appear'), 500);
}

function triggerEffect(type) {
    flashOverlay.className = 'flash-' + type;
    setTimeout(() => flashOverlay.className = '', 200);
}

function endGame(win) {
    gameActive = false;
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').innerText = win ? "CHIẾN THẮNG!" : "HẾT GIỜ!";
    document.getElementById('verb-list').innerHTML = completedVerbs.map(v => `<div>✅ ${v}</div>`).join('');
}