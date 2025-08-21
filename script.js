import i18n from './i18n.js';

class CentringDisaster {
    constructor() {
        this.draggableObject = document.getElementById('draggableObject');
        this.scoreDisplay = document.getElementById('scoreDisplay');
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
        
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentLevel = 1;
        this.maxLevel = 8;
        this.bestScores = this.loadBestScores();
        this.levelImages = {};
        
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
            this.scoreDisplay.querySelector('.score-text').textContent = 
                i18n.t('accuracy', { score: score.toFixed(1) });
        } else {
            this.scoreDisplay.querySelector('.score-text').textContent = 
                i18n.t('dragInstruction');
        }
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
}

document.addEventListener('DOMContentLoaded', () => {
    new CentringDisaster();
}); 