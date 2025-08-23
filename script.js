import i18n from './i18n.js';

class CentringDisaster {
    constructor() {
        this.draggableObject = document.getElementById('draggableObject');
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.flipCard = this.scoreDisplay.querySelector('.flip-card');
        this.flipCardFront = this.scoreDisplay.querySelector('.flip-card-front .score-text');
        this.flipCardBack = this.scoreDisplay.querySelector('.flip-card-back .score-text');
        this.successOverlay = document.getElementById('successOverlay');
        this.successScore = document.getElementById('successScore');
        this.successText = document.getElementById('successText');
        this.levelComplete = document.getElementById('levelComplete');
        this.nextLevelBtn = document.getElementById('nextLevelBtn');
        this.replayBtn = document.getElementById('replayBtn');
        this.levelDisplay = document.getElementById('levelDisplay');
        this.scoresList = document.getElementById('scoresList');
        this.confettiContainer = document.getElementById('confettiContainer');
        this.celebrationContainer = document.getElementById('celebrationContainer');
        this.bestScoresPanel = document.getElementById('bestScores');
        this.brandTextEl = document.querySelector('.brand-text');
        this.scoresTitleEl = document.querySelector('.scores-title');
        this.copyBtnEl = document.querySelector('.copy-btn');
        this.battleLayer = document.getElementById('battleLayer');
        
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentLevel = 1;
        this.maxLevel = 8;
        this.bestScores = this.loadBestScores();
        this.levelImages = {};
        this.activeFightIntervals = [];
        
        this.fighters = [];
        this.bullets = [];
        this.battleLoopId = null;
        this.targetFighterCount = 10;
        
        this.megaActive = 0;
        this.lastMegaAt = 0;
        this.megaCooldown = 5000;
        this.maxMegaConcurrent = 1;
        
        this.lastRebalanceAt = 0;
        this.rebalanceCooldown = 600;
        
        this.init();
    }
    
    async init() {
        await this.loadLevelImages();
        this.setupEventListeners();
        this.applyI18nStaticTexts();
        this.setupLevel();
        this.updateScoreDisplay();
        this.renderBestScores();
        this.initializeButtonTexts();
    }
    
    async loadLevelImages() {
        const loadPromises = [];
        
        for (let level = 1; level <= this.maxLevel; level++) {
            const loadPromise = new Promise((resolve) => {
                const img = new Image();
                img.src = `images/level${level}.png`;
                
                img.onload = () => {
                    this.levelImages[level] = img;
                    resolve();
                };
                
                img.onerror = () => {
                    img.src = `images/level${level}.gif`;
                    img.onerror = () => {
                        img.src = `images/level${level}.jpg`;
                        img.onerror = () => {
                            img.src = `images/level${level}.svg`;
                            img.onerror = () => {

                                this.levelImages[level] = null;
                                resolve();
                            };
                        };
                    };
                };
            });
            
            loadPromises.push(loadPromise);
        }
        

        await Promise.all(loadPromises);
    }
    
    initializeButtonTexts() {
        this.replayBtn.textContent = i18n.t('replayLevel');
        this.nextLevelBtn.textContent = i18n.t('nextLevel');
        if (this.copyBtnEl) this.copyBtnEl.textContent = i18n.t('copy');
    }
    
    applyI18nStaticTexts() {
        if (this.brandTextEl) this.brandTextEl.textContent = i18n.t('brand');
        if (this.scoresTitleEl) this.scoresTitleEl.textContent = i18n.t('bestScores');
        if (typeof document !== 'undefined') {
            document.title = i18n.t('title');
        }
    }
    
    loadBestScores() {
        const saved = localStorage.getItem('bestScores');
        if (saved) {
            return JSON.parse(saved);
        }
        return {};
    }
    
    saveBestScores() {
        localStorage.setItem('bestScores', JSON.stringify(this.bestScores));
    }
    
    setupEventListeners() {
        this.draggableObject.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        this.draggableObject.addEventListener('touchstart', this.onTouchStart.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this));
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        document.querySelector('.copy-btn').addEventListener('click', this.copyScore.bind(this));
        this.nextLevelBtn.addEventListener('click', this.nextLevel.bind(this));
        this.replayBtn.addEventListener('click', this.replayLevel.bind(this));
        
