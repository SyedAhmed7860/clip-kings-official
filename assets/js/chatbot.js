/**
 * King Assistant - Frontend Logic Tree Chatbot
 * Optimized for Booksy Conversions
 */

class KingAssistant {
    constructor() {
        this.isOpen = false;
        this.initDOM();
        this.attachEvents();
        this.bindTriggers();
    }

    initDOM() {
        // Create Chatbot Widget HTML
        const widgetHTML = `
            <div id="chatbot-widget">
                <div class="chatbot-bubble magnetic" id="chat-bubble">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                </div>
                <div class="chatbot-container" id="chat-container">
                    <div class="chatbot-header">
                        <h4><span class="chatbot-header-icon"></span> King Assistant</h4>
                        <button class="chatbot-close" id="chat-close">&times;</button>
                    </div>
                    <div class="chatbot-body" id="chat-body"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', widgetHTML);

        this.bubble = document.getElementById('chat-bubble');
        this.container = document.getElementById('chat-container');
        this.closeBtn = document.getElementById('chat-close');
        this.body = document.getElementById('chat-body');
    }

    attachEvents() {
        this.bubble.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.toggleChat());
        
        // Handle button clicks in chat via event delegation
        this.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-btn') && e.target.dataset.action) {
                this.handleAction(e.target.dataset.action, e.target.textContent);
            }
        });
    }

    bindTriggers() {
        // Automatically show a personalized message based on behavior
        setTimeout(() => {
            if(!sessionStorage.getItem('chatPrompted')) {
                this.showTyping();
                setTimeout(() => {
                    this.addBotMessage("Looks like you're checking out our services. Want to reserve your spot before today's appointments fill up?");
                    this.addButtons([
                        { text: "Book Appointment", action: "book_now", primary: true },
                        { text: "View Services", action: "view_services" }
                    ]);
                    this.bubble.style.animation = "pulse 2s infinite";
                    sessionStorage.setItem('chatPrompted', 'true');
                }, 1000);
            }
        }, 15000); // Trigger after 15 seconds
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.container.classList.add('active');
            this.bubble.style.animation = "none";
            // If empty, start welcome flow
            if (this.body.children.length === 0) {
                this.startWelcomeFlow();
            }
        } else {
            this.container.classList.remove('active');
        }
    }

    scrollBottom() {
        this.body.scrollTop = this.body.scrollHeight;
    }

    showTyping() {
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
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    addUserMessage(text) {
        const html = `<div class="chat-msg user">${text}</div>`;
        this.body.insertAdjacentHTML('beforeend', html);
        this.scrollBottom();
    }

    addBotMessage(text, isHtml = false) {
        const content = isHtml ? text : text;
        const html = `<div class="chat-msg bot">${content}</div>`;
        this.body.insertAdjacentHTML('beforeend', html);
        this.scrollBottom();
    }

    addButtons(buttons) {
        const btnHtml = buttons.map(b => `
            <button class="chat-btn ${b.primary ? 'primary' : ''}" data-action="${b.action}">
                ${b.text}
            </button>
        `).join('');
        const html = `<div class="chat-buttons">${btnHtml}</div>`;
        this.body.insertAdjacentHTML('beforeend', html);
        this.scrollBottom();
    }

    async processLogic(delay, logicFn) {
        const typeId = this.showTyping();
        await new Promise(r => setTimeout(r, delay));
        this.removeTyping(typeId);
        logicFn();
    }

    // --- FLOWS ---

    startWelcomeFlow() {
        this.processLogic(800, () => {
            this.addBotMessage("Welcome to Clip Kings. What can I help you with today?");
            this.addButtons([
                { text: "Book Now", action: "book_now", primary: true },
                { text: "View Services", action: "view_services" },
                { text: "View Prices", action: "pricing" },
                { text: "Speak To Us", action: "contact" }
            ]);
        });
    }

    handleAction(action, text) {
        this.addUserMessage(text);
        
        // Remove active buttons
        const currentButtons = this.body.querySelectorAll('.chat-buttons');
        if(currentButtons.length > 0) {
            currentButtons[currentButtons.length-1].style.display = 'none';
        }

        switch (action) {
            case 'book_now':
                this.processLogic(1000, () => {
                    this.addBotMessage(`
                        <div class="chat-card">
                            <h5>Ready for a premium cut?</h5>
                            <p>Secure your spot via our official Booksy profile.</p>
                            <a href="https://booksy.com/en-ca/24439_clip-kings-barber-shop_barbershop_990795_thornhill" target="_blank" class="chat-btn primary" style="display:block;text-align:center;text-decoration:none;">Continue to Booksy</a>
                        </div>
                    `, true);
                    this.addButtons([{ text: "Other Options", action: "main_menu" }]);
                });
                break;
            case 'view_services':
                this.processLogic(1000, () => {
                    this.addBotMessage("What type of service are you looking for?");
                    this.addButtons([
                        { text: "Haircut Only", action: "rec_haircut" },
                        { text: "Haircut + Beard", action: "rec_haircut_beard" },
                        { text: "Beard Service", action: "rec_beard" },
                        { text: "Kids Haircut", action: "rec_kids" }
                    ]);
                });
                break;
            case 'pricing':
                this.processLogic(1200, () => {
                    this.addBotMessage("Our standard pricing starts at $25 for a Classic Haircut, and $30 for a Skin Fade. A full Haircut & Beard line up is $45.");
                    this.addButtons([
                        { text: "Book Now", action: "book_now", primary: true },
                        { text: "Happy Hour Deals", action: "happy_hour" },
                        { text: "Full Menu", action: "link_services" }
                    ]);
                });
                break;
            case 'happy_hour':
                this.processLogic(1200, () => {
                    this.addBotMessage(`
                        <div class="chat-card">
                            <h5>Happy Hour Deals (20% OFF)</h5>
                            <p>Monday - Thursday, 12PM - 4PM.<br>Classic Haircut: $20<br>Haircut + Beard: $36</p>
                            <a href="happy-hour.html" class="chat-btn" style="display:block;text-align:center;text-decoration:none;">View All Deals</a>
                        </div>
                    `, true);
                    this.addButtons([{ text: "Book Happy Hour", action: "book_now", primary: true }]);
                });
                break;
            case 'contact':
                this.processLogic(1000, () => {
                    this.addBotMessage("You can reach us at (905) 707-1969 or visit us at 370 Steeles Ave W #105, Thornhill.");
                    this.addButtons([
                        { text: "Call Shop", action: "call_shop" },
                        { text: "Get Directions", action: "get_directions" },
                        { text: "Hours", action: "hours" }
                    ]);
                });
                break;
            
            // Sub-flows
            case 'rec_haircut':
                this.processLogic(800, () => {
                    this.addBotMessage("For a haircut only, we recommend our Classic Haircut ($25) or our signature Skin Fade ($30).");
                    this.addButtons([{ text: "Book This", action: "book_now", primary: true }, { text: "Back", action: "view_services" }]);
                });
                break;
            case 'rec_haircut_beard':
                this.processLogic(800, () => {
                    this.addBotMessage("Our Haircut & Beard Trim Line Up ($45) is our most popular full grooming session.");
                    this.addButtons([{ text: "Book This", action: "book_now", primary: true }, { text: "Back", action: "view_services" }]);
                });
                break;
            case 'rec_beard':
                this.processLogic(800, () => {
                    this.addBotMessage("We offer a Beard Trim ($15), Beard Sculpting ($22), and a Luxury Hot Towel Shave ($35).");
                    this.addButtons([{ text: "Book This", action: "book_now", primary: true }, { text: "Back", action: "view_services" }]);
                });
                break;
            case 'rec_kids':
                this.processLogic(800, () => {
                    this.addBotMessage("We do! Kids haircuts (under 12) are typically $20.");
                    this.addButtons([{ text: "Book This", action: "book_now", primary: true }, { text: "Back", action: "view_services" }]);
                });
                break;
            case 'link_services':
                window.location.href = 'services.html';
                break;
            case 'call_shop':
                window.location.href = 'tel:+19057071969';
                break;
            case 'get_directions':
                window.open('https://www.google.com/maps/place/Clip+Kings+Barber+Shop/@43.7960533,-79.4361299,795m', '_blank');
                break;
            case 'hours':
                this.processLogic(800, () => {
                    this.addBotMessage("We are open Mon-Fri: 9AM-8PM, Sat: 9AM-6PM, Sun: 10AM-4PM.");
                    this.addButtons([{ text: "Book Now", action: "book_now", primary: true }]);
                });
                break;
            case 'main_menu':
                this.startWelcomeFlow();
                break;
            default:
                this.processLogic(500, () => {
                    this.addBotMessage("I can help you with bookings, services, and location.");
                    this.addButtons([{ text: "Main Menu", action: "main_menu" }]);
                });
        }
    }
}

// Initialize Chatbot when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.kingAssistant = new KingAssistant();
});
