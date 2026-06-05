/**
 * Decision-Tree King Assistant - State Machine Architecture
 * Professional receptionist personality, robust customer journey flows.
 */

class DecisionTreeAssistant {
    constructor() {
        this.isOpen = false;
        this.isTyping = false;
        this.state = 'idle';
        this.memory = {}; // Stores selections (e.g. style: 'fade')
        this.historyStack = []; // Stores navigation history
        this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        this.dictionary = this.initDictionary();
        
        this.initDOM();
        this.attachEvents();
        this.bindTriggers();
    }

    // --- NLP DICTIONARY --- //
    initDictionary() {
        return {
            // Global Intents
            book: ["book", "appointment", "schedule", "reserve", "slot", "booking", "come in", "visit", "available", "time"],
            price: ["price", "cost", "much", "rate", "charge", "expensive", "cheap", "paise", "kitne"],
            haircut: ["haircut", "cut", "fade", "taper", "classic", "style", "chop", "hair", "buzz", "lineup", "edge"],
            beard: ["beard", "trim", "shave", "line up", "facial hair", "daadhi", "dadhi", "mustache"],
            contact: ["call", "phone", "number", "contact", "reach", "speak", "talk"],
            location: ["where", "location", "address", "map", "directions", "kidhar", "shop", "place", "located", "far"],
            hours: ["hours", "open", "close", "time", "timing", "kab", "baje", "today", "tomorrow"],
            offers: ["offer", "discount", "special", "promo", "deal", "sale", "happy hour"],
            
            // Specific Styles
            fade: ["fade", "skin fade", "burst fade", "drop fade"],
            taper: ["taper", "blowout"],
            classic: ["classic", "regular", "scissor", "trim"],
            
            // Yes/No
            yes: ["yes", "yeah", "yep", "sure", "ok", "okay", "yup", "haan", "han", "definitely", "please", "add"],
            no: ["no", "nah", "nope", "cancel", "stop", "na", "nahi", "just", "only"]
        };
    }

    getLevenshteinDistance(a, b) {
        if(a.length === 0) return b.length;
        if(b.length === 0) return a.length;
        const matrix = [];
        for(let i = 0; i <= b.length; i++) matrix[i] = [i];
        for(let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for(let i = 1; i <= b.length; i++) {
            for(let j = 1; j <= a.length; j++) {
                if(b.charAt(i-1) === a.charAt(j-1)) matrix[i][j] = matrix[i-1][j-1];
                else matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
            }
        }
        return matrix[b.length][a.length];
    }

    extractConcepts(text) {
        const stopWords = ['a', 'an', 'the', 'is', 'at', 'which', 'on', 'for', 'to', 'i', 'need', 'want', 'get', 'can', 'do', 'you', 'have', 'are', 'how', 'what', 'when', 'my', 'me', 'please'];
        const words = text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w));
        
        let foundConcepts = new Set();

        words.forEach(word => {
            for (const [concept, synonyms] of Object.entries(this.dictionary)) {
                for (const synonym of synonyms) {
                    if (word === synonym) {
                        foundConcepts.add(concept);
                        break;
                    }
                    const allowedTypos = synonym.length > 7 ? 2 : (synonym.length > 4 ? 1 : 0);
                    if (allowedTypos > 0) {
                        const dist = this.getLevenshteinDistance(word, synonym);
                        if (dist <= allowedTypos) {
                            foundConcepts.add(concept);
                            break;
                        }
                    }
                }
            }
        });

