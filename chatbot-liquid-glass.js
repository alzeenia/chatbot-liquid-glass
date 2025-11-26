/**
 * Chatbot Widget Embed Script - Apple Liquid Glass Design
 * Glassmorphism / Frosted Glass Aesthetic
 * 
 * Usage:
 * <script src="chatbot-liquid-glass.js"></script>
 * <script>
 *   ChatbotLiquidGlass.init({
 *     webhookUrl: 'YOUR_WEBHOOK_URL',
 *     position: 'bottom-right'
 *   });
 * </script>
 */

(function() {
    'use strict';

    const defaults = {
        position: 'bottom-right',
        title: 'Genie Support',
        subtitle: 'The Digital PO Box',
        primaryColor: '#003D46',
        accentColor: '#00B7B0',
        highlightColor: '#FF6A3D',
        backgroundColor: '#F4F4F6',
        showBadge: true,
        soundsEnabled: true  // Enable/disable sound effects
    };

    class ChatbotLiquidGlass {
        constructor(config) {
            if (!config || !config.webhookUrl || config.webhookUrl.trim() === '') {
                throw new Error('ChatbotLiquidGlass: webhookUrl is required.');
            }

            this.config = { ...defaults, ...config };
            this.state = {
                currentStep: '',
                session_id: '',
                user_type: '',
                concern_category: '',
                question: ''
            };
            this.isOpen = false;
            this.soundsEnabled = config.soundsEnabled !== false; // Default: true
            this.audioContext = null;
            this.init();
        }

        init() {
            this.injectStyles();
            this.createWidget();
            this.attachEvents();
            this.initAudio();
        }

        initAudio() {
            // Initialize Web Audio API for sound effects
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported, sounds disabled');
                this.soundsEnabled = false;
            }
        }

        playSound(type = 'message') {
            if (!this.soundsEnabled || !this.audioContext) return;

            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                // Different sounds for different actions
                switch(type) {
                    case 'message':
                        // Soft pop for messages
                        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.1);
                        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                        oscillator.type = 'sine';
                        break;
                    case 'option':
                        // Light click for option selection
                        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.08);
                        gainNode.gain.setValueAtTime(0.12, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                        oscillator.type = 'sine';
                        break;
                    case 'send':
                        // Upward tone for sending
                        oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(700, this.audioContext.currentTime + 0.1);
                        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.12);
                        oscillator.type = 'sine';
                        break;
                    case 'typing':
                        // Subtle typing sound
                        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                        gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                        oscillator.type = 'sine';
                        break;
                    case 'open':
                        // Pleasant open sound
                        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.15);
                        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                        oscillator.type = 'sine';
                        break;
                    default:
                        oscillator.frequency.value = 400;
                        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                }

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.2);
            } catch (e) {
                // Silently fail if audio context is suspended (user interaction required)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().catch(() => {});
                }
            }
        }

        injectStyles() {
            if (document.getElementById('chatbot-liquid-glass-styles')) return;

            const fontLink = document.createElement('link');
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);

            const style = document.createElement('style');
            style.id = 'chatbot-liquid-glass-styles';
            style.textContent = `
                #chatbot-lg-container {
                    font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    position: fixed;
                    z-index: 999999;
                }
                
                /* Toggle Button - Glass Effect */
                #chatbot-lg-toggle {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: rgba(0, 61, 70, 0.85);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    box-shadow: 0 8px 32px rgba(0, 61, 70, 0.3),
                                0 2px 8px rgba(0, 0, 0, 0.1),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255, 255, 255, 0.18);
                }
                
                #chatbot-lg-toggle:hover {
                    transform: scale(1.1);
                    background: rgba(0, 61, 70, 0.95);
                    box-shadow: 0 12px 40px rgba(0, 61, 70, 0.4),
                                0 4px 12px rgba(0, 0, 0, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }
                
                #chatbot-lg-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #FF6A3D, #FF8C5A);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    color: white;
                    font-size: 11px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(255, 106, 61, 0.4),
                                inset 0 1px 0 rgba(255, 255, 255, 0.3);
                    border: 1.5px solid rgba(255, 255, 255, 0.3);
                }
                
                /* Widget Container - Liquid Glass */
                #chatbot-lg-widget {
                    width: 400px;
                    height: 600px;
                    border-radius: 24px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(40px) saturate(180%);
                    -webkit-backdrop-filter: blur(40px) saturate(180%);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15),
                                0 8px 24px rgba(0, 0, 0, 0.1),
                                inset 0 1px 0 rgba(255, 255, 255, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    animation: glassSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                @keyframes glassSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                /* Header - Glass Effect */
                .chatbot-lg-header {
                    padding: 20px 24px;
                    background: rgba(0, 61, 70, 0.75);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }
                
                .chatbot-lg-header-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .chatbot-lg-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(0, 183, 176, 0.9);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0, 183, 176, 0.3),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .chatbot-lg-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: white;
                    margin: 0;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                }
                
                .chatbot-lg-subtitle {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.85);
                    margin: 2px 0 0 0;
                    font-weight: 400;
                }
                
                .chatbot-lg-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    line-height: 1;
                }
                
                .chatbot-lg-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }
                
                /* Messages Area - Glass Background */
                .chatbot-lg-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px 20px;
                    background: rgba(244, 244, 246, 0.4);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    scroll-behavior: smooth;
                }
                
                .chatbot-lg-messages::-webkit-scrollbar {
                    width: 6px;
                }
                
                .chatbot-lg-messages::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .chatbot-lg-messages::-webkit-scrollbar-thumb {
                    background: rgba(0, 61, 70, 0.2);
                    border-radius: 3px;
                    backdrop-filter: blur(10px);
                }
                
                .chatbot-lg-messages::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 61, 70, 0.3);
                }
                
                /* Message Bubbles - Glass Effect */
                .chatbot-lg-message {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                    animation: messageFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    align-items: flex-end;
                }
                
                @keyframes messageFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .chatbot-lg-message.user {
                    flex-direction: row-reverse;
                }
                
                .chatbot-lg-message-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 12px;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .chatbot-lg-message-container {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }
                
                .chatbot-lg-message-bubble {
                    max-width: 75%;
                    padding: 10px 14px;
                    border-radius: 18px;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    line-height: 1.5;
                    font-size: 14px;
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
                                inset 0 1px 0 rgba(255, 255, 255, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                
                .chatbot-lg-message.bot .chatbot-lg-message-bubble {
                    background: rgba(255, 255, 255, 0.8);
                    border-radius: 18px 18px 18px 4px;
                    color: #003D46;
                }
                
                .chatbot-lg-message.user .chatbot-lg-message-bubble {
                    background: rgba(0, 61, 70, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    color: white;
                    border-radius: 18px 18px 4px 18px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                /* Options - Sleek Glass Buttons with Smart Layout */
                .chatbot-lg-options {
                    margin-top: 8px;
                    margin-left: 36px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 6px;
                    max-width: 90%;
                }
                
                /* For many options, use 2 columns */
                .chatbot-lg-options:has(.chatbot-lg-option-btn:nth-child(6)) {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                /* For few options, use single column */
                .chatbot-lg-options:has(.chatbot-lg-option-btn:nth-child(-n+3)) {
                    grid-template-columns: 1fr;
                }
                
                .chatbot-lg-option-btn {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(0, 183, 176, 0.25);
                    border-radius: 10px;
                    padding: 7px 12px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    font-size: 12px;
                    color: #003D46;
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 500;
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05),
                                inset 0 1px 0 rgba(255, 255, 255, 0.4);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    min-height: 36px;
                    line-height: 1.3;
                }
                
                .chatbot-lg-option-btn:hover:not(:disabled) {
                    background: rgba(0, 183, 176, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    color: white;
                    transform: translateY(-1px) scale(1.02);
                    box-shadow: 0 3px 12px rgba(0, 183, 176, 0.25),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    border-color: rgba(0, 183, 176, 0.4);
                }
                
                .chatbot-lg-option-btn:active:not(:disabled) {
                    transform: translateY(0) scale(0.98);
                }
                
                .chatbot-lg-option-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .chatbot-lg-option-btn .option-icon {
                    font-size: 13px;
                    flex-shrink: 0;
                }
                
                /* Footer - Glass Effect */
                .chatbot-lg-footer {
                    padding: 18px 24px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border-top: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05),
                                inset 0 1px 0 rgba(255, 255, 255, 0.5);
                }
                
                .chatbot-lg-input-wrapper {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                
                .chatbot-lg-input {
                    flex: 1;
                    border: 1.5px solid rgba(0, 183, 176, 0.2);
                    border-radius: 20px;
                    padding: 11px 18px;
                    font-size: 14px;
                    outline: none;
                    transition: all 0.3s;
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    font-family: 'Montserrat', sans-serif;
                    color: #003D46;
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04),
                                0 1px 0 rgba(255, 255, 255, 0.5);
                }
                
                .chatbot-lg-input:focus {
                    border-color: rgba(0, 183, 176, 0.5);
                    background: rgba(255, 255, 255, 0.95);
                    box-shadow: 0 0 0 3px rgba(0, 183, 176, 0.1),
                                inset 0 2px 4px rgba(0, 0, 0, 0.04),
                                0 1px 0 rgba(255, 255, 255, 0.5);
                }
                
                .chatbot-lg-send-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(255, 106, 61, 0.9), rgba(255, 140, 90, 0.9));
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 12px rgba(255, 106, 61, 0.3),
                                inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }
                
                .chatbot-lg-send-btn:hover:not(:disabled) {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(255, 106, 61, 0.4),
                                inset 0 1px 0 rgba(255, 255, 255, 0.4);
                }
                
                .chatbot-lg-send-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    transform: scale(1);
                }
                
                .chatbot-lg-start-btn {
                    width: 100%;
                    background: linear-gradient(135deg, rgba(255, 106, 61, 0.9), rgba(255, 140, 90, 0.9));
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    border-radius: 16px;
                    padding: 13px 24px;
                    font-size: 15px;
                    font-weight: 600;
                    font-family: 'Montserrat', sans-serif;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 16px rgba(255, 106, 61, 0.3),
                                inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }
                
                .chatbot-lg-start-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 24px rgba(255, 106, 61, 0.4),
                                inset 0 1px 0 rgba(255, 255, 255, 0.4);
                }
                
                .typing-indicator {
                    display: flex;
                    gap: 5px;
                    padding: 10px 14px;
                }
                
                .typing-dot {
                    width: 8px;
                    height: 8px;
                    background: rgba(0, 61, 70, 0.4);
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                    backdrop-filter: blur(5px);
                }
                
                .typing-dot:nth-child(2) {
                    animation-delay: 0.2s;
                }
                
                .typing-dot:nth-child(3) {
                    animation-delay: 0.4s;
                }
                
                @keyframes typing {
                    0%, 60%, 100% {
                        transform: translateY(0);
                        opacity: 0.5;
                    }
                    30% {
                        transform: translateY(-8px);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        createWidget() {
            const container = document.createElement('div');
            container.id = 'chatbot-lg-container';
            this.setPosition(container);

            // Toggle Button
            const toggle = document.createElement('button');
            toggle.id = 'chatbot-lg-toggle';
            toggle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;

            if (this.config.showBadge) {
                const badge = document.createElement('div');
                badge.id = 'chatbot-lg-badge';
                badge.style.display = 'none'; // Hidden by default, shown only when there's a new message
                toggle.appendChild(badge);
                this.badge = badge;
            }

            // Widget
            const widget = document.createElement('div');
            widget.id = 'chatbot-lg-widget';
            widget.innerHTML = `
                <div class="chatbot-lg-header">
                    <div class="chatbot-lg-header-content">
                        <div class="chatbot-lg-avatar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div>
                            <div class="chatbot-lg-title">${this.config.title}</div>
                            <div class="chatbot-lg-subtitle">${this.config.subtitle}</div>
                        </div>
                    </div>
                    <button class="chatbot-lg-close" id="chatbot-lg-close">×</button>
                </div>
                <div class="chatbot-lg-messages" id="chatbot-lg-messages"></div>
                <div class="chatbot-lg-footer" id="chatbot-lg-footer">
                    <button class="chatbot-lg-start-btn" id="chatbot-lg-start">Start Chat</button>
                </div>
            `;

            container.appendChild(toggle);
            container.appendChild(widget);
            document.body.appendChild(container);

            this.container = container;
            this.toggle = toggle;
            this.widget = widget;
            this.messagesDiv = widget.querySelector('#chatbot-lg-messages');
            this.footerDiv = widget.querySelector('#chatbot-lg-footer');
        }

        setPosition(container) {
            const positions = {
                'bottom-right': { bottom: '24px', right: '24px' },
                'bottom-left': { bottom: '24px', left: '24px' },
                'top-right': { top: '24px', right: '24px' },
                'top-left': { top: '24px', left: '24px' }
            };
            const pos = positions[this.config.position] || positions['bottom-right'];
            Object.assign(container.style, pos);
        }

        attachEvents() {
            this.toggle.addEventListener('click', () => this.open());
            this.widget.querySelector('#chatbot-lg-close').addEventListener('click', () => this.close());
            this.widget.querySelector('#chatbot-lg-start').addEventListener('click', () => this.startChat());
        }

        open() {
            this.widget.style.display = 'flex';
            this.toggle.style.display = 'none';
            this.isOpen = true;
            // Hide badge when widget is opened
            if (this.badge) {
                this.badge.style.display = 'none';
            }
        }

        close() {
            this.widget.style.display = 'none';
            this.toggle.style.display = 'flex';
            this.isOpen = false;
        }

        showBadge() {
            if (this.badge && !this.isOpen) {
                this.badge.style.display = 'flex';
                this.badge.textContent = '1';
            }
        }

        hideBadge() {
            if (this.badge) {
                this.badge.style.display = 'none';
            }
        }

        resetChat() {
            // Clear messages
            this.messagesDiv.innerHTML = '';
            
            // Reset state
            this.state = {
                currentStep: '',
                session_id: '',
                user_type: '',
                concern_category: '',
                question: ''
            };
            
            // Show start button
            this.footerDiv.innerHTML = `
                <button class="chatbot-lg-start-btn" id="chatbot-lg-start">Start Chat</button>
            `;
            
            // Re-attach start button event
            this.widget.querySelector('#chatbot-lg-start').addEventListener('click', () => this.startChat());
            
            // Scroll to top
            this.messagesDiv.scrollTop = 0;
        }

        addMessage(text, isBot = true) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chatbot-lg-message ${isBot ? 'bot' : 'user'}`;
            
            const avatar = document.createElement('div');
            avatar.className = 'chatbot-lg-message-avatar';
            avatar.style.background = isBot 
                ? `rgba(0, 61, 70, 0.85)`
                : `rgba(0, 183, 176, 0.85)`;
            avatar.textContent = isBot ? '💬' : '👤';
            
            const container = document.createElement('div');
            container.className = 'chatbot-lg-message-container';
            
            const bubble = document.createElement('div');
            bubble.className = 'chatbot-lg-message-bubble';
            bubble.textContent = text;
            
            container.appendChild(bubble);
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(container);
            this.messagesDiv.appendChild(messageDiv);
            this.scrollToBottom();
            
            // Play sound only for bot messages (received)
            if (isBot) {
                setTimeout(() => this.playSound('message'), 50);
                // Show badge if widget is closed (new message notification)
                if (!this.isOpen) {
                    this.showBadge();
                }
            }
            
            return container;
        }

        getOptionIcon(optionId, optionValue) {
            const id = (optionId || '').toLowerCase();
            const value = (optionValue || '').toLowerCase();
            
            if (id.includes('location') || id.includes('address') || value.includes('location') || value.includes('address')) {
                return '📍';
            }
            if (id.includes('payment') || id.includes('subscription') || id.includes('billing') || value.includes('payment') || value.includes('subscription')) {
                return '💳';
            }
            if (id.includes('portal') || id.includes('app') || value.includes('portal') || value.includes('app')) {
                return '🖥️';
            }
            if (id.includes('privacy') || id.includes('security') || value.includes('privacy') || value.includes('security')) {
                return '🔒';
            }
            if (id.includes('mail') || id.includes('processing') || value.includes('mail') || value.includes('processing')) {
                return '✉️';
            }
            if (id.includes('getting_started') || value.includes('getting started')) {
                return '🚀';
            }
            if (id.includes('something_else') || id.includes('something else') || value.includes('something else')) {
                return '💬';
            }
            if (id === 'customer' || value.toLowerCase() === 'customer') {
                return '👤';
            }
            if (id === 'partner' || value.toLowerCase() === 'partner') {
                return '🤝';
            }
            if (id.includes('not sure') || value.includes('not sure')) {
                return '❓';
            }
            return '•';
        }

        addOptions(options) {
            const lastMessage = this.messagesDiv.lastElementChild;
            if (!lastMessage) return;
            
            const container = lastMessage.querySelector('.chatbot-lg-message-container');
            if (!container) return;
            
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'chatbot-lg-options';
            
            options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'chatbot-lg-option-btn';
                const icon = this.getOptionIcon(option.id, option.option_value);
                btn.innerHTML = `<span class="option-icon">${icon}</span><span>${option.option_value}</span>`;
                btn.onclick = () => this.handleOptionClick(option);
                optionsDiv.appendChild(btn);
            });
            
            container.appendChild(optionsDiv);
        }

        enableTextInput() {
            this.footerDiv.innerHTML = `
                <div class="chatbot-lg-input-wrapper">
                    <input 
                        type="text" 
                        id="chatbot-lg-input"
                        class="chatbot-lg-input"
                        placeholder="Type your question..."
                        onkeypress="if(event.key==='Enter' && this.value.trim()) window.chatbotLiquidGlassInstance.sendQuestion()"
                        oninput="document.getElementById('chatbot-lg-send').disabled = !this.value.trim()"
                    />
                    <button 
                        id="chatbot-lg-send"
                        class="chatbot-lg-send-btn"
                        onclick="window.chatbotLiquidGlassInstance.sendQuestion()"
                        disabled
                        title="Send"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            `;
            document.getElementById('chatbot-lg-input')?.focus();
        }

        disableTextInput() {
            this.footerDiv.innerHTML = `
                <div style="text-align: center; color: rgba(0, 61, 70, 0.6); padding: 8px; font-size: 13px;">
                    Please select an option above
                </div>
            `;
        }

        addTypingIndicator() {
            const typing = document.createElement('div');
            typing.id = 'chatbot-lg-typing';
            typing.className = 'chatbot-lg-message bot';
            typing.innerHTML = `
                <div class="chatbot-lg-message-avatar" style="background: rgba(0, 61, 70, 0.85);">💬</div>
                <div class="chatbot-lg-message-bubble">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            this.messagesDiv.appendChild(typing);
            this.scrollToBottom();
        }

        removeTypingIndicator() {
            const typing = document.getElementById('chatbot-lg-typing');
            if (typing) typing.remove();
        }

        async sendRequest(data) {
            try {
                this.addTypingIndicator();
                
                const response = await fetch(this.config.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                this.removeTypingIndicator();

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }
                
                const text = await response.text();
                if (!text) throw new Error('Empty response from server');
                
                return JSON.parse(text);
            } catch (error) {
                this.removeTypingIndicator();
                
                // Better error messages
                let errorMsg = error.message;
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    errorMsg = `❌ Connection Error: ${error.message}\n\n` +
                              `Possible causes:\n` +
                              `• CORS not enabled on server\n` +
                              `• Network connectivity issue\n` +
                              `• Webhook URL incorrect\n\n` +
                              `Check browser console (F12) for details.`;
                } else if (error.message.includes('CORS')) {
                    errorMsg = `❌ CORS Error: ${error.message}\n\n` +
                              `Make sure your n8n webhook has these headers:\n` +
                              `• Access-Control-Allow-Origin: *\n` +
                              `• Access-Control-Allow-Methods: POST, OPTIONS\n` +
                              `• Access-Control-Allow-Headers: Content-Type`;
                }
                
                console.error('Chatbot Error:', error);
                this.addMessage(errorMsg, true);
                return null;
            }
        }

        async startChat() {
            this.footerDiv.innerHTML = '<div style="text-align: center; color: rgba(0, 61, 70, 0.6); padding: 8px; font-size: 13px;">Loading...</div>';
            
            // Step 1: Send blank session_id - backend will generate it
            this.state = {
                currentStep: 'send_user_types',
                session_id: '',
                user_type: '',
                concern_category: '',
                question: ''
            };

            const response = await this.sendRequest({
                step: 'send_user_types',
                session_id: ''  // Backend will generate session_id when blank
            });

            if (response) this.handleResponse(response);
        }

        async handleOptionClick(option) {
            document.querySelectorAll('.chatbot-lg-option-btn').forEach(btn => btn.disabled = true);
            this.addMessage(option.option_value, false);
            // Sound already played in addOptions click handler

            let requestData = {};

            if (this.state.currentStep === 'send_user_types') {
                // Step 2: Send concern categories request
                requestData = {
                    step: 'send_concern_categories',
                    user_type: option.id,
                    session_id: this.state.session_id || ''
                };
                this.state.user_type = option.id;
                this.state.currentStep = 'send_concern_categories';
            }
            else if (this.state.currentStep === 'send_concern_categories') {
                this.state.question = '';
                if (option.id === 'something_else' || option.id.includes('something_else')) {
                    requestData = {
                        step: 'send_top_questions',
                        user_type: this.state.user_type,
                        concern_category: 'something_else',
                        session_id: this.state.session_id || ''
                    };
                    this.state.concern_category = 'something_else';
                    this.state.currentStep = 'send_top_questions';
                } else {
                    requestData = {
                        step: 'send_top_questions',
                        user_type: this.state.user_type,
                        concern_category: option.id,
                        session_id: this.state.session_id || ''
                    };
                    this.state.concern_category = option.id;
                    this.state.currentStep = 'send_top_questions';
                }
            }
            else if (this.state.currentStep === 'send_top_questions') {
                const isSomethingElse = option.id === 'something_else' || 
                                      option.id.includes('something_else') ||
                                      option.option_value.toLowerCase().includes('something else');
                
                if (isSomethingElse) {
                    requestData = {
                        step: 'send_top_questions',
                        user_type: this.state.user_type,
                        concern_category: 'something_else',
                        session_id: this.state.session_id || ''
                    };
                    this.state.concern_category = 'something_else';
                } else {
                    requestData = {
                        step: 'send_query_answer',
                        user_type: this.state.user_type,
                        concern_category: this.state.concern_category,
                        question: option.option_value,
                        session_id: this.state.session_id || ''
                    };
                    this.state.question = option.option_value;
                    this.state.currentStep = 'send_query_answer';
                }
            }
            else if (this.state.currentStep === 'answer') {
                if (option.id === 'ask_another') {
                    this.state.concern_category = '';
                    this.state.question = '';
                    requestData = {
                        step: 'send_concern_categories',
                        user_type: this.state.user_type,
                        session_id: this.state.session_id || ''
                    };
                    this.state.currentStep = 'send_concern_categories';
                } else if (option.id === 'talk_to_human') {
                    this.addMessage('👤 Redirecting to human support...\n\nPlease contact us at:\n📧 support@thedigitalpobox.com', true);
                    
                    // Show reset button
                    setTimeout(() => {
                        this.footerDiv.innerHTML = `
                            <button class="chatbot-lg-start-btn" id="chatbot-lg-reset" style="background: linear-gradient(135deg, rgba(0, 61, 70, 0.9), rgba(0, 183, 176, 0.9));">
                                Start Over
                            </button>
                        `;
                        this.widget.querySelector('#chatbot-lg-reset').addEventListener('click', () => this.resetChat());
                    }, 500);
                    return;
                }
            }

            if (Object.keys(requestData).length > 0) {
                const response = await this.sendRequest(requestData);
                if (response) this.handleResponse(response);
            }
        }

        async sendQuestion() {
            const input = document.getElementById('chatbot-lg-input');
            const question = input?.value.trim();
            if (!question) return;

            input.disabled = true;
            document.getElementById('chatbot-lg-send').disabled = true;

            this.addMessage(question, false);

            const response = await this.sendRequest({
                step: 'send_query_answer',
                user_type: this.state.user_type,
                concern_category: this.state.concern_category,
                question: question,
                session_id: this.state.session_id || ''
            });

            if (response) this.handleResponse(response);
        }

        handleResponse(response) {
            if (response.session_id) this.state.session_id = response.session_id;

            if (response.step) {
                const stepMapping = {
                    'user_type_selection': 'send_user_types',
                    'concern_selection': 'send_concern_categories',
                    'user_query': 'send_top_questions'
                };
                this.state.currentStep = stepMapping[response.step] || response.step;
            }

            if (response.message) this.addMessage(response.message, true);
            if (response.answer) this.addMessage(response.answer, true);

            const shouldEnableInput = response.text_input_enabled || 
                                    (this.state.currentStep === 'send_top_questions' && 
                                     this.state.concern_category === 'something_else');

            if (shouldEnableInput) {
                this.enableTextInput();
            } else {
                this.disableTextInput();
            }

            if (response.options && response.options.length > 0) {
                this.addOptions(response.options);
            }

            this.scrollToBottom();
        }

        scrollToBottom() {
            this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
        }
    }

    // Global API
    window.ChatbotLiquidGlass = {
        init: function(config) {
            if (window.chatbotLiquidGlassInstance) {
                console.warn('ChatbotLiquidGlass: Instance already exists');
                return;
            }
            window.chatbotLiquidGlassInstance = new ChatbotLiquidGlass(config);
        }
    };

})();

