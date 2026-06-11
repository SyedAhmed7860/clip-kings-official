document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. THREE.JS GLOBAL BACKGROUND
    // ==========================================
    let scene, camera, renderer, particles;
    function initThreeJS() {
        if(typeof THREE === 'undefined') return;
        if(window.innerWidth <= 768) return; // Disable on mobile to prevent extreme lag and battery drain
        
        let canvas = document.getElementById('webgl-canvas');
        if(!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'webgl-canvas';
            canvas.className = 'webgl-background';
            document.body.insertBefore(canvas, document.body.firstChild);
        }

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Gold Particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 800;
        const posArray = new Float32Array(particlesCount * 3);
        
        for(let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 15;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const material = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xD4AF37,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        
        particles = new THREE.Points(particlesGeometry, material);
        scene.add(particles);
        camera.position.z = 3;

        let mouseX = 0;
        let mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX / window.innerWidth - 0.5;
            mouseY = e.clientY / window.innerHeight - 0.5;
        });

        let scrollY = 0;
        window.addEventListener('scroll', () => { scrollY = window.scrollY; });

        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            
            particles.rotation.y = elapsedTime * 0.05 + mouseX * 0.3;
            particles.rotation.x = mouseY * 0.3;
            
            // Subtle scroll effect
            camera.position.y = -scrollY * 0.0005;
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ==========================================
    // 1. GLOBAL INITIALIZATIONS
    // ==========================================
    
    const yearElement = document.getElementById('year');
    if (yearElement) yearElement.textContent = new Date().getFullYear();

    const lenis = new Lenis({
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
        
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => ScrollTrigger.refresh()).observe(document.body);
        }
    }

    // ==========================================
    // 2. CUSTOM CURSOR
    // ==========================================
    function initCursor() {
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorRing = document.querySelector('.cursor-ring');
        
        if (cursorDot && window.matchMedia("(pointer: fine)").matches) {
            if (cursorRing) cursorRing.style.display = 'none';

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
            
            cursorDot.style.backgroundColor = 'transparent';
            cursorDot.style.width = '0';
            cursorDot.style.height = '0';
            document.body.style.cursor = 'none';

            const scissorTop = document.querySelector('.scissor-top-blade');
            const scissorBottom = document.querySelector('.scissor-bottom-blade');
            const scissorSvg = document.querySelector('.scissor-cursor');

            if(scissorTop && scissorBottom && scissorSvg) {
                gsap.set(scissorTop, { rotation: -10 });
                gsap.set(scissorBottom, { rotation: 10 });
    
                if (window.cursorInitialized) return; window.cursorInitialized = true;
                const moveCursor = (e) => {
                    gsap.to(cursorDot, { x: e.clientX, y: e.clientY, duration: 0.1 });
                };
                window.addEventListener('mousemove', moveCursor);
    
                window.addEventListener('mousedown', () => {
                    gsap.to(scissorTop, { rotation: 2, duration: 0.05, ease: "power4.in" });
                    gsap.to(scissorBottom, { rotation: -2, duration: 0.05, ease: "power4.in" });
                });
                window.addEventListener('mouseup', () => {
                    const isHovering = cursorDot.classList.contains('is-hovering');
                    gsap.to(scissorTop, { rotation: isHovering ? -25 : -10, duration: 0.3, ease: "back.out(3)" });
                    gsap.to(scissorBottom, { rotation: isHovering ? 25 : 10, duration: 0.3, ease: "back.out(3)" });
                });
            }
        }
    }

    // ==========================================
    // 3. EXIT INTENT POPUP
    // ==========================================
    function initExitIntent() {
        const popup = document.getElementById('exit-popup');
        const closeBtn = document.getElementById('exit-close-btn');
        if (!popup) return;

        let hasFired = sessionStorage.getItem('exitIntentFired');
        
        const showPopup = () => {
            if (!hasFired) {
                popup.style.display = 'flex';
                setTimeout(() => popup.classList.add('active'), 10);
                sessionStorage.setItem('exitIntentFired', 'true');
                hasFired = true;
                lenis.stop();
            }
        };

        const closePopup = () => {
            popup.classList.remove('active');
            setTimeout(() => popup.style.display = 'none', 400);
            lenis.start();
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closePopup);
        }
        popup.addEventListener('click', (e) => {
            if (e.target === popup) closePopup();
        });

        document.addEventListener('mouseout', (e) => {
            if (e.clientY < 50 && e.relatedTarget == null && e.target.nodeName.toLowerCase() !== 'select') {
                showPopup();
            }
        });

        if (window.innerWidth <= 768) {
            let idleTimer = setTimeout(showPopup, 45000);
            const resetIdle = () => {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(showPopup, 45000);
            };
            window.addEventListener('touchstart', resetIdle);
            window.addEventListener('scroll', resetIdle);

            window.addEventListener('scroll', () => {
                const scrollPos = window.scrollY;
                const windowHeight = window.innerHeight;
                const docHeight = document.body.offsetHeight;
                if ((scrollPos + windowHeight) / docHeight > 0.75) {
                    showPopup();
                }
            });

            let lastScrollY = window.scrollY;
            let lastScrollTime = Date.now();
            window.addEventListener('scroll', () => {
                const currentY = window.scrollY;
                const currentTime = Date.now();
                const diffY = currentY - lastScrollY;
                const diffT = currentTime - lastScrollTime;
                
                if (diffY < -50 && diffT < 100) { showPopup(); }
                
                lastScrollY = currentY;
                lastScrollTime = currentTime;
            });
        }
    }

    // ==========================================
    // 4. PAGE SPECIFIC SCRIPTS
    // ==========================================
    function initPageScripts(container) {
        
        // --- 1. FOOLPROOF NAV LINK HIGHLIGHTING ---
        const navLinks = document.querySelectorAll('.nav-link');
        const currentUrl = window.location.href.split('#')[0].split('?')[0]; 
        
        navLinks.forEach(link => {
            const linkUrl = link.href.split('#')[0].split('?')[0];
            
            if (currentUrl === linkUrl) {
                link.classList.add('active');
                link.style.color = 'var(--color-gold)';
            } else {
                link.classList.remove('active');
                link.style.color = '';
            }
        });

        // Sticky Header Observer
        const header = document.querySelector('#header');
        if (header) {
            if (!window.headerScrollBound) {
            window.headerScrollBound = true;
            window.addEventListener('scroll', () => {
                if (window.scrollY > 40) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            });
        }
        }

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
                        mobileCta.style.pointerEvents = 'all';
                    }
                });
            }, { threshold: 0.1 });
            observer.observe(finalCta);
        }

        // Mobile Menu Toggle
        const hamburgerBtn = document.querySelector('#hamburger-btn');
        const closeMenuBtn = document.querySelector('#close-menu-btn');
        const mobileMenu = document.querySelector('#mobile-menu');
        const mobileLinks = document.querySelectorAll('.mobile-link');
        const toggleMenu = () => {
            if (!mobileMenu) return;
            const isActive = mobileMenu.classList.contains('active');
            if (isActive) { mobileMenu.classList.remove('active'); lenis.start(); } 
            else { mobileMenu.classList.add('active'); lenis.stop(); }
        };
        
        // Reset listeners
        if (hamburgerBtn) hamburgerBtn.onclick = toggleMenu;
        if (closeMenuBtn) closeMenuBtn.onclick = toggleMenu;
        mobileLinks.forEach(link => link.onclick = toggleMenu);

        // Magnetic Buttons
        const magneticElements = container.querySelectorAll('.magnetic');
        if (window.matchMedia("(pointer: fine)").matches) {
            magneticElements.forEach(el => {
                el.addEventListener('mousemove', (e) => {
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out" });
                });
                el.addEventListener('mouseleave', () => {
                    gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
                });
            });
        }

        
        // Touch effect for magnetic/cards globally
        if (window.matchMedia("(pointer: coarse)").matches) {
            const touchCards = container.querySelectorAll('.magnetic, .service-item, .deal-card, .glass-card, .sitemap-card');
            touchCards.forEach(el => {
                el.addEventListener('touchstart', () => {
                    gsap.to(el, { scale: 0.97, duration: 0.15 });
                    el.classList.add('touch-active');
                }, {passive: true});
                el.addEventListener('touchend', () => {
                    gsap.to(el, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.3)" });
                    el.classList.remove('touch-active');
                }, {passive: true});
            });
        }

        // Before/After Slider
        const baSlider = container.querySelector('#ba-slider');
        const baAfterImg = container.querySelector('#ba-after-img');
        const baHandle = container.querySelector('#ba-handle');
        if (baSlider && baAfterImg && baHandle) {
            baSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                baAfterImg.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
                baAfterImg.style.webkitClipPath = `inset(0 ${100 - value}% 0 0)`;
                baHandle.style.left = `${value}%`;
            });
        }

        // --- 2. BULLETPROOF ELEMENT REVEAL (GSAP ScrollTrigger version) ---
        // Changed back to ScrollTrigger since Barba is removed. It triggers natively and perfectly.
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            const revealElements = container.querySelectorAll('.gs-reveal');
            
            revealElements.forEach((el) => {
                gsap.fromTo(el, 
                    { autoAlpha: 0, y: 40 },
                    { 
                        duration: 0.8, 
                        autoAlpha: 1, 
                        y: 0, 
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: el,
                            start: "top 95%", // Element slightly in view triggers animation
                            once: true
                        }
                    }
                );
            });
        }

        // Apple Vision Pro Reel Carousel Observer
        const visionTrack = container.querySelector('#vision-track');
        if (visionTrack && 'IntersectionObserver' in window) {
            const items = visionTrack.querySelectorAll('.vision-carousel-item');
            
            const observerOptions = {
                root: visionTrack,
                rootMargin: '0px -40% 0px -40%',
                threshold: 0
            };
            
            const centerObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        items.forEach(el => el.classList.remove('active-reel'));
                        entry.target.classList.add('active-reel');
                    }
                });
            }, observerOptions);
            
            items.forEach(item => centerObserver.observe(item));

            // Mouse drag logic
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
                if(!isDown) return;
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

        // Netflix-style Horizontal Scroll
        setTimeout(() => {
            if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
                const horizontalRows = container.querySelectorAll('.horizontal-scroll-container');
                horizontalRows.forEach(row => {
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
            } else {
                if (!document.querySelector('script[src="https://www.instagram.com/embed.js"]')) {
                    const script = document.createElement('script');
                    script.src = "https://www.instagram.com/embed.js";
                    script.async = true;
                    script.onload = () => { if (window.instgrm) window.instgrm.Embeds.process(); };
                    document.body.appendChild(script);
                }
            }
        }

        // ==========================================
        // MIGRATED PAGE-SPECIFIC LOGIC
        // ==========================================
        
        // --- FORCE AUTOPLAY ON VIDEOS ---
        const videos = container.querySelectorAll('video');
        videos.forEach(vid => {
            if (vid.hasAttribute('autoplay') || vid.hasAttribute('muted')) {
                vid.play().catch(e => console.warn("Autoplay blocked:", e));
            }
            
            vid.addEventListener('loadeddata', () => {
                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh();
                }
            });
        });

        // Video Audio Logic
        const video = container.querySelector('#hero-video');
        const heroSection = container.querySelector('#hero-section');
        const audioBtn = container.querySelector('#audio-btn');
        const iconMuted = container.querySelector('#audio-icon-muted');
        const iconPlaying = container.querySelector('#audio-icon-playing');
        let isUserUnmuted = false;

        if (audioBtn && video) {
            audioBtn.addEventListener('click', function() {
                if (video.muted) {
                    video.muted = false; video.volume = 1;
                    if(iconMuted) iconMuted.style.display = 'none';
                    if(iconPlaying) iconPlaying.style.display = 'block';
                    isUserUnmuted = true;
                } else {
                    video.muted = true;
                    if(iconMuted) iconMuted.style.display = 'block';
                    if(iconPlaying) iconPlaying.style.display = 'none';
                    isUserUnmuted = false;
                }
            });
        }

        if (video && heroSection && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && isUserUnmuted) video.muted = false;
                    else video.muted = true;
                });
            }, { threshold: 0.1 }); 
            observer.observe(heroSection);
        }

        setTimeout(() => {
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        }, 1000);

        // Timeline and Animated Counters Logic
        const line = container.querySelector('#timeline-progress');
        const tlSection = container.querySelector('#timeline-section');
        if (line && tlSection && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            gsap.fromTo(line, { height: "0%" }, { height: "100%", ease: "none", scrollTrigger: { trigger: tlSection, start: "top center", end: "bottom center", scrub: true } });
        }

        // Counter logic updated for ScrollTrigger
        const counters = container.querySelectorAll('.counter-num');
        const statSection = container.querySelector('#stats-section');
        if (counters.length > 0 && statSection && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.create({
                trigger: statSection,
                start: "top 85%",
                once: true,
                onEnter: () => {
                    counters.forEach(counter => {
                        const target = parseInt(counter.getAttribute('data-target'));
                        gsap.to(counter, {
                            innerHTML: target, duration: 2.5, ease: "power3.out", snap: { innerHTML: 1 },
                            onUpdate: function() { counter.innerHTML = Math.round(this.targets()[0].innerHTML) + "+"; }
                        });
                    });
                }
            });
        }

        // FAQ Accordion Logic
        const faqs = container.querySelectorAll('.faq-item');
        faqs.forEach(faq => {
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
            q.addEventListener('click', () => {
                const a = q.nextElementSibling;
                const s = q.querySelector('span');
                if(a && s) {
                    if(a.style.display === 'block') { a.style.display = 'none'; s.textContent = '+'; } 
                    else { a.style.display = 'block'; s.textContent = '-'; }
                }
            });
        });

        // Reel Video Modal Logic
        const reelCards = container.querySelectorAll('.reel-card');
        const videoModal = document.querySelector('#video-modal'); // Global Modal
        const modalVideo = document.querySelector('#modal-video');
        const closeModalBtn = document.querySelector('#close-modal');

        if (videoModal && modalVideo && closeModalBtn) {
            reelCards.forEach(card => {
                const vid = card.querySelector('video');
                if (vid) {
                    card.addEventListener('click', () => {
                        const source = vid.querySelector('source').src;
                        modalVideo.src = source;
                        videoModal.style.display = 'flex';
                        setTimeout(() => { videoModal.style.opacity = '1'; }, 10);
                        modalVideo.muted = false;
                        modalVideo.play().catch(e => console.log("Playback prevented:", e));
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
        if (tabs.length > 0 && categories.length > 0) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const targetId = tab.getAttribute('data-target');
                    if (targetId === 'all') {
                        categories.forEach(c => c.classList.add('active'));
                    } else {
                        categories.forEach(c => c.classList.remove('active'));
                        const targetElement = container.querySelector('#' + targetId);
                        if(targetElement) targetElement.classList.add('active');
                    }
                    if(typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
                });
            });
        }

        initCursor();
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
        }
    }

    // ==========================================
    // 5. PRELOADER & NATIVE INITIALIZATION
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
                       
            if (document.querySelector('.cinematic-hero-content')) {
                preloaderTl.from('.cinematic-hero-content > *', { y: 30, opacity: 0, duration: 1, stagger: 0.15, ease: "power4.out" }, "-=0.5");
            }
        } else {
            document.body.classList.remove('loading');
            initThreeJS();
        }
    }

    // --- FIX: Run initialization immediately instead of waiting for heavy files ---
    function initApp() {
        initialPreloader();
        initPageScripts(document);
        initExitIntent();
        initCursor();
    }

    // Initialize instantly on DOM ready
    initApp();

    // After all heavy assets (videos/images) finish loading, just refresh GSAP calculations
    window.addEventListener('load', () => {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    });

    // ==========================================
    // 6. GLOBAL BOOKING POPUP
    // ==========================================
    function initBookingPopup() {
        if (sessionStorage.getItem('bookingPopupShown')) return;
        
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
            popup.classList.add('active');
            sessionStorage.setItem('bookingPopupShown', 'true');
        }, 5000);

        laterBtn.addEventListener('click', () => {
            popup.classList.remove('active');
        });
    }

    initBookingPopup();

    // ==========================================
    // 7. BARBA.JS PREMIUM PAGE TRANSITIONS
    // ==========================================
    if (typeof barba !== 'undefined') {
        barba.init({
            sync: true,
            transitions: [{
                name: 'luxury-sweep',
                leave(data) {
                    const done = this.async();
                    gsap.to('.transition-layer.gold', {
                        y: '0%', 
                        duration: 0.6, 
                        ease: "power3.inOut",
                        onComplete: done
                    });
                },
                enter(data) {
                    window.scrollTo(0, 0);
                    // Update navigation highlighting
                    const currentUrl = data.next.url.path;
                    document.querySelectorAll('.nav-link').forEach(link => {
                        const linkUrl = new URL(link.href).pathname;
                        if (currentUrl === linkUrl || currentUrl === linkUrl + '/') {
                            link.classList.add('active');
                            link.style.color = 'var(--color-gold)';
                        } else {
                            link.classList.remove('active');
                            link.style.color = '';
                        }
                    });
                    
                    // Re-init scripts for new container
                    initPageScripts(data.next.container);
                    
                    // Re-init Webflow/GSAP ScrollTriggers
                    setTimeout(() => {
                        if (typeof ScrollTrigger !== 'undefined') {
                            ScrollTrigger.refresh();
                        }
                    }, 100);

                    return gsap.to('.transition-layer.gold', {
                        y: '-100%', 
                        duration: 0.6, 
                        ease: "power3.inOut",
                        onComplete: () => {
                            gsap.set('.transition-layer.gold', { y: '100%' });
                        }
                    });
                }
            }]
        });
    }
            
});