        this.scoreDisplay.addEventListener('click', this.toggleFlipCard.bind(this));
        
        this.successOverlay.addEventListener('click', (e) => {
            if (e.target === this.successOverlay) {
                return;
            }
        });
    }
    
    onMouseDown(e) {
        this.isDragging = true;
        this.startX = e.clientX - this.draggableObject.offsetLeft;
        this.startY = e.clientY - this.draggableObject.offsetTop;
        this.draggableObject.style.cursor = 'grabbing';
        e.preventDefault();
    }
    
    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const newX = e.clientX - this.startX;
        const newY = e.clientY - this.startY;
        
        this.updateObjectPosition(newX, newY);
        this.updateScoreDisplay();
    }
    
    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.draggableObject.style.cursor = 'grab';
            this.checkCentering();
        }
    }
    
    onTouchStart(e) {
        const touch = e.touches[0];
        this.isDragging = true;
        this.startX = touch.clientX - this.draggableObject.offsetLeft;
        this.startY = touch.clientY - this.draggableObject.offsetTop;
        e.preventDefault();
    }
    
    onTouchMove(e) {
        if (!this.isDragging) return;
        
        const touch = e.touches[0];
        const newX = touch.clientX - this.startX;
        const newY = touch.clientY - this.startY;
        
        this.updateObjectPosition(newX, newY);
        this.updateScoreDisplay();
        e.preventDefault();
    }
    
    onTouchEnd() {
        if (this.isDragging) {
            this.isDragging = false;
            this.checkCentering();
        }
    }
    
    updateObjectPosition(x, y) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const objectSize = this.getObjectSize();
        
        const maxX = windowWidth - objectSize;
        const maxY = windowHeight - objectSize;
        
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        
        this.draggableObject.style.left = x + 'px';
        this.draggableObject.style.top = y + 'px';
    }
    
    applyLevelImage() {
        const img = this.levelImages[this.currentLevel];
        if (img) {
            
            this.draggableObject.style.backgroundImage = `url(${img.src})`;
            this.draggableObject.style.backgroundSize = 'contain';
            this.draggableObject.style.backgroundRepeat = 'no-repeat';
            this.draggableObject.style.backgroundPosition = 'center';
            this.draggableObject.style.backgroundColor = 'transparent';
            this.draggableObject.style.width = '100px';
            this.draggableObject.style.height = '100px';
            this.draggableObject.style.boxShadow = 'none';
            this.draggableObject.style.border = 'none';
            this.draggableObject.style.borderRadius = '0';
        } else {
            
            this.draggableObject.style.backgroundImage = 'none';
            this.draggableObject.style.backgroundColor = this.getDefaultColor();
            this.draggableObject.style.width = this.getObjectSize() + 'px';
            this.draggableObject.style.height = this.getObjectSize() + 'px';
            this.draggableObject.style.boxShadow = '';
            this.draggableObject.style.border = '';
            this.draggableObject.style.borderRadius = '';
        }
    }
    
    getDefaultColor() {
        const colors = {
            1: '#66bb6a', 2: '#ff6b6b', 3: '#9b59b6', 4: '#f1c40f',
            5: '#3498db', 6: '#e91e63', 7: '#00bcd4', 8: '#ff9800'
        };
        return colors[this.currentLevel] || '#66bb6a';
    }
    
    getObjectSize() {
        const sizes = { 
            1: 100, 2: 80, 3: 65, 4: 55, 5: 45, 
            6: 85, 7: 35, 8: 25 
        };
        return sizes[this.currentLevel] || 100;
    }
    
    checkCentering() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const objectRect = this.draggableObject.getBoundingClientRect();
        
        const screenCenterX = windowWidth / 2;
        const screenCenterY = windowHeight / 2;
        
  
        const objectCenterX = objectRect.left + objectRect.width / 2;
        const objectCenterY = objectRect.top + objectRect.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(screenCenterX - objectCenterX, 2) + 
            Math.pow(screenCenterY - objectCenterY, 2)
        );
        
        const maxDistance = Math.sqrt(Math.pow(windowWidth / 2, 2) + Math.pow(windowHeight / 2, 2));
        const score = Math.max(0, 100 - (distance / maxDistance) * 100);
        
        if (distance <= 8) {
            this.onSuccess(score);
        } else {
            this.updateScoreDisplay(score);
        }
    }
    
    onSuccess(score) {
        const currentBest = this.bestScores[this.currentLevel] || 0;
        const isNewBest = score > currentBest;
        
        if (isNewBest) {
            this.bestScores[this.currentLevel] = score;
            this.saveBestScores();
        }
        
        this.playSuccessSound();
        this.createEpicCelebration();
        
        this.successScore.textContent = score.toFixed(1) + '%';
        this.successText.textContent = isNewBest ? i18n.t('newBestScore') : i18n.t('notBestScore');
        this.levelComplete.textContent = i18n.t('levelComplete', { level: this.currentLevel });
        
        if (this.currentLevel < this.maxLevel) {
            this.nextLevelBtn.style.display = 'inline-block';
        } else {
            this.nextLevelBtn.style.display = 'none';
        }
        
        this.successOverlay.style.display = 'flex';
        this.updateScoreDisplay(score);
        this.renderBestScores();
    }
    
    createEpicCelebration() {
        this.createConfetti();
        this.createCelebrationParticles();
        this.showPerfectText();
    }
    
    createConfetti() {
        const colors = ['#f39c12', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#f1c40f'];
        
        for (let i = 0; i < 80; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = (Math.random() * 15 + 8) + 'px';
                confetti.style.height = (Math.random() * 15 + 8) + 'px';
                
                this.confettiContainer.appendChild(confetti);
                
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 4000);
            }, i * 30);
        }
    }
    
    createCelebrationParticles() {
        const colors = ['#f1c40f', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71'];
        
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'celebration-particle';
                particle.style.left = (Math.random() * 100) + 'vw';
                particle.style.top = (Math.random() * 100) + 'vh';
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                particle.style.width = (Math.random() * 20 + 10) + 'px';
                particle.style.height = (Math.random() * 20 + 10) + 'px';
                particle.style.borderRadius = '50%';
                
                this.celebrationContainer.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 2000);
            }, i * 100);
        }
    }
    
    showPerfectText() {
        const perfectText = document.createElement('div');
        perfectText.className = 'perfect-text';
        perfectText.textContent = i18n.t('perfect');
        perfectText.style.left = (Math.random() * 60 + 20) + 'vw';
        perfectText.style.top = (Math.random() * 60 + 20) + 'vh';
        
        this.celebrationContainer.appendChild(perfectText);
        
        setTimeout(() => {
            if (perfectText.parentNode) {
                perfectText.parentNode.removeChild(perfectText);
            }
        }, 2000);
    }
    
    updateScoreDisplay(score = null) {
        if (score !== null) {
            this.flipCardBack.textContent = i18n.t('accuracy', { score: score.toFixed(1) });
        } else {
            this.flipCardBack.textContent = i18n.t('dragInstruction');
        }
    }
    
    toggleFlipCard() {
        this.flipCard.classList.toggle('flipped');
    }
    
    renderBestScores() {
        this.scoresList.innerHTML = '';
        
        for (let level = 1; level <= this.maxLevel; level++) {
            const scoreItem = document.createElement('div');
            scoreItem.className = `score-item ${level === this.currentLevel ? 'current' : ''}`;
            
            const levelInfo = document.createElement('div');
            levelInfo.className = 'level-info';
            
            const levelNumber = document.createElement('div');
            levelNumber.className = 'level-number';
            levelNumber.textContent = i18n.t('level', { level });
            
            const levelScore = document.createElement('div');
            levelScore.className = 'level-score';
            const bestScore = this.bestScores[level];
            levelScore.textContent = bestScore ? `${bestScore.toFixed(1)}%` : i18n.t('noRecord');
            
            levelInfo.appendChild(levelNumber);
            levelInfo.appendChild(levelScore);
            
            const playBtn = document.createElement('button');
            playBtn.className = 'play-btn';
            playBtn.textContent = i18n.t('playLevel');
            
            if (level === 1 || this.bestScores[level - 1]) {
                playBtn.addEventListener('click', () => this.jumpToLevel(level));
                playBtn.disabled = false;
            } else {
                playBtn.disabled = true;
                playBtn.style.opacity = '0.3';
                playBtn.style.cursor = 'not-allowed';
            }
            
            scoreItem.appendChild(levelInfo);
            scoreItem.appendChild(playBtn);
            
            this.scoresList.appendChild(scoreItem);
        }
    }
    
    jumpToLevel(level) {
        this.currentLevel = level;
        this.setupLevel();
        this.renderBestScores();
    }
    
    setupLevel() {
        this.draggableObject.className = 'draggable-object';
        this.applyLevelImage();
        this.randomizeObjectPosition();
        this.renderBestScores();
        this.updateBattleLayerForLevel();
        this.applyZollnerBackground();
    }
    
    nextLevel() {
        if (this.currentLevel < this.maxLevel) {
            this.currentLevel++;
            this.setupLevel();
            this.hideSuccessOverlay();
        }
    }
    
    replayLevel() {
        this.setupLevel();
        this.hideSuccessOverlay();
    }
    
    playSuccessSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    copyScore() {
        const text = i18n.t('shareText', { score: this.successScore.textContent, level: this.currentLevel });
        
        navigator.clipboard.writeText(text).then(() => {
            alert(i18n.t('copied'));
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(i18n.t('copied'));
        });
    }
    
    hideSuccessOverlay() {
        this.successOverlay.style.display = 'none';
    }
    
    randomizeObjectPosition() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const objectSize = this.getObjectSize();
        
        const centerX = windowWidth / 2;
        const centerY = windowHeight / 2;
        
        const safeZone = 100;
        const leftBound = safeZone;
        const rightBound = windowWidth - safeZone - objectSize;
        const topBound = safeZone;
        const bottomBound = windowHeight - safeZone - objectSize;
        
        const forbiddenRects = this.getForbiddenRects();
        
        let x, y;
        let attempts = 0;
        do {
            x = Math.random() * (rightBound - leftBound) + leftBound;
            y = Math.random() * (bottomBound - topBound) + topBound;
            attempts++;
        } while (
            (
                (
                    Math.abs(x - centerX + objectSize/2) < 200 && 
                    Math.abs(y - centerY + objectSize/2) < 200
                ) || this.overlapsForbidden(x, y, objectSize, forbiddenRects)
            ) && attempts < 200
        );
        
        this.draggableObject.style.left = x + 'px';
        this.draggableObject.style.top = y + 'px';
    }
    
    getForbiddenRects() {
        const rects = [];
        const brand = document.querySelector('.brand');
        const score = this.scoreDisplay;
        const best = this.bestScoresPanel;
        if (brand) rects.push(brand.getBoundingClientRect());
        if (score) rects.push(score.getBoundingClientRect());
        if (best) rects.push(best.getBoundingClientRect());
        return rects;
    }
    
    overlapsForbidden(x, y, size, rects) {
        const margin = 12;
        const obj = { left: x - margin, top: y - margin, right: x + size + margin, bottom: y + size + margin };
        return rects.some(r => this.rectsIntersect(obj, r));
    }
    
    rectsIntersect(a, b) {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    updateBattleLayerForLevel() {
        if (!this.battleLayer) return;
        this.clearBattleLayer();
        if (this.currentLevel >= 2) { 
            this.startBattle();
        }
    }

    clearBattleLayer() {
        if (!this.battleLayer) return;
        this.activeFightIntervals.forEach(id => clearInterval(id));
        this.activeFightIntervals = [];
        if (this.battleLoopId) cancelAnimationFrame(this.battleLoopId);
        this.battleLoopId = null;
        this.fighters = [];
        this.bullets = [];
        this.megaActive = 0;
        this.lastRebalanceAt = 0;
        while (this.battleLayer.firstChild) {
            this.battleLayer.removeChild(this.battleLayer.firstChild);
        }
    }

    startBattle() {
        this.targetFighterCount = this.getTargetFighterCountForLevel(this.currentLevel);
        this.spawnToTargetCount();
        this.battleLastTs = performance.now();
        const loop = (ts) => {
            const dt = Math.min(0.05, (ts - this.battleLastTs) / 1000);
            this.battleLastTs = ts;
            this.updateFighters(dt);
            this.updateBullets(dt);
            if (this.currentLevel >= 3) this.updateMegaWeapons(ts, dt);
            this.cullDead();
            this.autoRefill();
            this.rebalanceTeams(ts);
            this.battleLoopId = requestAnimationFrame(loop);
        };
        this.battleLoopId = requestAnimationFrame(loop);
    }

    getTargetFighterCountForLevel(level) {
        if (level < 2) return 0;
        const baseAt2 = 6;
        const count = baseAt2 + (level - 2) * 5; 
        return Math.min(100, count);
    }

    spawnToTargetCount() {
        const forbiddenRects = this.getForbiddenRects();
        if (this.fighters.length === 0 && this.targetFighterCount >= 2) {
            const posR = this.randomSafeBattlePosition(forbiddenRects);
            this.createFighter('red', posR.xPercent, posR.yPercent);
            const posB = this.randomSafeBattlePosition(forbiddenRects);
            this.createFighter('blue', posB.xPercent, posB.yPercent);
        }
        while (this.fighters.length < this.targetFighterCount) {
            const counts = this.getTeamCounts();
            const team = counts.red <= counts.blue ? 'red' : 'blue';
            const pos = this.randomSafeBattlePosition(forbiddenRects);
            this.createFighter(team, pos.xPercent, pos.yPercent);
        }
    }

    autoRefill() {
        if (this.fighters.length < this.targetFighterCount) {
            const forbiddenRects = this.getForbiddenRects();
            const need = this.targetFighterCount - this.fighters.length;
            const counts = this.getTeamCounts();
            for (let i = 0; i < need; i++) {
                const team = counts.red <= counts.blue ? 'red' : 'blue';
                const pos = this.randomSafeBattlePosition(forbiddenRects);
                this.createFighter(team, pos.xPercent, pos.yPercent);
            }
        }
    }

    createFighter(team, xPercent, yPercent) {
        const el = document.createElement('div');
        el.className = `fighter ${team}`;
        el.style.left = xPercent + 'vw';
        el.style.top = yPercent + 'vh';
        this.battleLayer.appendChild(el);

        const fighter = {
            id: Math.random().toString(36).slice(2),
            team,
            el,
            x: (xPercent / 100) * window.innerWidth,
            y: (yPercent / 100) * window.innerHeight,
            angle: Math.random() * Math.PI * 2,
            speed: 40 + Math.random() * 30, // px/s
            hp: 3,
            shootCooldown: Math.random() * 0.6,
            targetId: null
        };
        this.fighters.push(fighter);
        return fighter;
    }

    updateFighters(dt) {
        const redEnemies = this.fighters.filter(f => f.team === 'blue');
        const blueEnemies = this.fighters.filter(f => f.team === 'red');

        for (const f of this.fighters) {
            const enemies = f.team === 'red' ? redEnemies : blueEnemies;
            if (enemies.length === 0) continue;
            let target = null, dmin = Infinity;
            for (const e of enemies) {
                const dx = e.x - f.x; const dy = e.y - f.y; const d2 = dx*dx + dy*dy;
                if (d2 < dmin) { dmin = d2; target = e; }
            }
            if (!target) continue;
            f.targetId = target.id;

            const desiredAngle = Math.atan2(target.y - f.y, target.x - f.x);
            const angleDelta = this.normalizeAngle(desiredAngle - f.angle);
            f.angle += Math.max(-3*dt, Math.min(3*dt, angleDelta));

            const dist = Math.sqrt(dmin);
            const preferred = 120;
            let move = 0;
            if (dist > preferred) move = 1;
            else if (dist < preferred * 0.7) move = -0.5;
            const nx = Math.cos(f.angle), ny = Math.sin(f.angle);
            f.x += nx * f.speed * move * dt;
            f.y += ny * f.speed * move * dt;

            f.x = Math.max(20, Math.min(window.innerWidth - 20, f.x));
            f.y = Math.max(20, Math.min(window.innerHeight - 20, f.y));

            f.shootCooldown -= dt;
            if (f.shootCooldown <= 0 && dist < 420) {
                this.fireBullet(f);
                f.shootCooldown = 0.4 + Math.random() * 0.6;
            }

            elSetTransform(f.el, f.x, f.y, f.angle);
        }

        function elSetTransform(el, x, y, angle) {
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
        }
    }

    fireBullet(fighter) {
        const speed = 360; // px/s
        const life = 1.6; // s
        const bx = fighter.x + Math.cos(fighter.angle) * 10;
        const by = fighter.y + Math.sin(fighter.angle) * 10;
        const el = document.createElement('div');
        el.className = 'bullet';
        el.style.left = bx + 'px';
        el.style.top = by + 'px';
        el.style.transform = `translate(-50%, -50%) rotate(${fighter.angle}rad)`;
        this.battleLayer.appendChild(el);
        this.bullets.push({
            el,
            x: bx,
            y: by,
            vx: Math.cos(fighter.angle) * speed,
            vy: Math.sin(fighter.angle) * speed,
            team: fighter.team,
            ttl: life
        });
    }

    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.ttl -= dt;
            b.el.style.left = b.x + 'px';
            b.el.style.top = b.y + 'px';

            if (b.ttl <= 0 || b.x < -20 || b.y < -20 || b.x > window.innerWidth + 20 || b.y > window.innerHeight + 20) {
                this.removeBulletAt(i);
                continue;
            }

            const targets = this.fighters.filter(f => f.team !== b.team);
            let hitIndex = -1;
            for (let fi = 0; fi < this.fighters.length; fi++) {
                const f = this.fighters[fi];
                if (f.team === b.team) continue;
                const dx = f.x - b.x, dy = f.y - b.y;
                if (dx*dx + dy*dy <= 12*12) { hitIndex = fi; break; }
            }
            if (hitIndex >= 0) {
                const f = this.fighters[hitIndex];
                f.hp -= 1;
                this.spawnHitSpark(f.x, f.y);
                this.removeBulletAt(i);
            }
        }
    }

    removeBulletAt(i) {
        const b = this.bullets[i];
        if (b && b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
        this.bullets.splice(i, 1);
    }

    spawnHitSpark(x, y) {
        const spark = document.createElement('div');
        spark.className = 'hit-spark';
        spark.style.left = x + 'px';
        spark.style.top = y + 'px';
        this.battleLayer.appendChild(spark);
        setTimeout(() => { if (spark.parentNode) spark.parentNode.removeChild(spark); }, 250);
    }

    cullDead() {
        for (let i = this.fighters.length - 1; i >= 0; i--) {
            const f = this.fighters[i];
            if (f.hp <= 0) {
                f.el.classList.add('dead');
                const el = f.el;
                setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
                this.fighters.splice(i, 1);
            }
        }
    }

    spawnFighters() { }

    randomSafeBattlePosition(forbiddenRects) {
        const marginVw = 6;
        const marginVhTop = 18;
        const marginVhBottom = 12;
        let x = 50, y = 50, attempts = 0;
        do {
            x = Math.random() * (100 - marginVw * 2) + marginVw;
            y = Math.random() * (100 - marginVhTop - marginVhBottom) + marginVhTop;
            attempts++;
        } while (this.positionOverlapsUi(x, y, forbiddenRects) && attempts < 200);
        return { xPercent: x, yPercent: y };
    }

    positionOverlapsUi(xPercent, yPercent, rects) {
        const x = (xPercent / 100) * window.innerWidth;
        const y = (yPercent / 100) * window.innerHeight;
        const size = 28;
        const obj = { left: x - size, top: y - size, right: x + size, bottom: y + size };
        return rects.some(r => this.rectsIntersect(obj, r));
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    // ===== Mega Weapons (L3+) =====
    updateMegaWeapons(ts, dt) {
        if (this.megaActive >= this.maxMegaConcurrent) return;
        if (ts - this.lastMegaAt < this.megaCooldown) return;
        if (Math.random() < 0.2) { 
            this.lastMegaAt = ts;
            this.megaActive++;
            if (Math.random() < 0.6) this.triggerExplosion(); else this.triggerLaser();
        }
    }

    triggerExplosion() {
        const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
        const y = Math.random() * window.innerHeight * 0.7 + window.innerHeight * 0.15;
        const el = document.createElement('div');
        el.className = 'mega-explosion';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        this.battleLayer.appendChild(el);

        const radius = 120;
        for (const f of this.fighters) {
            const dx = f.x - x, dy = f.y - y;
            const d2 = dx*dx + dy*dy;
            if (d2 <= radius*radius) {
                f.hp -= 2; 
            }
        }

        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); this.megaActive--; }, 550);
    }

    triggerLaser() {
        const horizontal = Math.random() < 0.5;
        const len = horizontal ? window.innerWidth : window.innerHeight;
        const thickness = 12;
        const pos = horizontal ? (Math.random() * window.innerHeight * 0.7 + window.innerHeight * 0.15) : (Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1);
        const el = document.createElement('div');
        el.className = 'laser-beam';
        if (horizontal) {
            el.style.left = '0px';
            el.style.top = pos + 'px';
            el.style.width = len + 'px';
            el.style.height = thickness + 'px';
        } else {
            el.style.top = '0px';
            el.style.left = pos + 'px';
            el.style.height = len + 'px';
            el.style.width = thickness + 'px';
        }
        this.battleLayer.appendChild(el);

        for (const f of this.fighters) {
            if (horizontal) {
                if (Math.abs(f.y - pos) < thickness * 0.8) f.hp -= 1;
            } else {
                if (Math.abs(f.x - pos) < thickness * 0.8) f.hp -= 1;
            }
        }

        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); this.megaActive--; }, 420);
    }

    rebalanceTeams(ts) {
        const { red, blue } = this.getTeamCounts();
        if (red > 0 && blue > 0) return;
        if (ts - this.lastRebalanceAt < this.rebalanceCooldown) return;
        this.lastRebalanceAt = ts;
        const forbiddenRects = this.getForbiddenRects();
        const missing = red === 0 ? 'red' : 'blue';
        const opponents = this.fighters.filter(f => f.team !== missing);
        const toSpawn = Math.min(5, Math.max(3, Math.floor(this.targetFighterCount * 0.3)));
        for (let i = 0; i < toSpawn; i++) {
            const pos = this.randomSafeBattlePositionAwayFrom(forbiddenRects, opponents, 120);
            this.createFighter(missing, pos.xPercent, pos.yPercent);
        }
    }

    randomSafeBattlePositionAwayFrom(forbiddenRects, enemies, minDist) {
        let tries = 0;
        while (tries < 200) {
            const pos = this.randomSafeBattlePosition(forbiddenRects);
            const x = (pos.xPercent / 100) * window.innerWidth;
            const y = (pos.yPercent / 100) * window.innerHeight;
            let ok = true;
            for (const e of enemies) {
                const dx = e.x - x, dy = e.y - y;
                if (dx*dx + dy*dy < minDist*minDist) { ok = false; break; }
            }
            if (ok) return pos;
            tries++;
        }
        return this.randomSafeBattlePosition(forbiddenRects);
    }

    getTeamCounts() {
        let red = 0, blue = 0;
        for (const f of this.fighters) {
            if (f.team === 'red') red++; else if (f.team === 'blue') blue++;
        }
        return { red, blue };
    }

    applyZollnerBackground() {
        const existingBg = document.querySelector('.zollner-bg');
        if (existingBg) {
            existingBg.remove();
        }

        if (this.currentLevel >= 4) {
            const zollnerBg = document.createElement('div');
            zollnerBg.className = `zollner-bg level-${this.currentLevel}`;
            document.body.appendChild(zollnerBg);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CentringDisaster();
}); 