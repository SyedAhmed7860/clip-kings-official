"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. GLOBALS & CENTRALIZED MANAGERS
    // ==========================================
    const isMobile = window.innerWidth <= 768;
    const siteHeader = document.querySelector('.site-header') || document.querySelector('#header');
    let lenis;
    
    // Feature detection for fine pointers
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    // Centralized Resize Manager (Debounced to prevent Layout Thrashing)
    let resizeTimer;
    let lastWidth = window.innerWidth;
    const resizeCallbacks = [];

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const newWidth = window.innerWidth;
            if (newWidth !== lastWidth) {
                lastWidth = newWidth;
                resizeCallbacks.forEach(cb => cb(newWidth));
            }
        }, 250);
    }, { passive: true });

    // Dynamic Header Height Calculation
    function updateHeaderHeight() {
        const annBar = document.querySelector('.announcement-bar');
        const hHeight = siteHeader ? siteHeader.offsetHeight : 0;
        const aHeight = annBar ? annBar.offsetHeight : 0;
        document.documentElement.style.setProperty('--header-height', hHeight + 'px');
        document.documentElement.style.setProperty('--announcement-height', aHeight + 'px');
        document.documentElement.style.setProperty('--total-header-height', (hHeight + aHeight) + 'px');
    }
    
    resizeCallbacks.push(updateHeaderHeight);
    updateHeaderHeight();

    // Setup Current Year
    const yearElement = document.getElementById('year');
    if (yearElement) yearElement.textContent = new Date().getFullYear();

    // ==========================================
    // 1. INIT LENIS SMOOTH SCROLL
    // ==========================================
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        
        resizeCallbacks.push(() => {
            ScrollTrigger.refresh();
        });
    }

    // ==========================================
    // 2. CENTRALIZED SCROLL MANAGER
    // ==========================================
    let globalScrollY = window.scrollY;
    let lastScrollY = globalScrollY;
    let lastScrollTime = Date.now();
    let exitIntentFired = sessionStorage.getItem('exitIntentFired') === 'true';
    const exitPopup = document.getElementById('exit-popup');

    function handleGlobalScroll(e) {
        globalScrollY = window.scrollY;
        const currentTime = Date.now();
        const diffY = globalScrollY - lastScrollY;
        const diffT = currentTime - lastScrollTime;

        // Sticky Header Logic
        if (siteHeader) {
            if (globalScrollY > 40) siteHeader.classList.add('scrolled');
            else siteHeader.classList.remove('scrolled');
        }

        // Mobile Exit Intent (Fast scroll up or scroll depth)
        if (isMobile && exitPopup && !exitIntentFired) {
            if (diffY < -50 && diffT < 100) { 
                triggerExitPopup(); 
            }
            const docHeight = document.body.offsetHeight;
            if ((globalScrollY + window.innerHeight) / docHeight > 0.75) {
                triggerExitPopup();
            }
        }

        lastScrollY = globalScrollY;
        lastScrollTime = currentTime;
    }

    lenis.on('scroll', handleGlobalScroll);

    // ==========================================
    // 3. THREE.JS GLOBAL BACKGROUND
    // ==========================================
    let scene, camera, renderer, particles;
    
    function initThreeJS() {
        if (typeof THREE === 'undefined' || isMobile) return; 
        
        let canvas = document.getElementById('webgl-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'webgl-canvas';
            canvas.className = 'webgl-background';
            document.body.insertBefore(canvas, document.body.firstChild);
        }

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            alpha: true, 
            antialias: true,
            powerPreference: "high-performance"
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 800;
        const posArray = new Float32Array(particlesCount * 3);
        
        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 15;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const material = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xD4AF37,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        particles = new THREE.Points(particlesGeometry, material);
        scene.add(particles);
        camera.position.z = 3;

        let mouseX = 0;
        let mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX / window.innerWidth - 0.5;
            mouseY = e.clientY / window.innerHeight - 0.5;
        }, { passive: true });

        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            // Pause rendering if tab is inactive
            if (document.hidden) return;
            
            const elapsedTime = clock.getElapsedTime();
            particles.rotation.y = elapsedTime * 0.05 + mouseX * 0.3;
            particles.rotation.x = mouseY * 0.3;
            camera.position.y = -globalScrollY * 0.0005;
            renderer.render(scene, camera);
        }
        animate();

        resizeCallbacks.push((newWidth) => {
            if (camera && renderer) {
                camera.aspect = newWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, window.innerHeight);
            }
        });
    }

    // ==========================================
    // 4. CUSTOM CURSOR (Optimized with GSAP quickTo)
    // ==========================================
    function initCursor() {
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorRing = document.querySelector('.cursor-ring');
        
        if (cursorDot && hasFinePointer) {
            if (cursorRing) cursorRing.style.display = 'none';

            if (!cursorDot.innerHTML.includes('scissor-cursor')) {
                cursorDot.innerHTML = `
                    <svg class="scissor-cursor" width="48" height="48" viewBox="0 0 40 40" fill="none" style="position: absolute; top: -20px; left: -20px; transform: rotate(-20deg);">
                        <g class="scissor-bottom-blade" style="transform-origin: 15px 15px;">
                            <path d="M15,15 L38,21 L36,24 L14,17 Z" fill="var(--color-gold)"/>
                            <circle cx="8" cy="8" r="4.5" stroke="var(--color-gold)" stroke-width="2"/>
                            <path d="M11.5,11 L15,15" stroke="var(--color-gold)" stroke-width="2.5" stroke-linecap="round"/>
                            <path d="M5,5 L2,2" stroke="var(--color-gold)" stroke-width="1.5" stroke-linecap="round"/>
                        </g>
                        <g class="scissor-top-blade" style="transform-origin: 15px 15px;">
                            <path d="M15,15 L38,9 L36,6 L14,13 Z" fill="var(--color-gold)"/>
                            <circle cx="8" cy="22" r="4.5" stroke="var(--color-gold)" stroke-width="2"/>
                            <path d="M11.5,19 L15,15" stroke="var(--color-gold)" stroke-width="2.5" stroke-linecap="round"/>
                        </g>
                        <circle cx="15" cy="15" r="1.5" fill="#fff"/>
                        <circle cx="15" cy="15" r="2.5" stroke="var(--color-gold)" stroke-width="0.5"/>
                    </svg>
                `;
            }
            
            cursorDot.style.backgroundColor = 'transparent';
            cursorDot.style.width = '0';
            cursorDot.style.height = '0';
            document.body.style.cursor = 'none';

            const scissorTop = document.querySelector('.scissor-top-blade');
            const scissorBottom = document.querySelector('.scissor-bottom-blade');
            const scissorSvg = document.querySelector('.scissor-cursor');

            if (scissorTop && scissorBottom && scissorSvg && !window.cursorInitialized) {
                window.cursorInitialized = true;
                gsap.set(scissorTop, { rotation: -10 });
                gsap.set(scissorBottom, { rotation: 10 });
    
                // Performance Boost: GSAP quickTo
                const xTo = gsap.quickTo(cursorDot, "x", { duration: 0.15, ease: "power2.out" });
                const yTo = gsap.quickTo(cursorDot, "y", { duration: 0.15, ease: "power2.out" });
                
                window.addEventListener('mousemove', (e) => {
                    xTo(e.clientX);
                    yTo(e.clientY);
                }, { passive: true });
    
                window.addEventListener('mousedown', () => {
                    gsap.to(scissorTop, { rotation: 2, duration: 0.05, ease: "power4.in" });
                    gsap.to(scissorBottom, { rotation: -2, duration: 0.05, ease: "power4.in" });
                }, { passive: true });
                
                window.addEventListener('mouseup', () => {
                    const isHovering = cursorDot.classList.contains('is-hovering');
                    gsap.to(scissorTop, { rotation: isHovering ? -25 : -10, duration: 0.3, ease: "back.out(3)" });
                    gsap.to(scissorBottom, { rotation: isHovering ? 25 : 10, duration: 0.3, ease: "back.out(3)" });
                }, { passive: true });
            }
        }
    }

    // ==========================================
    // 5. EXIT INTENT POPUP
    // ==========================================
    function triggerExitPopup() {
        if (!exitPopup || exitIntentFired) return;
        exitPopup.style.display = 'flex';
        // Force reflow
        void exitPopup.offsetWidth;
        exitPopup.classList.add('active');
        sessionStorage.setItem('exitIntentFired', 'true');
        exitIntentFired = true;
        if (lenis) lenis.stop();
    }

    function initExitIntent() {
        if (!exitPopup) return;
        const closeBtn = document.getElementById('exit-close-btn');

        const closePopup = () => {
            exitPopup.classList.remove('active');
            setTimeout(() => { exitPopup.style.display = 'none'; }, 400);
            if (lenis) lenis.start();
        };

        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        exitPopup.addEventListener('click', (e) => {
            if (e.target === exitPopup) closePopup();
        });

        // Desktop exit intent
        if (!isMobile) {
            document.addEventListener('mouseout', (e) => {
                if (e.clientY < 50 && e.relatedTarget == null && e.target.nodeName.toLowerCase() !== 'select') {
                    triggerExitPopup();
                }
            });
        } else {
            // Mobile idle timer
            let idleTimer = setTimeout(triggerExitPopup, 45000);
            const resetIdle = () => {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(triggerExitPopup, 45000);
            };
            window.addEventListener('touchstart', resetIdle, { passive: true });
        }
    }

    // ==========================================
    // 6. PAGE SPECIFIC SCRIPTS
    // ==========================================
    function initPageScripts(container) {
        
        // Active Nav Link Highlighting
        const navLinks = container.querySelectorAll('.nav-link');
        const currentPath = window.location.pathname.replace(/\/$/, "");
        
        navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname.replace(/\/$/, "");
            let isMatch = false;
            
            if (linkPath === '/' || linkPath.endsWith('index.html')) {
                isMatch = (currentPath === '/' || currentPath.endsWith('index.html') || currentPath === '');
            } else {
                const linkBase = linkPath.split('.html')[0];
                const currentBase = currentPath.split('.html')[0];
                isMatch = (currentBase === linkBase || currentBase.startsWith(linkBase + '-'));
            }
            
            if (isMatch) {
                link.classList.add('active');
                link.style.color = 'var(--color-gold)';
            } else {
                link.classList.remove('active');
                link.style.color = '';
            }
        });

        // Mobile Floating CTA Observer
        const mobileCta = container.querySelector('#mobile-floating-cta');
        const finalCta = container.querySelector('#final-cta');
        if (mobileCta && finalCta && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        mobileCta.style.opacity = '0';
                        mobileCta.style.pointerEvents = 'none';
                    } else {
                        mobileCta.style.opacity = '1';
                        mobileCta.style.pointerEvents = 'auto';
                    }
                });
            }, { threshold: 0.1 });
            observer.observe(finalCta);
        }

        // Mobile Menu Toggle
        const hamburgerBtn = container.querySelector('#hamburger-btn');
        const closeMenuBtn = container.querySelector('#close-menu-btn');
        const mobileMenu = container.querySelector('#mobile-menu');
        const mobileLinks = container.querySelectorAll('.mobile-link');
        
        const toggleMenu = () => {
            if (!mobileMenu) return;
            const isActive = mobileMenu.classList.contains('active');
            if (isActive) { 
                mobileMenu.classList.remove('active'); 
                if (lenis) lenis.start(); 
            } else { 
                mobileMenu.classList.add('active'); 
                if (lenis) lenis.stop(); 
            }
        };
        
        if (hamburgerBtn) {
            // Prevent multiple bindings
            hamburgerBtn.onclick = null; 
            hamburgerBtn.onclick = toggleMenu;
        }
        if (closeMenuBtn) {
            closeMenuBtn.onclick = null;
            closeMenuBtn.onclick = toggleMenu;
        }
        mobileLinks.forEach(link => {
            link.onclick = null;
            link.onclick = toggleMenu;
        });

        // Magnetic Buttons (Desktop)
        const magneticElements = container.querySelectorAll('.magnetic');
        if (hasFinePointer) {
            magneticElements.forEach(el => {
                if (el.dataset.magneticInit) return;
                el.dataset.magneticInit = 'true';
                
                const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power2.out" });
                const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power2.out" });

                el.addEventListener('mousemove', (e) => {
                    const rect = el.getBoundingClientRect();
                    const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
                    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
                    xTo(x);
                    yTo(y);
                }, { passive: true });
                
                el.addEventListener('mouseleave', () => {
                    gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
                });
            });
        }
        
        // Touch states (Mobile)
        if (hasCoarsePointer) {
            const touchCards = container.querySelectorAll('.magnetic, .service-item, .deal-card, .glass-card, .sitemap-card');
            touchCards.forEach(el => {
                if (el.dataset.touchInit) return;
                el.dataset.touchInit = 'true';
                
                el.addEventListener('touchstart', () => {
                    gsap.to(el, { scale: 0.97, duration: 0.15 });
                    el.classList.add('touch-active');
                }, { passive: true });
                
                el.addEventListener('touchend', () => {
                    gsap.to(el, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.3)" });
                    el.classList.remove('touch-active');
                }, { passive: true });
            });
        }

        // Before/After Slider
        const baSlider = container.querySelector('#ba-slider');
        const baAfterImg = container.querySelector('#ba-after-img');
        const baHandle = container.querySelector('#ba-handle');
        if (baSlider && baAfterImg && baHandle && !baSlider.dataset.bound) {
            baSlider.dataset.bound = 'true';
            baSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                baAfterImg.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
                baAfterImg.style.webkitClipPath = `inset(0 ${100 - value}% 0 0)`;
                baHandle.style.left = `${value}%`;
            });
        }

        // GSAP Scroll Reveal Elements
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            const revealElements = container.querySelectorAll('.gs-reveal');
            revealElements.forEach((el) => {
                if (el.dataset.revealed) return;
                el.dataset.revealed = 'true';
                gsap.fromTo(el, 
                    { autoAlpha: 0, y: 40 },
                    { 
                        duration: 0.8, 
                        autoAlpha: 1, 
                        y: 0, 
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: el,
                            start: "top 95%", 
                            once: true
                        }
                    }
                );
            });
        }

        // Apple Vision Pro Reel Carousel
        const visionTrack = container.querySelector('#vision-track');
        if (visionTrack && 'IntersectionObserver' in window && !visionTrack.dataset.init) {
            visionTrack.dataset.init = 'true';
            const items = visionTrack.querySelectorAll('.vision-carousel-item');
            
            const centerObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        items.forEach(el => el.classList.remove('active-reel'));
                        entry.target.classList.add('active-reel');
                    }
                });
            }, { root: visionTrack, rootMargin: '0px -40% 0px -40%', threshold: 0 });
            
            items.forEach(item => centerObserver.observe(item));

            let isDown = false;
            let startX;
            let scrollLeft;

            visionTrack.addEventListener('mousedown', (e) => {
                isDown = true;
                visionTrack.style.scrollBehavior = 'auto';
                visionTrack.style.scrollSnapType = 'none';
                startX = e.pageX - visionTrack.offsetLeft;
                scrollLeft = visionTrack.scrollLeft;
            });
            const stopDrag = () => {
                if (!isDown) return;
                isDown = false;
                visionTrack.style.scrollBehavior = 'smooth';
                visionTrack.style.scrollSnapType = 'x mandatory';
            };
            visionTrack.addEventListener('mouseleave', stopDrag);
            visionTrack.addEventListener('mouseup', stopDrag);
            visionTrack.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - visionTrack.offsetLeft;
                const walk = (x - startX) * 1.5;
                visionTrack.scrollLeft = scrollLeft - walk;
            });
        }

        // Horizontal Scroll Sections
        setTimeout(() => {
            if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
                const horizontalRows = container.querySelectorAll('.horizontal-scroll-container');
                horizontalRows.forEach(row => {
                    if (row.dataset.scrollInit) return;
                    row.dataset.scrollInit = 'true';
                    gsap.to(row, {
                        x: () => -(row.scrollWidth - window.innerWidth + 100),
                        ease: "none",
                        scrollTrigger: {
                            trigger: row.parentElement,
                            pin: true,
                            scrub: 1,
                            end: () => "+=" + row.scrollWidth
                        }
                    });
                });
                ScrollTrigger.refresh();
            }
        }, 500);
        
        // Instagram Embeds Initialization
        const igBlocks = container.querySelectorAll('.instagram-media');
        if (igBlocks.length > 0) {
            if (window.instgrm) {
                window.instgrm.Embeds.process();
            } else if (!document.querySelector('script[src="https://www.instagram.com/embed.js"]')) {
                const script = document.createElement('script');
                script.src = "https://www.instagram.com/embed.js";
                script.async = true;
                script.onload = () => { if (window.instgrm) window.instgrm.Embeds.process(); };
                document.body.appendChild(script);
            }
        }

        // Videos Autoplay & Intersections
        const videos = container.querySelectorAll('video');
        videos.forEach(vid => {
            if (vid.hasAttribute('autoplay') || vid.hasAttribute('muted')) {
                vid.play().catch(e => console.warn("Autoplay blocked:", e));
            }
            vid.addEventListener('loadeddata', () => {
                if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
            });
        });

        const heroVideo = container.querySelector('#hero-video');
        const heroSection = container.querySelector('#hero-section');
        const audioBtn = container.querySelector('#audio-btn');
        const iconMuted = container.querySelector('#audio-icon-muted');
        const iconPlaying = container.querySelector('#audio-icon-playing');
        let isUserUnmuted = false;

        if (audioBtn && heroVideo && !audioBtn.dataset.bound) {
            audioBtn.dataset.bound = 'true';
            audioBtn.addEventListener('click', function() {
                if (heroVideo.muted) {
                    heroVideo.muted = false; 
                    heroVideo.volume = 1;
                    if(iconMuted) iconMuted.style.display = 'none';
                    if(iconPlaying) iconPlaying.style.display = 'block';
                    isUserUnmuted = true;
                } else {
                    heroVideo.muted = true;
                    if(iconMuted) iconMuted.style.display = 'block';
                    if(iconPlaying) iconPlaying.style.display = 'none';
                    isUserUnmuted = false;
                }
            });
        }

        if (heroVideo && heroSection && 'IntersectionObserver' in window && !heroVideo.dataset.obsInit) {
            heroVideo.dataset.obsInit = 'true';
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    heroVideo.muted = !(entry.isIntersecting && isUserUnmuted);
                });
            }, { threshold: 0.1 }); 
            observer.observe(heroSection);
        }

        // Timeline Setup
        const line = container.querySelector('#timeline-progress');
        const tlSection = container.querySelector('#timeline-section');
        if (line && tlSection && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !line.dataset.bound) {
            line.dataset.bound = 'true';
            gsap.fromTo(line, { height: "0%" }, { 
                height: "100%", 
                ease: "none", 
                scrollTrigger: { trigger: tlSection, start: "top center", end: "bottom center", scrub: true } 
            });
        }

        // Animated Counters
        const counters = container.querySelectorAll('.counter-num');
        const statSection = container.querySelector('#stats-section');
        if (counters.length > 0 && statSection && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !statSection.dataset.stInit) {
            statSection.dataset.stInit = 'true';
            ScrollTrigger.create({
                trigger: statSection,
                start: "top 85%",
                once: true,
                onEnter: () => {
                    counters.forEach(counter => {
                        const target = parseInt(counter.getAttribute('data-target'));
                        gsap.to(counter, {
                            innerHTML: target, 
                            duration: 2.5, 
                            ease: "power3.out", 
                            snap: { innerHTML: 1 },
                            onUpdate: function() { 
                                counter.innerHTML = Math.round(this.targets()[0].innerHTML) + "+"; 
                            }
                        });
                    });
                }
            });
        }

        // FAQ Accordions
        const faqs = container.querySelectorAll('.faq-item');
        faqs.forEach(faq => {
            if (faq.dataset.bound) return;
            faq.dataset.bound = 'true';
            const question = faq.querySelector('.faq-question');
            if (question) {
                question.addEventListener('click', () => {
                    const isActive = faq.classList.contains('active');
                    faqs.forEach(f => f.classList.remove('active'));
                    if (!isActive) faq.classList.add('active');
                });
            }
        });
        
        container.querySelectorAll('.faq-q').forEach(q => {
            if (q.dataset.bound) return;
            q.dataset.bound = 'true';
            q.addEventListener('click', () => {
                const a = q.nextElementSibling;
                const s = q.querySelector('span');
                if (a && s) {
                    if (a.style.display === 'block') { a.style.display = 'none'; s.textContent = '+'; } 
                    else { a.style.display = 'block'; s.textContent = '-'; }
                }
            });
        });

        // Reel Video Modal Logic
        const reelCards = container.querySelectorAll('.reel-card');
        const videoModal = document.querySelector('#video-modal');
        const modalVideo = document.querySelector('#modal-video');
        const closeModalBtn = document.querySelector('#close-modal');

        if (videoModal && modalVideo && closeModalBtn && !videoModal.dataset.bound) {
            videoModal.dataset.bound = 'true';
            reelCards.forEach(card => {
                const vid = card.querySelector('video');
                if (vid) {
                    card.addEventListener('click', () => {
                        const source = vid.querySelector('source').src;
                        modalVideo.src = source;
                        videoModal.style.display = 'flex';
                        setTimeout(() => { videoModal.style.opacity = '1'; }, 10);
                        modalVideo.muted = false;
                        modalVideo.play().catch(e => console.warn("Playback prevented:", e));
                    });
                }
            });
            const closeVideoModal = () => {
                videoModal.style.opacity = '0';
                setTimeout(() => {
                    videoModal.style.display = 'none';
                    modalVideo.pause();
                    modalVideo.src = ''; 
                }, 400);
            };
            closeModalBtn.addEventListener('click', closeVideoModal);
            videoModal.addEventListener('click', (e) => { if(e.target === videoModal) closeVideoModal(); });
        }

        // Service Tab Switching Logic
        const tabs = container.querySelectorAll('.service-tab-btn');
        const categories = container.querySelectorAll('.service-category');
        if (tabs.length > 0 && categories.length > 0 && !tabs[0].dataset.bound) {
            tabs.forEach(tab => {
                tab.dataset.bound = 'true';
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const targetId = tab.getAttribute('data-target');
                    if (targetId === 'all') {
                        categories.forEach(c => c.classList.add('active'));
                    } else {
                        categories.forEach(c => c.classList.remove('active'));
                        const targetElement = container.querySelector('#' + targetId);
                        if (targetElement) targetElement.classList.add('active');
                    }
                    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
                });
            });
        }

        // Ensure Cursor Binding Exists
        initCursor();
        
        // Interactive Elements Cursor Logic
        const cursorDot = document.querySelector('.cursor-dot');
        const scissorTop = document.querySelector('.scissor-top-blade');
        const scissorBottom = document.querySelector('.scissor-bottom-blade');
        const scissorSvg = document.querySelector('.scissor-cursor');
        
        if (cursorDot && scissorTop && hasFinePointer) {
            const interactives = container.querySelectorAll('a, button, .magnetic, input[type="range"], .google-review-card, .ig-post, .video-testimonial, .horizontal-scroll-item');
            interactives.forEach(el => {
                if (el.dataset.cursorBound) return;
                el.dataset.cursorBound = 'true';
                
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
        }
    }

    // ==========================================
    // 7. PRELOADER & INITIALIZATION
    // ==========================================
    function initialPreloader() {
        const preloaderTl = gsap.timeline({
            onComplete: () => {
                document.body.classList.remove('loading');
                const preloader = document.getElementById('preloader');
                if (preloader) preloader.style.display = 'none';
                initThreeJS();
            }
        });

        if (document.getElementById('preloader')) {
            preloaderTl.to('.preloader-line', { width: '100%', duration: 1.5, ease: "power3.inOut" })
                       .to('.preloader-text', { opacity: 1, duration: 0.5 }, "-=0.5")
                       .to('.preloader-content', { opacity: 0, y: -20, duration: 0.5, delay: 0.3 })
                       .to('#preloader', { yPercent: -100, duration: 1, ease: "power4.inOut" })
                       .from('.announcement-bar', { y: -50, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.2")
                       .from('.site-header', { y: -50, opacity: 0, duration: 1, ease: "power3.out" }, "-=1");
                       
            const cinematicContent = document.querySelector('.cinematic-hero-content');
            if (cinematicContent) {
                preloaderTl.from(cinematicContent.children, { y: 30, opacity: 0, duration: 1, stagger: 0.15, ease: "power4.out" }, "-=0.5");
            }
        } else {
            document.body.classList.remove('loading');
            initThreeJS();
        }
    }

    function initApp() {
        initialPreloader();
        initPageScripts(document);
        initExitIntent();
    }

    // Boot the app
    initApp();

    window.addEventListener('load', () => {
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });

    // ==========================================
    // 8. GLOBAL BOOKING POPUP
    // ==========================================
    function initBookingPopup() {
        if (sessionStorage.getItem('bookingPopupShown') === 'true') return;
        
        const popupHtml = `
            <div class="booking-popup-overlay" id="global-booking-popup">
                <div class="booking-popup-content glass-card">
                    <h3 class="font-display h2 text-gold mb-3">Ready For Your Next Transformation?</h3>
                    <p class="text-muted mb-4 line-height-lg">Book your appointment today and experience the Clip Kings difference.</p>
                    <div class="d-flex justify-content-center gap-3 flex-wrap">
                        <a href="book.html" class="btn btn-primary magnetic" id="popup-book-btn">BOOK NOW</a>
                        <button class="btn btn-outline magnetic" id="popup-later-btn">LATER</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', popupHtml);
        
        const popup = document.getElementById('global-booking-popup');
        const laterBtn = document.getElementById('popup-later-btn');
        
        setTimeout(() => {
            if (popup) popup.classList.add('active');
            sessionStorage.setItem('bookingPopupShown', 'true');
        }, 5000);

        if (laterBtn) {
            laterBtn.addEventListener('click', () => {
                popup.classList.remove('active');
            });
        }
    }

    initBookingPopup();

    // ==========================================
    // 9. NATIVE GSAP PAGE TRANSITIONS
    // ==========================================
    const ENABLE_PAGE_TRANSITIONS = true;

    function initNativeTransitions() {
        const transitionLayer = document.querySelector('.transition-layer.gold');
        if (!transitionLayer) return;

        if (!ENABLE_PAGE_TRANSITIONS) {
            gsap.set(transitionLayer, { display: 'none', y: '-100%' });
            return; 
        }

        // On Page Load: Slide out
        gsap.to(transitionLayer, {
            y: '-100%', 
            duration: 0.6, 
            ease: "power3.inOut",
            onComplete: () => gsap.set(transitionLayer, { y: '100%' })
        });

        // Intercept internal links for exit animation
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            if (link.dataset.transBound) return;
            link.dataset.transBound = 'true';
            
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                const target = link.getAttribute('target');

                if (
                    e.ctrlKey || e.metaKey || e.shiftKey || e.altKey ||
                    !href || href.startsWith('#') || href.startsWith('mailto:') || 
                    href.startsWith('tel:') || target === '_blank' || 
                    link.hostname !== window.location.hostname || link.hasAttribute('download')
                ) {
                    return; 
                }

                e.preventDefault();
                gsap.to(transitionLayer, {
                    y: '0%', 
                    duration: 0.6, 
                    ease: "power3.inOut",
                    onComplete: () => { window.location.href = href; }
                });
            });
        });

        // Fix BFCache issues (user clicks back button)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) gsap.set(transitionLayer, { y: '100%' });
        });
    }

    initNativeTransitions();

});
