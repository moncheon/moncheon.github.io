// ========================================
// Scroll Animation for Hero Section
// ========================================

let lastScrollY = 0;
const hero = document.getElementById('hero');
const skyLayer = document.querySelector('.sky-layer');
const lakeLayer = document.querySelector('.lake-layer');
const treeLayer = document.querySelector('.tree-layer');
const grassLayer = document.querySelector('.grass-layer');

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const heroHeight = hero.offsetHeight;
    const scrollProgress = Math.min(scrollY / heroHeight, 1);

    // Sky moves up faster (parallax effect)
    if (skyLayer) {
        skyLayer.style.transform = `translateY(${scrollProgress * -150}px)`;
    }

    // Lake comes closer (moves down slower)
    if (lakeLayer) {
        lakeLayer.style.transform = `translateY(${scrollProgress * 100}px) scale(${1 + scrollProgress * 0.3})`;
    }

    // Trees sway more as you scroll
    if (treeLayer) {
        treeLayer.style.transform = `translateY(${scrollProgress * 80}px) scale(${1 + scrollProgress * 0.2})`;
    }

    // Grass comes closer (moves down)
    if (grassLayer) {
        grassLayer.style.transform = `translateY(${scrollProgress * 120}px) scale(${1 + scrollProgress * 0.4})`;
    }

    lastScrollY = scrollY;
});

// ========================================
// Navigation Bar Scroll Effect
// ========================================

const nav = document.getElementById('globalNav');
let navTimeout;

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        nav.style.backgroundColor = 'rgba(51, 51, 51, 0.95)';
        nav.style.backdropFilter = 'blur(10px)';
    } else {
        nav.style.backgroundColor = '#333';
        nav.style.backdropFilter = 'none';
    }
});

// ========================================
// Character Drag and Drop Functionality
// ========================================

class Character {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        if (!this.element) return;

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.offsetY = 0;

        this.init();
    }

    init() {
        // Mouse events
        this.element.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Touch events for mobile
        this.element.addEventListener('touchstart', (e) => this.startDrag(e));
        document.addEventListener('touchmove', (e) => this.drag(e));
        document.addEventListener('touchend', () => this.endDrag());

        // Random initial walk animation
        this.randomWalk();
    }

    startDrag(e) {
        this.isDragging = true;
        this.element.style.cursor = 'grabbing';
        this.element.style.zIndex = '1000';

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        const rect = this.element.getBoundingClientRect();
        this.offsetX = clientX - rect.left;
        this.offsetY = clientY - rect.top;

        // Stop random walk when dragging
        if (this.walkInterval) {
            clearInterval(this.walkInterval);
        }
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        const gameCanvas = document.getElementById('gameCanvas');
        const canvasRect = gameCanvas.getBoundingClientRect();

        // Calculate new position relative to the game canvas
        let newX = clientX - canvasRect.left - this.offsetX;
        let newY = clientY - canvasRect.top - this.offsetY;

        // Boundary checking
        const charWidth = this.element.offsetWidth;
        const charHeight = this.element.offsetHeight;

        newX = Math.max(0, Math.min(newX, canvasRect.width - charWidth));
        newY = Math.max(0, Math.min(newY, canvasRect.height - charHeight));

        this.element.style.left = newX + 'px';
        this.element.style.top = newY + 'px';
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.element.style.cursor = 'grab';
        this.element.style.zIndex = 'auto';

        // Resume random walk after dragging
        this.randomWalk();
    }

    randomWalk() {
        // Random walk animation - characters walk around randomly
        if (this.walkInterval) {
            clearInterval(this.walkInterval);
        }

        this.walkInterval = setInterval(() => {
            if (this.isDragging) return;

            const gameCanvas = document.getElementById('gameCanvas');
            if (!gameCanvas) return;

            const canvasRect = gameCanvas.getBoundingClientRect();
            const currentLeft = parseInt(this.element.style.left) || 0;
            const currentTop = parseInt(this.element.style.top) || 0;

            // Random movement
            const moveX = (Math.random() - 0.5) * 50;
            const moveY = (Math.random() - 0.5) * 50;

            let newX = currentLeft + moveX;
            let newY = currentTop + moveY;

            // Boundary checking
            const charWidth = this.element.offsetWidth;
            const charHeight = this.element.offsetHeight;

            newX = Math.max(0, Math.min(newX, canvasRect.width - charWidth));
            newY = Math.max(0, Math.min(newY, canvasRect.height - charHeight));

            // Smooth transition
            this.element.style.transition = 'left 2s ease-in-out, top 2s ease-in-out';
            this.element.style.left = newX + 'px';
            this.element.style.top = newY + 'px';

            // Remove transition for dragging
            setTimeout(() => {
                if (!this.isDragging) {
                    this.element.style.transition = '';
                }
            }, 2000);

        }, 3000); // Move every 3 seconds
    }
}

// Initialize characters when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const char1 = new Character('char1');
    const char2 = new Character('char2');
    const char3 = new Character('char3');
});

// ========================================
// Smooth Scroll for Navigation Links
// ========================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const navHeight = document.getElementById('globalNav').offsetHeight;
            const targetPosition = targetElement.offsetTop - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ========================================
// Add subtle animations on scroll into view
// ========================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe sections for fade-in animation
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.vision-section, .game-section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });
});
