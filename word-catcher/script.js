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
let moveDir = 0; // -1: trái, 1: phải, 0: đứng yên
let gameInterval, spawnInterval, moveInterval;

const emojis = ['📦', '👻', '🧩', '⭐', '🍀'];

fileInput.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
        const lines = evt.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
        if (lines.length > 120) return alert("Quá 120 dòng!");
        for (let i = 0; i < lines.length; i += 2) {
            if (lines[i+1]) phrasalVerbs.push({ v: lines[i], p: lines[i+1] });
        }
        startGame();
    };
    reader.readAsText(e.target.files[0]);
});

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    currentPairs = [...phrasalVerbs];
    gameTime = currentPairs.length * 10;
    setNextTarget();
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === "ArrowLeft") moveDir = -1;
        if (e.key === "ArrowRight") moveDir = 1;
    });
    document.addEventListener('keyup', () => moveDir = 0);

    // iPad Touch controls
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const startMove = (dir) => moveDir = dir;
    const stopMove = () => moveDir = 0;

    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(-1); });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(1); });
    btnLeft.addEventListener('touchend', stopMove);
    btnRight.addEventListener('touchend', stopMove);

    // Vòng lặp di chuyển (mượt hơn cho iPad)
    moveInterval = setInterval(() => {
        if (moveDir !== 0) {
            basketX += moveDir * 8;
            basketX = Math.max(50, Math.min(window.innerWidth - 50, basketX));
            basket.style.left = basketX + 'px';
        }
    }, 16);

    gameInterval = setInterval(() => {
        gameTime--;
        timerDisplay.innerText = `Thời gian: ${gameTime}s`;
        if (gameTime <= 0) endGame(false);
    }, 1000);

    spawnInterval = setInterval(spawnParticle, 1500);
}

function setNextTarget() {
    if (currentPairs.length > 0) {
        targetPair = currentPairs[Math.floor(Math.random() * currentPairs.length)];
        basketWordDisplay.innerText = targetPair.v.toUpperCase();
        scoreDisplay.innerText = `Hoàn thành: ${completedVerbs.length}/${phrasalVerbs.length}`;
    } else {
        endGame(true);
    }
}

function spawnParticle() {
    if (!targetPair) return;
    const isCorrect = Math.random() < 0.4;
    const text = isCorrect ? targetPair.p : phrasalVerbs[Math.floor(Math.random() * phrasalVerbs.length)].p;
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    const el = document.createElement('div');
    el.className = 'falling-word';
    el.innerHTML = `${emoji}<br>${text}`; // Hiển thị emoji phía sau/trên chữ
    el.style.left = Math.random() * (window.innerWidth - 100) + 50 + 'px';
    el.style.top = '-60px';
    el.dataset.val = text;
    document.getElementById('game-container').appendChild(el);

    let top = -60;
    const speed = 3 + Math.random() * 2;
    const fall = setInterval(() => {
        top += speed;
        el.style.top = top + 'px';
        if (checkHit(basket, el)) {
            if (el.dataset.val === targetPair.p) {
                triggerEffect('green');
                completedVerbs.push(`${targetPair.v} ${targetPair.p}`);
                currentPairs = currentPairs.filter(p => p !== targetPair);
                setNextTarget();
            } else {
                triggerEffect('red');
            }
            clearInterval(fall); el.remove();
        }
        if (top > window.innerHeight) { clearInterval(fall); el.remove(); }
    }, 20);
}

function checkHit(a, b) {
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function triggerEffect(type) {
    flashOverlay.className = 'flash-' + type;
    if (type === 'red') {
        ghost.classList.add('ghost-appear');
        setTimeout(() => ghost.classList.remove('ghost-appear'), 5000);
    }
    setTimeout(() => flashOverlay.className = '', 200);
}

function endGame(win) {
    clearInterval(gameInterval); clearInterval(spawnInterval); clearInterval(moveInterval);
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').innerText = win ? "CHIẾN THẮNG!" : "HẾT GIỜ!";
    document.getElementById('verb-list').innerHTML = completedVerbs.map(v => `<div>${v}</div>`).join('');
}