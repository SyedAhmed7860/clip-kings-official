const fs = require('fs');
const file = 'assets/js/script.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Re-enable Barba
content = content.replace(/if \(false && typeof barba !== 'undefined'\)/, "if (typeof barba !== 'undefined')");

// 2. Fix document.getElementById -> container.querySelector in initPageScripts
// We will do this carefully using regex replacements inside initPageScripts only
let initPageScriptsIndex = content.indexOf('function initPageScripts(container) {');
let preloaderIndex = content.indexOf('function initialPreloader() {');

let beforeScripts = content.substring(0, initPageScriptsIndex);
let scriptsBlock = content.substring(initPageScriptsIndex, preloaderIndex);
let afterScripts = content.substring(preloaderIndex);

// Replacements inside scriptsBlock
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('hero-video'\)/g, "container.querySelector('#hero-video')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('hero-section'\)/g, "container.querySelector('#hero-section')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('audio-btn'\)/g, "container.querySelector('#audio-btn')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('audio-icon-muted'\)/g, "container.querySelector('#audio-icon-muted')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('audio-icon-playing'\)/g, "container.querySelector('#audio-icon-playing')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('timeline-progress'\)/g, "container.querySelector('#timeline-progress')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('timeline-section'\)/g, "container.querySelector('#timeline-section')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('stats-section'\)/g, "container.querySelector('#stats-section')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('video-modal'\)/g, "container.querySelector('#video-modal') || document.getElementById('video-modal')"); // Modal might be outside container
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('modal-video'\)/g, "container.querySelector('#modal-video') || document.getElementById('modal-video')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\('close-modal'\)/g, "container.querySelector('#close-modal') || document.getElementById('close-modal')");
scriptsBlock = scriptsBlock.replace(/document\.getElementById\(targetId\)/g, "container.querySelector('#' + targetId)");

// Sticky Header is outside container, so document.getElementById is correct. 
// But we must wrap the scroll listener so it doesn't duplicate.
scriptsBlock = scriptsBlock.replace(/window\.addEventListener\('scroll', \(\) => \{\n\s*if \(window\.scrollY > 40\) header\.classList\.add\('scrolled'\);\n\s*else header\.classList\.remove\('scrolled'\);\n\s*\}\);/,
`if (!window.headerScrollBound) {
            window.headerScrollBound = true;
            window.addEventListener('scroll', () => {
                if (window.scrollY > 40) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            });
        }`);

// Cursor duplication fix
beforeScripts = beforeScripts.replace(/const moveCursor = \(e\) => \{/, "if (window.cursorInitialized) return; window.cursorInitialized = true;\n            const moveCursor = (e) => {");

// Make bindCursorElements function
scriptsBlock = scriptsBlock.replace(/initCursor\(\);/,
`initCursor();
        // Bind interactive elements inside container to cursor
        const cursorDot = document.querySelector('.cursor-dot');
        const scissorTop = document.querySelector('.scissor-top-blade');
        const scissorBottom = document.querySelector('.scissor-bottom-blade');
        const scissorSvg = document.querySelector('.scissor-cursor');
        if (cursorDot && scissorTop) {
            const interactives = container.querySelectorAll('a, button, .magnetic, input[type="range"], .google-review-card, .ig-post, .video-testimonial, .horizontal-scroll-item');
            interactives.forEach(el => {
                el.style.cursor = 'none';
                el.addEventListener('mouseenter', () => {
                    cursorDot.classList.add('is-hovering');
                    gsap.to(scissorTop, { rotation: -25, duration: 0.2, ease: "power2.out" });
                    gsap.to(scissorBottom, { rotation: 25, duration: 0.2, ease: "power2.out" });
                    gsap.to(scissorSvg, { scale: 1.15, duration: 0.2 });
                });
                el.addEventListener('mouseleave', () => {
                    cursorDot.classList.remove('is-hovering');
                    gsap.to(scissorTop, { rotation: -10, duration: 0.2 });
                    gsap.to(scissorBottom, { rotation: 10, duration: 0.2 });
                    gsap.to(scissorSvg, { scale: 1, duration: 0.2 });
                });
            });
        }`
);

// Remove interactive element binding from initCursor since it's now in initPageScripts
beforeScripts = beforeScripts.replace(/const interactives = document\.querySelectorAll[\s\S]*?\}\);\n\s*\}\);/, '');

fs.writeFileSync('assets/js/script2.js', beforeScripts + scriptsBlock + afterScripts);
console.log('Done refactoring');