        return Array.from(foundConcepts);
    }

    getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- STATE MACHINE ENGINE --- //

    analyzeAndRespond(userInput) {
        const concepts = this.extractConcepts(userInput);
        const rawLower = userInput.toLowerCase();

        // 1. Process Active State
        if (this.state === 'booking_flow_start') {
            if (concepts.includes('fade') || rawLower.includes('fade')) {
                this.state = 'fade_detail';
                this.processBotResponse(this.getRandom([
                    "A fade is our specialty. Did you want a standard fade, a skin fade, or a premium fade with a lineup?",
                    "Awesome. We do the sharpest fades in Thornhill. Looking for a regular fade, skin fade, or premium?"
                ]), [
                    { text: "Regular Fade", action: "txt_regular fade" },
                    { text: "Skin Fade", action: "txt_skin fade" },
                    { text: "Premium Fade", action: "txt_premium fade" }
                ]);
                return;
            }
            if (concepts.includes('taper') || concepts.includes('classic') || concepts.includes('beard') || rawLower.includes('taper') || rawLower.includes('classic')) {
                this.state = 'cross_sell';
                this.processBotResponse(this.getRandom([
                    "Excellent choice. Before we lock in your time, many of our clients add a hot towel beard trim or eyebrow shaping. Do you want to add an extra service?",
                    "Got it. We'll make sure you look pristine. While you're in the chair, want to add a beard trim or eyebrow lineup?"
                ]), [
                    { text: "Add Beard Trim", action: "txt_yes beard" },
                    { text: "Add Eyebrows", action: "txt_yes eyebrows" },
                    { text: "Just the cut", action: "txt_no thanks" }
                ]);
                return;
            }
            // Fallback for booking flow start if they didn't pick a style
            this.state = 'cross_sell';
            this.processBotResponse("Sounds like a plan! By the way, while you're here, did you want to add a beard line-up or a hot towel shave?", [
                { text: "Yes, add beard", action: "txt_yes beard" },
                { text: "No, just the cut", action: "txt_no thanks" }
            ]);
            return;
        }

        if (this.state === 'fade_detail') {
            this.state = 'cross_sell';
            this.processBotResponse(this.getRandom([
                "Perfect. A sharp fade changes everything. By the way, while you're in the chair, want to add a hot towel beard trim or eyebrows?",
                "Great choice. Let's build your package. Do you want to add a beard line-up or eyebrow shaping to that?"
            ]), [
                { text: "Add Beard Trim", action: "txt_yes beard" },
                { text: "Add Eyebrows", action: "txt_yes eyebrows" },
                { text: "Just the haircut", action: "txt_no thanks" }
            ]);
            return;
        }

        if (this.state === 'cross_sell') {
            this.state = 'idle'; // Reset state
            this.processBotResponse(this.getRandom([
                "Awesome, your package is ready. Let's lock in your time on Booksy.",
                "Perfect, we've got you sorted. Click below to secure your exact spot on Booksy."
            ]), [
                { text: "Continue to Booksy", action: "link_booksy", primary: true }
            ]);
            return;
        }

        // 2. Global Router (Idle State)
        
        if (concepts.includes('book') || concepts.includes('haircut')) {
            this.state = 'booking_flow_start';
            this.processBotResponse(this.getRandom([
                "Absolutely! We can get you looking sharp. What style are you going for today?",
                "Let's get you in the chair. What kind of haircut are you interested in?",
                "I'd love to help you book that. What style are we doing?"
            ]), [
                { text: "Fade", action: "txt_fade" },
                { text: "Taper", action: "txt_taper" },
                { text: "Classic Cut", action: "txt_classic" },
                { text: "Haircut + Beard", action: "txt_beard combo" }
            ]);
            return;
        }

        if (concepts.includes('price')) {
            this.state = 'idle';
            this.processBotResponse(this.getRandom([
                "Our pricing is super straightforward: Classic cuts are $25, Skin Fades are $30, and a full Haircut + Beard combo is $45. Want to lock in a time?",
                "Prices start at $15 for beard trims and $25 for haircuts. For exact details, I can show you the full menu, or we can get you booked right now!"
            ]), [
                { text: "Book Appointment", action: "action_start_booking", primary: true },
                { text: "View Full Menu", action: "link_services" }
            ]);
            return;
        }

        if (concepts.includes('location')) {
            this.state = 'idle';
            this.processBotResponse(this.getRandom([
                "We're located at 370 Steeles Ave W #105, in Thornhill (ON). If you're driving, VIP parking is completely free right out front!",
                "You'll find the shop at 370 Steeles Ave W, Thornhill. Pull right up, parking is on us. Need directions?"
            ]), [
                { text: "Get Directions", action: "get_directions", primary: true },
                { text: "Book Appointment", action: "action_start_booking" }
            ]);
            return;
        }

        if (concepts.includes('hours')) {
            this.state = 'idle';
            this.processBotResponse(this.getRandom([
                "We're open Monday-Friday 9AM-8PM, Saturday 9AM-6PM, and Sunday 10AM-4PM. Chairs fill up fast though, so booking ahead is best!",
                "Shop hours: Mon-Fri (9a-8p), Sat (9a-6p), Sun (10a-4p). Want to check what times we have open today?"
            ]), [
                { text: "Check Availability", action: "link_booksy", primary: true }
            ]);
            return;
        }

        if (concepts.includes('offers')) {
            this.state = 'idle';
            this.processBotResponse(this.getRandom([
                "We run special promotions frequently! Currently, we offer student discounts and loyalty packages. Ask your barber when you come in!",
                "Always looking for a deal? We have student pricing and bundle packages. Let's get you booked so you can chat with the barber!"
            ]), [
                { text: "Book Appointment", action: "action_start_booking", primary: true }
            ]);
            return;
        }

        if (concepts.includes('contact')) {
            this.state = 'idle';
            this.processBotResponse(this.getRandom([
                "You can reach the receptionist directly at (905) 707-1969. Need to call us right now?",
                "Give us a ring at (905) 707-1969 and we'll sort you out."
            ]), [
                { text: "Call (905) 707-1969", action: "call_shop", primary: true }
            ]);
            return;
        }

        // 3. Global Fallback
        this.processBotResponse(this.getRandom([
            "I'm here to help you get booked and answer any shop questions. What can I assist you with?",
            "As the virtual receptionist, I can help with booking, prices, or finding our shop. What do you need?"
        ]), [
            { text: "Book Appointment", action: "action_start_booking", primary: true },
            { text: "Haircut Prices", action: "txt_prices" },
            { text: "Services", action: "link_services" }
        ]);
    }

    // --- UI INJECTION & MANAGEMENT --- //

    initDOM() {
        const style = document.createElement('style');
        style.innerHTML = `
            #chatbot-widget { position: fixed; bottom: 30px; right: 30px; z-index: 9999; font-family: var(--font-body, sans-serif); }
            .chatbot-bubble { width: 60px; height: 60px; background: var(--color-gold, #D4AF37); border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.3); transition: transform 0.3s; }
            .chatbot-bubble:hover { transform: scale(1.1); }
            .chatbot-bubble svg { width: 30px; height: 30px; fill: #111; }
            .chatbot-container { position: absolute; bottom: 80px; right: 0; width: 350px; background: #111; border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 15px; overflow: hidden; display: none; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5); opacity: 0; transform: translateY(20px); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .chatbot-container.active { display: flex; opacity: 1; transform: translateY(0); }
            .chatbot-header { background: #1a1a1a; padding: 15px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); display: flex; justify-content: space-between; align-items: center; }
            .chatbot-header h4 { margin: 0; color: var(--color-gold, #D4AF37); font-size: 16px; display: flex; align-items: center; gap: 8px; }
            .chatbot-header-icon { width: 10px; height: 10px; background: #2ecc71; border-radius: 50%; display: inline-block; box-shadow: 0 0 5px #2ecc71; }
            .chatbot-close { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; line-height: 1; }
            .chatbot-body { padding: 15px; height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
            .chatbot-body::-webkit-scrollbar { width: 5px; }
            .chatbot-body::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.5); border-radius: 5px; }
            .chatbot-input-area { padding: 10px 15px; background: #1a1a1a; border-top: 1px solid rgba(212, 175, 55, 0.2); display: flex; gap: 10px; }
            .chatbot-input { flex: 1; background: #222; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 10px 15px; color: #fff; outline: none; transition: border-color 0.3s; }
            .chatbot-input:focus { border-color: var(--color-gold, #D4AF37); }
            .chatbot-send-btn { background: var(--color-gold, #D4AF37); color: #111; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: transform 0.2s; }
            .chatbot-send-btn:hover { transform: scale(1.05); }
            .chatbot-send-btn svg { width: 18px; height: 18px; fill: #111; margin-left: 2px; }
            .chat-msg { max-width: 80%; padding: 10px 14px; border-radius: 15px; font-size: 14px; line-height: 1.4; animation: popIn 0.3s ease forwards; opacity: 1 !important; }
            .chat-msg.bot { background: #222; color: #eee; align-self: flex-start; border-bottom-left-radius: 2px; }
            .chat-msg.user { background: var(--color-gold, #D4AF37); color: #111; align-self: flex-end; border-bottom-right-radius: 2px; }
            .chat-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; animation: popIn 0.4s ease forwards; opacity: 1 !important; }
            .chat-btn { background: transparent; border: 1px solid var(--color-gold, #D4AF37); color: var(--color-gold, #D4AF37); padding: 8px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
            .chat-btn:hover { background: rgba(212, 175, 55, 0.1); }
            .chat-btn.primary { background: var(--color-gold, #D4AF37); color: #111; font-weight: bold; }
            .chat-btn.primary:hover { background: #b8962e; }
            .chat-btn.secondary { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ccc; }
            .chat-btn.secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); color: #fff; }
            .typing-indicator { align-self: flex-start; background: #222; padding: 12px 16px; border-radius: 15px; display: flex; gap: 5px; border-bottom-left-radius: 2px; margin-bottom: 10px; }
            .typing-dot { width: 6px; height: 6px; background: rgba(255,255,255,0.5); border-radius: 50%; animation: typing 1.4s infinite ease-in-out both; }
            .typing-dot:nth-child(1) { animation-delay: -0.32s; }
            .typing-dot:nth-child(2) { animation-delay: -0.16s; }
            @keyframes popIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(212, 175, 55, 0); } 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); } }
            @media (max-width: 480px) { .chatbot-container { width: calc(100vw - 40px); right: 20px; bottom: 90px; } }
        `;
        document.head.appendChild(style);

        const widgetHTML = `
            <div id="chatbot-widget">
                <div class="chatbot-bubble magnetic" id="chat-bubble">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                </div>
                <div class="chatbot-container" id="chat-container">
                    <div class="chatbot-header">
                        <h4><span class="chatbot-header-icon"></span> King Receptionist</h4>
                        <button class="chatbot-close" id="chat-close">&times;</button>
                    </div>
                    <div class="chatbot-body" id="chat-body"></div>
                    <div class="chatbot-input-area">
                        <input type="text" id="chat-input" class="chatbot-input" placeholder="Type a message..." autocomplete="off">
                        <button id="chat-send" class="chatbot-send-btn">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', widgetHTML);

        this.bubble = document.getElementById('chat-bubble');
        this.container = document.getElementById('chat-container');
        this.closeBtn = document.getElementById('chat-close');
        this.body = document.getElementById('chat-body');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');
    }

    attachEvents() {
        this.bubble.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.toggleChat());
        
        this.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-btn') && e.target.dataset.action) {
                this.handleAction(e.target.dataset.action, e.target.textContent);
            }
        });

        this.sendBtn.addEventListener('click', () => this.handleUserInput());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
    }

    bindTriggers() {
        setTimeout(() => {
            if(!sessionStorage.getItem('chatPrompted')) {
                this.bubble.style.animation = "pulse 2s infinite";
                sessionStorage.setItem('chatPrompted', 'true');
            }
        }, 8000); 
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.container.classList.add('active');
            this.bubble.style.animation = "none";
            if (this.body.children.length === 0) {
                this.startWelcomeFlow();
            }
            setTimeout(() => this.input.focus(), 300);
        } else {
            this.container.classList.remove('active');
        }
    }

    scrollBottom() {
        this.body.scrollTop = this.body.scrollHeight;
    }

    showTyping() {
        this.isTyping = true;
        const id = 'typing-' + Date.now();
        const html = `
            <div class="typing-indicator" id="${id}">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        this.body.insertAdjacentHTML('beforeend', html);
        this.scrollBottom();
        return id;
    }

    removeTyping(id) {
        this.isTyping = false;
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    addUserMessage(text) {
        const html = `<div class="chat-msg user">${text}</div>`;
        this.body.insertAdjacentHTML('beforeend', html);
        this.scrollBottom();
    }

    addBotMessage(text) {
        const html = `<div class="chat-msg bot">${text}</div>`;
        this.body.insertAdjacentHTML('beforeend', html);
        this.scrollBottom();
    }

    addButtons(buttons) {
        if(!buttons || buttons.length === 0) return;
        const btnHtml = buttons.map(b => `
            <button class="chat-btn ${b.primary ? 'primary' : (b.secondary ? 'secondary' : '')}" data-action="${b.action}">
                ${b.text}
            </button>
        `).join('');
        const html = `<div class="chat-buttons">${btnHtml}</div>`;
        this.body.insertAdjacentHTML('beforeend', html);
        this.scrollBottom();
    }

    hideOldButtons() {
        const currentButtons = this.body.querySelectorAll('.chat-buttons');
        if(currentButtons.length > 0) {
            currentButtons[currentButtons.length-1].style.opacity = '0.5';
            currentButtons[currentButtons.length-1].style.pointerEvents = 'none';
        }
    }

    async processBotResponse(text, buttons = [], customDelay = null, pushToHistory = true) {
        if (pushToHistory) {
            this.historyStack.push({ state: this.state, text: text, buttons: buttons });
        }

        let finalButtons = [...buttons];
        if (this.historyStack.length > 1) {
            finalButtons.push({ text: "← Back", action: "nav_back", secondary: true });
            finalButtons.push({ text: "🏠 Main Menu", action: "nav_main_menu", secondary: true });
        }

        const typeId = this.showTyping();
        const dynamicDelay = customDelay || Math.min(Math.max(text.length * 20, 800), 2000); 
        await new Promise(r => setTimeout(r, dynamicDelay));
        
        this.removeTyping(typeId);
        this.addBotMessage(text);
        if(finalButtons.length > 0) {
            setTimeout(() => this.addButtons(finalButtons), 200);
        }
    }

    handleUserInput() {
        if(this.isTyping) return;
        const rawText = this.input.value.trim();
        if(rawText === '') return;
        
        this.input.value = '';
        this.addUserMessage(rawText);
        this.hideOldButtons();
        
        this.analyzeAndRespond(rawText);
    }

    handleAction(action, text) {
        this.hideOldButtons();

        if (action === 'nav_back') {
            if (this.historyStack.length > 1) {
                this.historyStack.pop(); // Remove current
                const prevState = this.historyStack[this.historyStack.length - 1];
                this.state = prevState.state;
                
                this.addBotMessage(prevState.text);
                let finalButtons = [...prevState.buttons];
                if (this.historyStack.length > 1) {
                    finalButtons.push({ text: "← Back", action: "nav_back", secondary: true });
                    finalButtons.push({ text: "🏠 Main Menu", action: "nav_main_menu", secondary: true });
                }
                this.addButtons(finalButtons);
            }
            return;
        }

        if (action === 'nav_main_menu') {
            this.historyStack = [];
            this.state = 'idle';
            this.startWelcomeFlow();
            return;
        }

        this.addUserMessage(text);

        if (action.startsWith('txt_')) {
            // Treat button click as user typing the text
            this.analyzeAndRespond(text);
            return;
        }

        switch (action) {
            case 'action_start_booking':
                this.state = 'booking_flow_start';
                this.processBotResponse("Awesome! Let's get you lined up. What style are you looking for today?", [
                    { text: "Fade", action: "txt_fade" },
                    { text: "Taper", action: "txt_taper" },
                    { text: "Classic Cut", action: "txt_classic" },
                    { text: "Haircut + Beard", action: "txt_beard combo" }
                ]);
                break;
            case 'link_booksy':
                window.open('https://booksy.com/en-ca/24439_clip-kings-barber-shop_barbershop_990795_thornhill', '_blank');
                this.processBotResponse("I'm opening Booksy in a new tab for you. See you at the shop!");
                break;
            case 'link_services':
                window.location.href = 'services.html';
                break;
            case 'link_transformations':
                window.location.href = 'transformations.html';
                break;
            case 'link_reviews':
                window.location.href = 'reviews.html';
                break;
            case 'call_shop':
                window.location.href = 'tel:+19057071969';
                break;
            case 'get_directions':
                window.open('https://www.google.com/maps/place/Clip+Kings+Barber+Shop/@43.7960533,-79.4361299,795m', '_blank');
                break;
        }
    }

    startWelcomeFlow() {
        this.historyStack = []; // Reset history at main menu
        let greeting = "Hello! Welcome to Clip Kings.";
        
        // Dynamic Page Greeting
        if (this.currentPage.includes('services')) greeting = "Welcome! Are you looking for pricing details or ready to book a chair?";
        if (this.currentPage.includes('gallery') || this.currentPage.includes('transformations')) greeting = "Checking out our work? Let me know if you see a style you want to book!";
        if (this.currentPage.includes('reviews')) greeting = "Our clients speak for us. Ready to experience it yourself?";

        this.processBotResponse(`${greeting} I'm the shop receptionist. How can I assist you today?`, [
            { text: "Book Appointment", action: "action_start_booking", primary: true },
            { text: "Haircut Prices", action: "txt_prices" },
            { text: "Beard Services", action: "txt_beard trims" },
            { text: "Popular Packages", action: "link_services" },
            { text: "Special Offers", action: "txt_offers" },
            { text: "Business Hours", action: "txt_hours" },
            { text: "Location & Parking", action: "txt_location" },
            { text: "Contact Us", action: "txt_contact" }
        ]);
    }
}

// Ensure init on load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.kingAssistant = new DecisionTreeAssistant();
} else {
    window.addEventListener('load', () => {
        window.kingAssistant = new DecisionTreeAssistant();
    });
}