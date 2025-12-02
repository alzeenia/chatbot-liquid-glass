/**
 * Chatbot Widget Embed Script - Apple Liquid Glass Design
 * 
 * A fully-featured chatbot widget with glassmorphism (frosted glass) aesthetic,
 * designed for seamless integration into websites. Features include:
 * - Session management and message caching
 * - Markdown rendering for rich text formatting
 * - Mobile-responsive design
 * - Sound effects for user feedback
 * - Fullscreen expand/collapse functionality
 * - Multi-step conversation flow management
 * 
 * @fileoverview Main chatbot widget implementation with Apple-inspired liquid glass design
 * 
 * Usage:
 * <script src="chatbot-liquid-glass.js"></script>
 * <script>
 *   ChatbotLiquidGlass.init({
 *     webhookUrl: 'YOUR_WEBHOOK_URL',
 *     position: 'bottom-right',
 *     title: 'AI Support',
 *     subtitle: 'The Digital PO Box'
 *   });
 * </script>
 */

(function() {
    'use strict';

    /**
     * Default configuration values for the chatbot widget
     * These values are used when not explicitly provided in the config
     */
    const defaults = {
        position: 'bottom-right',        // Widget position: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
        title: 'AI Support',          // Header title displayed in the chatbot widget
        subtitle: 'The Digital PO Box',  // Subtitle displayed below the title
        primaryColor: '#003D46',         // Primary brand color (dark teal)
        accentColor: '#00B7B0',          // Accent color (light teal)
        highlightColor: '#FF6A3D',       // Highlight color (orange) for buttons and badges
        backgroundColor: '#F4F4F6',      // Background color for messages area
        showBadge: true,                  // Whether to show notification badge on new messages
        soundsEnabled: true               // Enable/disable sound effects for interactions
    };

    /**
     * Main ChatbotLiquidGlass Class
     * 
     * Manages the entire chatbot widget lifecycle including:
     * - UI rendering and interactions
     * - Session and message state management
     * - Communication with backend API
     * - Message caching and restoration
     * - Markdown rendering
     */
    class ChatbotLiquidGlass {
        /**
         * Constructor - Initializes the chatbot widget
         * 
         * @param {Object} config - Configuration object
         * @param {string} config.webhookUrl - Required: Backend webhook URL for API communication
         * @param {string} [config.position='bottom-right'] - Widget position on screen
         * @param {string} [config.title='AI Support'] - Header title
         * @param {string} [config.subtitle='The Digital PO Box'] - Header subtitle
         * @param {boolean} [config.soundsEnabled=true] - Enable/disable sound effects
         * @param {boolean} [config.showBadge=true] - Show notification badge
         * @throws {Error} If webhookUrl is missing or empty
         */
        constructor(config) {
            // Validate required configuration
            if (!config || !config.webhookUrl || config.webhookUrl.trim() === '') {
                throw new Error('ChatbotLiquidGlass: webhookUrl is required.');
            }

            // Merge user config with defaults
            this.config = { ...defaults, ...config };
            
            // Initialize conversation state
            // Tracks current step in the conversation flow and user selections
            this.state = {
                currentStep: '',          // Current conversation step (send_user_types, send_concern_categories, etc.)
                session_id: '',          // Backend-generated session identifier
                user_type: '',           // Selected user type (customer, partner, etc.)
                concern_category: '',     // Selected concern category
                question: ''              // User's question or selected question
            };
            
            // UI state flags
            this.isOpen = false;         // Whether the widget is currently open
            this.isExpanded = false;     // Whether the widget is in fullscreen mode
            this.soundsEnabled = config.soundsEnabled !== false; // Sound effects enabled by default
            this.audioContext = null;    // Web Audio API context for sound effects
            
            // Initialize the widget
            this.init();
        }

        /**
         * Initialize the chatbot widget
         * 
         * Sets up all components in the correct order:
         * 1. Inject CSS styles into the page
         * 2. Create and append widget DOM elements
         * 3. Attach event listeners
         * 4. Initialize audio system
         * 5. Restore any existing session from storage
         */
        init() {
            this.injectStyles();      // Add CSS styles to page
            this.createWidget();      // Create widget DOM structure
            this.attachEvents();      // Attach click handlers and event listeners
            this.initAudio();         // Initialize Web Audio API for sounds
            this.restoreSession();    // Restore session_id from sessionStorage if exists
        }
        
        // ====================================================================
        // SESSION MANAGEMENT METHODS
        // ====================================================================
        // These methods handle session_id storage and retrieval using sessionStorage
        // Session ID persists across page refreshes within the same browser session
        
        /**
         * Retrieves the current session_id from sessionStorage
         * 
         * @returns {string} The session_id if found, empty string otherwise
         */
        getSessionId() {
            return sessionStorage.getItem('chatbot_session_id') || '';
        }
        
        /**
         * Saves the session_id to sessionStorage and updates internal state
         * 
         * @param {string} sessionId - The session_id to save
         */
        saveSessionId(sessionId) {
            if (sessionId) {
                sessionStorage.setItem('chatbot_session_id', sessionId);
                this.state.session_id = sessionId;
            }
        }
        
        /**
         * Clears the session_id from both sessionStorage and internal state
         * Used when starting a new conversation
         */
        clearSession() {
            sessionStorage.removeItem('chatbot_session_id');
            this.state.session_id = '';
        }
        
        // ====================================================================
        // MESSAGE CACHING METHODS
        // ====================================================================
        // These methods handle local storage of messages for offline viewing
        // and conversation restoration after page refresh
        
        /**
         * Generates a cache key based on the current session_id
         * Each session has its own cache key: 'chatbot_messages_{session_id}'
         * 
         * @returns {string|null} Cache key string or null if no session_id exists
         */
        getCacheKey() {
            const sessionId = this.getSessionId();
            return sessionId ? `chatbot_messages_${sessionId}` : null;
        }
        
        /**
         * Saves a message to localStorage cache
         * 
         * Messages are stored per session and limited to the last 100 messages
         * to prevent excessive storage usage.
         * 
         * @param {string} text - The message text content
         * @param {boolean} isBot - Whether this is a bot message (true) or user message (false)
         * @param {string|null} step - Optional: The conversation step when message was sent
         * @param {Array|null} options - Optional: Options array to store with the message
         */
        saveMessageToCache(text, isBot, step = null, options = null, ratingEnabled = false) {
            const cacheKey = this.getCacheKey();
            if (!cacheKey) return; // No session_id means no caching
            
            try {
                // Retrieve existing cached messages for this session
                const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                
                // Add new message to cache with metadata
                // Include state information for better restoration
                cached.push({
                    text: text,
                    isBot: isBot,
                    step: step || this.state.currentStep,
                    timestamp: Date.now(),
                    session_id: this.state.session_id,
                    // Store state information for restoration
                    user_type: this.state.user_type,
                    concern_category: this.state.concern_category,
                    question: this.state.question,
                    // Store options if provided (for bot messages that have options)
                    options: options || null,
                    // Store rating_enabled flag to restore rating UI
                    rating_enabled: ratingEnabled || false
                });
                
                // Keep only the last 100 messages to prevent storage bloat
                const trimmed = cached.slice(-100);
                localStorage.setItem(cacheKey, JSON.stringify(trimmed));
            } catch (error) {
                // Gracefully handle storage errors (quota exceeded, etc.)
                console.warn('Failed to cache message:', error);
            }
        }
        
        /**
         * Updates the last cached message to include rating_enabled flag and feedback options
         * 
         * @param {boolean} ratingEnabled - Whether rating UI should be shown
         * @param {Array} feedbackOptions - Array of feedback options for rating UI
         */
        updateLastCachedMessageRatingFlag(ratingEnabled, feedbackOptions = []) {
            const cacheKey = this.getCacheKey();
            if (!cacheKey) return;
            
            try {
                const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                if (cached.length === 0) return;
                
                // Update the last message with rating_enabled flag and feedback options
                const lastMsg = cached[cached.length - 1];
                lastMsg.rating_enabled = ratingEnabled;
                // Store feedback options separately (they're different from regular options)
                if (ratingEnabled && feedbackOptions.length > 0) {
                    lastMsg.feedback_options = feedbackOptions;
                }
                
                localStorage.setItem(cacheKey, JSON.stringify(cached));
            } catch (error) {
                console.warn('Failed to update cached message rating flag:', error);
            }
        }
        
        /**
         * Retrieves cached messages for the current session
         * 
         * @returns {Array} Array of cached message objects, empty array if none found
         */
        getCachedMessages() {
            const cacheKey = this.getCacheKey();
            if (!cacheKey) return [];
            
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (error) {
                console.warn('Failed to load cached messages:', error);
            }
            
            return [];
        }
        
        /**
         * Restores cached messages to the UI
         * 
         * Called when starting a chat if cached messages exist for the current session.
         * Restores both the message display and the conversation state.
         * 
         * @returns {boolean} True if messages were restored, false if cache was empty
         */
        restoreMessagesFromCache() {
            const cachedMessages = this.getCachedMessages();
            if (cachedMessages.length === 0) return false;
            
            // First, restore all state information from cached messages (look backwards to find latest values)
            // This must be done BEFORE restoring messages so that options have correct state context
            for (let i = cachedMessages.length - 1; i >= 0; i--) {
                const msg = cachedMessages[i];
                if (msg.session_id && !this.state.session_id) {
                    this.state.session_id = msg.session_id;
                    this.saveSessionId(msg.session_id);
                }
                if (msg.user_type && !this.state.user_type) {
                    this.state.user_type = msg.user_type;
                }
                if (msg.concern_category && !this.state.concern_category) {
                    this.state.concern_category = msg.concern_category;
                }
                if (msg.question && !this.state.question) {
                    this.state.question = msg.question;
                }
                if (msg.step && !this.state.currentStep) {
                    this.state.currentStep = msg.step;
                }
            }
            
            // Restore session_id from the first cached message if not already set
            if (cachedMessages.length > 0 && cachedMessages[0].session_id && !this.state.session_id) {
                this.state.session_id = cachedMessages[0].session_id;
                this.saveSessionId(cachedMessages[0].session_id);
            }
            
            // Restore each cached message to the UI
            // Pass false to saveToCache to avoid re-caching already cached messages
            cachedMessages.forEach((msg, index) => {
                const container = this.addMessage(msg.text, msg.isBot, false);
                
                // Check if this message should have rating UI (not regular options)
                // Handle both boolean true and string "true" from cache
                if ((msg.rating_enabled === true || msg.rating_enabled === 'true') && msg.feedback_options && Array.isArray(msg.feedback_options) && msg.feedback_options.length > 0) {
                    // Restore rating UI instead of regular options
                    // This is for the "redirect_to_human_support" step
                    this.addRatingUI(msg.feedback_options);
                } else if (msg.options && Array.isArray(msg.options) && msg.options.length > 0) {
                    // Restore regular options (not rating UI)
                    // Options are restored AFTER state is set, so they have correct context
                    // Options will be clickable because state is already restored
                    this.addOptions(msg.options);
                }
            });
            
            // Always set current step from the last message (most recent step)
            // This ensures we have the correct step even if earlier messages had different steps
            if (cachedMessages.length > 0) {
                const lastMsg = cachedMessages[cachedMessages.length - 1];
                if (lastMsg.step) {
                    this.state.currentStep = lastMsg.step;
                }
                
                // Special case: If any message has send_ai_disclaimer step, prioritize it
                // This ensures "Start Over" button is shown even if there are messages after disclaimer
                // (though disclaimer should typically be the last message)
                for (let i = cachedMessages.length - 1; i >= 0; i--) {
                    if (cachedMessages[i].step === 'send_ai_disclaimer') {
                        this.state.currentStep = 'send_ai_disclaimer';
                        break; // Use the most recent disclaimer step
                    }
                }
            }
            
            return true;
        }
        
        /**
         * Clears all cached messages for the current session
         * Used when starting a new conversation or resetting the chat
         */
        clearMessageCache() {
            const cacheKey = this.getCacheKey();
            if (cacheKey) {
                localStorage.removeItem(cacheKey);
            }
        }
        
        /**
         * Restores session_id from sessionStorage on initialization
         * 
         * Called during init() to restore any existing session from a previous
         * page load within the same browser session.
         */
        restoreSession() {
            const savedSessionId = this.getSessionId();
            if (savedSessionId) {
                this.state.session_id = savedSessionId;
            }
        }

        // ====================================================================
        // AUDIO SYSTEM METHODS
        // ====================================================================
        // Handles sound effects using Web Audio API
        
        /**
         * Initializes the Web Audio API context for sound effects
         * 
         * Creates an AudioContext that will be used to generate sound effects
         * for user interactions. Falls back gracefully if Web Audio API is not supported.
         */
        initAudio() {
            try {
                // Create AudioContext (with webkit prefix for older browsers)
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported, sounds disabled');
                this.soundsEnabled = false;
            }
        }

        /**
         * Plays a sound effect based on the interaction type
         * 
         * Generates different audio tones for different user actions:
         * - 'message': Soft pop sound when receiving a bot message
         * - 'option': Light click sound when selecting an option
         * - 'send': Upward tone when sending a message
         * - 'typing': Subtle sound for typing indicator
         * - 'open': Pleasant sound when opening the widget
         * 
         * @param {string} type - Sound type: 'message', 'option', 'send', 'typing', 'open'
         */
        playSound(type = 'message') {
            // Exit early if sounds are disabled or audio context unavailable
            if (!this.soundsEnabled || !this.audioContext) return;

            try {
                // Create audio nodes: oscillator generates the tone, gain controls volume
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                // Connect audio nodes: oscillator -> gain -> destination (speakers)
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                // Configure different sound characteristics for each interaction type
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
                        // Bright ding sound for option selection (higher pitch, quick)
                        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.08);
                        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);
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

                // Start and stop the sound
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.2);
            } catch (e) {
                // Handle suspended audio context (requires user interaction to resume)
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume().catch(() => {});
                }
            }
        }

        // ====================================================================
        // STYLING METHODS
        // ====================================================================
        // Handles CSS injection and styling
        
        /**
         * Injects CSS styles into the page head
         * 
         * Creates and appends a <style> tag containing all chatbot styles.
         * Also loads the Montserrat font from Google Fonts.
         * Prevents duplicate style injection by checking for existing style tag.
         */
        injectStyles() {
            // Return early if styles are already injected
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
                    /* Safe area insets for notched devices */
                    bottom: env(safe-area-inset-bottom, 20px);
                    right: env(safe-area-inset-right, 20px);
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
                    background: #F4F4F6;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    position: relative;
                    overflow: hidden;
                }
                
                .chatbot-lg-avatar img,
                .chatbot-lg-avatar svg {
                    width: 32px;
                    height: 32px;
                    object-fit: contain;
                }
                
                .chatbot-lg-avatar img {
                    /* No filter - show original colors */
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
                
                .chatbot-lg-header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .chatbot-lg-expand,
                .chatbot-lg-close,
                .chatbot-lg-human-support {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    line-height: 1;
                    padding: 0;
                    margin: 0;
                    position: relative;
                }
                
                .chatbot-lg-expand:hover,
                .chatbot-lg-close:hover,
                .chatbot-lg-human-support:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }
                
                .chatbot-lg-human-support {
                    font-size: 20px;
                }
                
                .chatbot-lg-expand svg,
                .chatbot-lg-close svg {
                    width: 16px;
                    height: 16px;
                }
                
                /* Fullscreen mode */
                #chatbot-lg-widget.expanded {
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: 100vw !important;
                    max-height: 100vh !important;
                    border-radius: 0 !important;
                    margin: 0 !important;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
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
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 16px;
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
                    pointer-events: auto;
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
                
                /* Markdown formatting styles */
                .chatbot-lg-message-bubble h1,
                .chatbot-lg-message-bubble h2,
                .chatbot-lg-message-bubble h3 {
                    margin: 8px 0 6px 0;
                    font-weight: 600;
                    line-height: 1.3;
                }
                
                .chatbot-lg-message-bubble h1 {
                    font-size: 18px;
                }
                
                .chatbot-lg-message-bubble h2 {
                    font-size: 16px;
                }
                
                .chatbot-lg-message-bubble h3 {
                    font-size: 15px;
                }
                
                .chatbot-lg-message-bubble p {
                    margin: 6px 0;
                    line-height: 1.5;
                }
                
                .chatbot-lg-message-bubble p:first-child {
                    margin-top: 0;
                }
                
                .chatbot-lg-message-bubble p:last-child {
                    margin-bottom: 0;
                }
                
                .chatbot-lg-message-bubble strong {
                    font-weight: 600;
                }
                
                .chatbot-lg-message-bubble em {
                    font-style: italic;
                }
                
                .chatbot-lg-message-bubble ul,
                .chatbot-lg-message-bubble ol {
                    margin: 8px 0;
                    padding-left: 20px;
                }
                
                .chatbot-lg-message-bubble li {
                    margin: 4px 0;
                    line-height: 1.5;
                }
                
                .chatbot-lg-message-bubble a {
                    color: #00B7B0 !important;
                    text-decoration: underline;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    cursor: pointer;
                    pointer-events: auto;
                    position: relative;
                    z-index: 1;
                }
                
                .chatbot-lg-message.user .chatbot-lg-message-bubble a {
                    color: rgba(255, 255, 255, 0.9);
                    text-decoration: underline;
                    cursor: pointer;
                    pointer-events: auto;
                    position: relative;
                    z-index: 1;
                }
                
                .chatbot-lg-message-bubble a:hover {
                    opacity: 0.8;
                    text-decoration: underline;
                }
                
                .chatbot-lg-message-bubble a:active {
                    opacity: 0.7;
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
                
                /* Starting Disclaimer Banner Styles */
                .chatbot-lg-starting-disclaimer {
                    background: #F4F4F6;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border-left: 4px solid #FF6A3D;
                    padding: 12px 16px;
                    margin: 0;
                    font-size: 13px;
                    line-height: 1.6;
                    color: #003D46;
                    border-radius: 0;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                
                .chatbot-lg-starting-disclaimer a {
                    color: #00B7B0 !important;
                    text-decoration: underline !important;
                    font-weight: 700 !important;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    cursor: pointer !important;
                }
                
                .chatbot-lg-starting-disclaimer a strong {
                    font-weight: 700 !important;
                    color: #00B7B0 !important;
                }
                
                .chatbot-lg-starting-disclaimer a:hover {
                    color: #003D46 !important;
                    text-decoration: underline !important;
                }
                
                .chatbot-lg-starting-disclaimer a:hover strong {
                    color: #003D46 !important;
                }
                
                .chatbot-disclaimer-link {
                    color: #00B7B0 !important;
                    text-decoration: underline !important;
                    font-weight: 700 !important;
                    cursor: pointer !important;
                }
                
                .chatbot-disclaimer-link strong {
                    font-weight: 700 !important;
                    color: inherit !important;
                }
                
                @media (max-width: 768px) {
                    .chatbot-lg-starting-disclaimer {
                        font-size: 12px;
                        padding: 10px 14px;
                    }
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
                
                /* Mobile Responsive Styles - Standard Chatbot Practices */
                @media (max-width: 768px) {
                    #chatbot-lg-widget {
                        width: calc(100vw - 24px);
                        max-width: 420px;
                        height: calc(100vh - 100px);
                        max-height: 600px;
                        min-height: 500px;
                        border-radius: 20px;
                        margin: 50px 12px 12px 12px;
                    }
                    
                    #chatbot-lg-toggle {
                        width: 56px;
                        height: 56px;
                        bottom: 16px;
                        right: 16px;
                        font-size: 24px;
                    }
                    
                    .chatbot-lg-header {
                        padding: 14px 16px;
                    }
                    
                    .chatbot-lg-avatar {
                        width: 44px;
                        height: 44px;
                    }
                    
                    .chatbot-lg-avatar svg {
                        width: 28px;
                        height: 28px;
                    }
                    
                    .chatbot-lg-title {
                        font-size: 15px;
                    }
                    
                    .chatbot-lg-subtitle {
                        font-size: 11px;
                    }
                    
                    .chatbot-lg-header-actions {
                        gap: 6px;
                    }
                    
                    .chatbot-lg-expand,
                    .chatbot-lg-close,
                    .chatbot-lg-human-support {
                        width: 36px;
                        height: 36px;
                        font-size: 18px;
                    }
                    
                    .chatbot-lg-expand svg,
                    .chatbot-lg-close svg {
                        width: 14px;
                        height: 14px;
                    }
                    
                    .chatbot-lg-messages {
                        padding: 14px;
                    }
                    
                    .chatbot-lg-message-avatar {
                        width: 28px;
                        height: 28px;
                        font-size: 14px;
                    }
                    
                    .chatbot-lg-message-bubble {
                        max-width: 85%;
                        font-size: 14px;
                        padding: 12px 16px;
                        line-height: 1.5;
                    }
                    
                    .chatbot-lg-options {
                        margin-left: 0;
                        max-width: 100%;
                        gap: 8px;
                    }
                    
                    .chatbot-lg-option-btn {
                        padding: 12px 16px;
                        font-size: 14px;
                        min-height: 44px; /* iOS touch target minimum */
                    }
                    
                    .chatbot-lg-footer {
                        padding: 14px 16px;
                    }
                    
                    .chatbot-lg-input {
                        padding: 12px 16px;
                        font-size: 16px; /* Prevents zoom on iOS */
                        min-height: 44px; /* iOS touch target minimum */
                    }
                    
                    .chatbot-lg-send-btn {
                        width: 44px;
                        height: 44px;
                        min-width: 44px; /* iOS touch target minimum */
                    }
                    
                    .chatbot-lg-start-btn {
                        padding: 14px 24px;
                        font-size: 16px;
                        min-height: 44px; /* iOS touch target minimum */
                    }
                    
                    .chatbot-lg-rating-container {
                        padding: 14px;
                    }
                    
                    .chatbot-lg-star {
                        font-size: 22px;
                    }
                    
                    .chatbot-lg-feedback-option {
                        padding: 12px 14px;
                        font-size: 14px;
                        min-height: 44px; /* iOS touch target minimum */
                    }
                }
                
                /* Small mobile devices (iPhone SE, iPhone 12/13 mini, etc.) */
                @media (max-width: 428px) {
                    #chatbot-lg-widget {
                        width: calc(100vw - 16px);
                        max-width: 100%;
                        height: calc(100vh - 80px);
                        max-height: 580px;
                        min-height: 450px;
                        margin: 40px 8px 8px 8px;
                        border-radius: 18px;
                    }
                    
                    #chatbot-lg-toggle {
                        width: 52px;
                        height: 52px;
                        bottom: 12px;
                        right: 12px;
                        font-size: 22px;
                    }
                    
                    .chatbot-lg-header {
                        padding: 12px 14px;
                    }
                    
                    .chatbot-lg-avatar {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .chatbot-lg-avatar svg {
                        width: 26px;
                        height: 26px;
                    }
                    
                    .chatbot-lg-title {
                        font-size: 14px;
                    }
                    
                    .chatbot-lg-subtitle {
                        font-size: 10px;
                    }
                    
                    .chatbot-lg-header-actions {
                        gap: 4px;
                    }
                    
                    .chatbot-lg-expand,
                    .chatbot-lg-close,
                    .chatbot-lg-human-support {
                        width: 32px;
                        height: 32px;
                        font-size: 16px;
                    }
                    
                    .chatbot-lg-expand svg,
                    .chatbot-lg-close svg {
                        width: 12px;
                        height: 12px;
                    }
                    
                    .chatbot-lg-messages {
                        padding: 12px;
                    }
                    
                    .chatbot-lg-message-avatar {
                        width: 26px;
                        height: 26px;
                        font-size: 13px;
                    }
                    
                    .chatbot-lg-message-bubble {
                        max-width: 88%;
                        font-size: 13px;
                        padding: 10px 14px;
                        line-height: 1.5;
                    }
                    
                    .chatbot-lg-options {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                    
                    .chatbot-lg-option-btn {
                        width: 100%;
                        padding: 12px 14px;
                        font-size: 13px;
                        min-height: 44px;
                    }
                    
                    .chatbot-lg-footer {
                        padding: 12px 14px;
                    }
                    
                    .chatbot-lg-input {
                        padding: 10px 14px;
                        font-size: 16px;
                        min-height: 44px;
                    }
                    
                    .chatbot-lg-send-btn {
                        width: 44px;
                        height: 44px;
                    }
                    
                    .chatbot-lg-start-btn {
                        padding: 12px 20px;
                        font-size: 15px;
                        min-height: 44px;
                    }
                    
                    .chatbot-lg-rating-container {
                        padding: 12px;
                    }
                    
                    .chatbot-lg-rating-label {
                        font-size: 12px;
                    }
                    
                    .chatbot-lg-star {
                        font-size: 20px;
                    }
                    
                    .chatbot-lg-feedback-option {
                        padding: 10px 12px;
                        font-size: 13px;
                        min-height: 44px;
                    }
                }
                
                /* Landscape mobile */
                @media (max-width: 768px) and (orientation: landscape) {
                    #chatbot-lg-widget {
                        width: calc(100vw - 24px);
                        height: calc(100vh - 60px);
                        max-height: 500px;
                        min-height: 400px;
                        margin: 30px 12px 12px 12px;
                    }
                    
                    .chatbot-lg-header {
                        padding: 12px 16px;
                    }
                    
                    .chatbot-lg-avatar {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .chatbot-lg-avatar svg {
                        width: 26px;
                        height: 26px;
                    }
                    
                    .chatbot-lg-title {
                        font-size: 14px;
                    }
                    
                    .chatbot-lg-subtitle {
                        font-size: 10px;
                    }
                    
                    .chatbot-lg-messages {
                        padding: 12px;
                    }
                    
                    .chatbot-lg-message-avatar {
                        width: 26px;
                        height: 26px;
                        font-size: 13px;
                    }
                    
                    .chatbot-lg-message-bubble {
                        font-size: 13px;
                        padding: 10px 14px;
                    }
                    
                    .chatbot-lg-footer {
                        padding: 12px 16px;
                    }
                    
                    .chatbot-lg-rating-container {
                        padding: 12px;
                    }
                }
                
                /* Extra small devices (iPhone SE 1st gen, very small Android) */
                @media (max-width: 375px) {
                    #chatbot-lg-widget {
                        width: calc(100vw - 12px);
                        margin: 30px 6px 6px 6px;
                        border-radius: 16px;
                        min-height: 400px;
                    }
                    
                    #chatbot-lg-toggle {
                        bottom: max(12px, env(safe-area-inset-bottom, 12px));
                        right: max(12px, env(safe-area-inset-right, 12px));
                    }
                    
                    .chatbot-lg-header {
                        padding: 10px 12px;
                        padding-top: max(10px, env(safe-area-inset-top, 10px));
                    }
                    
                    .chatbot-lg-avatar {
                        width: 36px;
                        height: 36px;
                    }
                    
                    .chatbot-lg-avatar svg {
                        width: 24px;
                        height: 24px;
                    }
                    
                    .chatbot-lg-title {
                        font-size: 13px;
                    }
                    
                    .chatbot-lg-subtitle {
                        font-size: 9px;
                    }
                    
                    .chatbot-lg-expand,
                    .chatbot-lg-close,
                    .chatbot-lg-human-support {
                        width: 32px;
                        height: 32px;
                        font-size: 14px;
                        min-width: 32px;
                    }
                    
                    .chatbot-lg-messages {
                        padding: 10px;
                    }
                    
                    .chatbot-lg-message-avatar {
                        width: 24px;
                        height: 24px;
                        font-size: 12px;
                    }
                    
                    .chatbot-lg-message-bubble {
                        font-size: 12px;
                        padding: 9px 12px;
                    }
                    
                    .chatbot-lg-footer {
                        padding: 10px 12px;
                        padding-bottom: max(10px, env(safe-area-inset-bottom, 10px));
                    }
                    
                    .chatbot-lg-option-btn {
                        font-size: 12px;
                        padding: 10px 12px;
                        min-height: 44px; /* Maintain iOS touch target */
                    }
                    
                    .chatbot-lg-input {
                        font-size: 16px;
                        padding: 10px 12px;
                        min-height: 44px; /* Maintain iOS touch target */
                    }
                    
                    .chatbot-lg-send-btn {
                        min-width: 44px; /* Maintain iOS touch target */
                    }
                }
                
                /* Safe area support for notched devices (iPhone X and newer) */
                @supports (padding: max(0px)) {
                    @media (max-width: 768px) {
                        #chatbot-lg-widget {
                            margin-top: max(50px, env(safe-area-inset-top, 50px));
                            margin-bottom: max(12px, env(safe-area-inset-bottom, 12px));
                        }
                        
                        .chatbot-lg-header {
                            padding-top: max(14px, env(safe-area-inset-top, 14px));
                        }
                        
                        .chatbot-lg-footer {
                            padding-bottom: max(14px, env(safe-area-inset-bottom, 14px));
                        }
                    }
                }
                
                /* Rating System Styles */
                .chatbot-lg-rating-container {
                    margin-top: 12px;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border-radius: 12px;
                    border: 1px solid rgba(0, 183, 176, 0.2);
                    max-width: 100%;
                    box-sizing: border-box;
                    overflow: hidden;
                    word-wrap: break-word;
                }
                
                .chatbot-lg-stars-container {
                    margin-bottom: 16px;
                }
                
                .chatbot-lg-rating-label {
                    font-size: 13px;
                    color: rgba(0, 61, 70, 0.7);
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                
                .chatbot-lg-stars {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                }
                
                .chatbot-lg-star {
                    font-size: 24px;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                    line-height: 1;
                    opacity: 0.3;
                    filter: grayscale(0.5) blur(0.5px);
                }
                
                .chatbot-lg-star:hover {
                    transform: scale(1.15);
                    opacity: 0.6;
                    filter: grayscale(0.3) blur(0.3px);
                }
                
                .chatbot-lg-star.active {
                    opacity: 1;
                    filter: drop-shadow(0 2px 8px rgba(255, 106, 61, 0.5)) 
                            drop-shadow(0 0 12px rgba(255, 106, 61, 0.3))
                            grayscale(0);
                }
                
                .chatbot-lg-feedback-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                
                .chatbot-lg-feedback-label {
                    font-size: 13px;
                    color: rgba(0, 61, 70, 0.7);
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                
                .chatbot-lg-feedback-options {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .chatbot-lg-feedback-option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1.5px solid rgba(0, 183, 176, 0.2);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 13px;
                    color: #003D46;
                    max-width: 100%;
                    box-sizing: border-box;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                
                .chatbot-lg-feedback-option span {
                    flex: 1;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    min-width: 0;
                }
                
                .chatbot-lg-feedback-option:hover {
                    background: rgba(0, 183, 176, 0.1);
                    border-color: rgba(0, 183, 176, 0.4);
                }
                
                .chatbot-lg-feedback-option input[type="radio"] {
                    margin: 0;
                    cursor: pointer;
                    accent-color: #00B7B0;
                }
                
                .chatbot-lg-feedback-option input[type="radio"]:checked + span {
                    font-weight: 600;
                    color: #003D46;
                }
                
                .chatbot-lg-feedback-option:has(input[type="radio"]:checked) {
                    background: rgba(0, 183, 176, 0.15);
                    border-color: rgba(0, 183, 176, 0.5);
                }
                
                .chatbot-lg-feedback-option input[type="radio"]:disabled {
                    cursor: not-allowed;
                }
                
                .chatbot-lg-feedback-option:has(input[type="radio"]:disabled) {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .chatbot-lg-feedback-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1.5px solid rgba(0, 183, 176, 0.2);
                    border-radius: 12px;
                    font-size: 13px;
                    font-family: 'Montserrat', sans-serif;
                    color: #003D46;
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    resize: vertical;
                    outline: none;
                    transition: all 0.3s;
                }
                
                .chatbot-lg-feedback-input:focus {
                    border-color: rgba(0, 183, 176, 0.5);
                    background: rgba(255, 255, 255, 0.95);
                    box-shadow: 0 0 0 3px rgba(0, 183, 176, 0.1);
                }
                
                .chatbot-lg-submit-rating-btn {
                    align-self: flex-end;
                    background: linear-gradient(135deg, rgba(255, 106, 61, 0.9), rgba(255, 140, 90, 0.9));
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    border-radius: 12px;
                    padding: 10px 20px;
                    font-size: 13px;
                    font-weight: 600;
                    font-family: 'Montserrat', sans-serif;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 8px rgba(255, 106, 61, 0.3),
                                inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }
                
                .chatbot-lg-submit-rating-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(255, 106, 61, 0.4),
                                inset 0 1px 0 rgba(255, 255, 255, 0.4);
                }
                
                .chatbot-lg-submit-rating-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
                
                /* AI Disclaimer Styles */
                .chatbot-lg-disclaimer {
                    background: rgba(255, 248, 220, 0.8) !important;
                    border-left: 3px solid rgba(255, 193, 7, 0.6);
                    font-size: 12px;
                    padding: 12px 14px;
                    margin-top: 8px;
                }
                
                .chatbot-lg-disclaimer p {
                    margin: 4px 0;
                    line-height: 1.4;
                }
                
                .chatbot-lg-disclaimer strong {
                    color: rgba(0, 61, 70, 0.9);
                }
            `;
            // Append the style tag to document head
            document.head.appendChild(style);
        }

        // ====================================================================
        // WIDGET CREATION METHODS
        // ====================================================================
        // Handles DOM element creation and widget structure
        
        /**
         * Creates the chatbot widget DOM structure
         * 
         * Builds the complete widget including:
         * - Toggle button (floating button to open widget)
         * - Widget container (main chat window)
         * - Header with title, subtitle, expand/close buttons
         * - Messages area (scrollable container for conversation)
         * - Footer (input field or action buttons)
         * 
         * Stores references to key DOM elements for later manipulation.
         */
        createWidget() {
            // Create main container that holds both toggle button and widget
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
                        <div class="chatbot-lg-avatar" id="chatbot-lg-header-avatar">
                            <img id="chatbot-lg-avatar-img" src="chatbot_assets/chatbot-logo.png" alt="Chatbot Logo" style="display: none;">
                            <svg id="chatbot-lg-avatar-fallback" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div>
                            <div class="chatbot-lg-title">${this.config.title}</div>
                            <div class="chatbot-lg-subtitle">${this.config.subtitle}</div>
                        </div>
                    </div>
                    <div class="chatbot-lg-header-actions">
                        <button class="chatbot-lg-human-support" id="chatbot-lg-human-support" title="Get Human Support">
                            👤
                        </button>
                        <button class="chatbot-lg-expand" id="chatbot-lg-expand" title="Expand to fullscreen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="chatbot-lg-close" id="chatbot-lg-close" title="Close">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
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
            // Store references to key DOM elements for easy access
            this.messagesDiv = widget.querySelector('#chatbot-lg-messages');
            this.footerDiv = widget.querySelector('#chatbot-lg-footer');
        }

        /**
         * Sets the widget position on the screen
         * 
         * Applies CSS positioning based on the configured position value.
         * 
         * @param {HTMLElement} container - The container element to position
         */
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

        /**
         * Attaches event listeners to widget elements
         * 
         * Sets up click handlers for:
         * - Toggle button (opens widget)
         * - Close button (closes widget)
         * - Expand button (toggles fullscreen)
         * - Start button (begins conversation)
         */
        attachEvents() {
            this.toggle.addEventListener('click', () => this.open());
            this.widget.querySelector('#chatbot-lg-close').addEventListener('click', () => this.close());
            this.widget.querySelector('#chatbot-lg-expand').addEventListener('click', () => this.toggleExpand());
            this.widget.querySelector('#chatbot-lg-human-support').addEventListener('click', () => {
                window.open('https://www.thedigitalpobox.com/en/contact/', '_blank');
            });
            this.widget.querySelector('#chatbot-lg-start').addEventListener('click', () => this.startChat());
            
            // Load custom avatar image with fallback
            this.loadHeaderAvatar();
        }
        
        /**
         * Loads the custom header avatar image from chatbot_assets folder
         * Falls back to default SVG if image is not found
         */
        loadHeaderAvatar() {
            const avatarImg = this.widget.querySelector('#chatbot-lg-avatar-img');
            const avatarFallback = this.widget.querySelector('#chatbot-lg-avatar-fallback');
            
            if (!avatarImg || !avatarFallback) return;
            
            // Try to load the custom image
            avatarImg.onload = () => {
                // Image loaded successfully
                avatarImg.style.display = 'block';
                avatarFallback.style.display = 'none';
            };
            
            avatarImg.onerror = () => {
                // Image failed to load, use fallback SVG
                avatarImg.style.display = 'none';
                avatarFallback.style.display = 'block';
            };
            
            // Trigger load check (if already cached, onload won't fire)
            if (avatarImg.complete) {
                if (avatarImg.naturalWidth === 0) {
                    // Image failed to load
                    avatarImg.style.display = 'none';
                    avatarFallback.style.display = 'block';
                } else {
                    // Image loaded successfully
                    avatarImg.style.display = 'block';
                    avatarFallback.style.display = 'none';
                }
            } else {
                // Image is still loading, show fallback initially
                avatarImg.style.display = 'none';
                avatarFallback.style.display = 'block';
            }
        }

        // ====================================================================
        // UI STATE MANAGEMENT METHODS
        // ====================================================================
        // Handles widget visibility, expansion, and badge display
        
        /**
         * Opens the chatbot widget
         * 
         * Makes the widget visible and hides the toggle button.
         * Also hides the notification badge if it was showing.
         * Automatically restores cached conversation if available.
         */
        async open() {
            this.widget.style.display = 'flex';
            this.toggle.style.display = 'none';
            this.isOpen = true;
            
            // Hide notification badge when widget is opened
            if (this.badge) {
                this.badge.style.display = 'none';
            }
            
            // Check if we have cached messages and restore them automatically
            const savedSessionId = this.getSessionId();
            const cachedMessages = this.getCachedMessages();
            const hasCachedMessages = savedSessionId && cachedMessages.length > 0;
            
            // Only auto-restore if widget is empty (no messages displayed yet)
            if (hasCachedMessages && this.messagesDiv.children.length === 0) {
                this.restoreMessagesFromCache();
                
                // Set up UI based on restored state
                // Check if we're at the AI disclaimer step - if so, show "Start Over" button
                if (this.state.currentStep === 'send_ai_disclaimer') {
                    this.showStartOverButton();
                } else {
                    this.footerDiv.innerHTML = '';
                    
                    // Enable appropriate UI elements based on restored step and state
                    const shouldEnableInput = (this.state.currentStep === 'send_top_questions' && 
                                              this.state.concern_category === 'something_else') ||
                                             (this.state.currentStep === 'send_query_answer');
                    
                    if (shouldEnableInput) {
                        this.enableTextInput();
                    } else {
                        this.disableTextInput();
                    }
                }
                
                // Scroll to bottom to show latest messages
                this.scrollToBottom();
            } else if (this.messagesDiv.children.length === 0) {
                // Widget is empty - fetch starting disclaimer from backend
                await this.fetchStartingDisclaimer();
            }
        }
        
        /**
         * Fetches the starting disclaimer from the backend
         * 
         * Calls the backend with step "send_ai_starting_disclaimer" and displays
         * the disclaimer message at the top of the chat window if received.
         */
        async fetchStartingDisclaimer() {
            try {
                // For send_ai_starting_disclaimer step, ALWAYS send blank session_id
                // This ensures a fresh session is created
                const requestBody = {
                    step: 'send_ai_starting_disclaimer',
                    session_id: ''
                };
                
                const response = await fetch(this.config.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    console.warn('Failed to fetch starting disclaimer:', response.status);
                    return;
                }
                
                const data = await response.json();
                
                // Save session_id from backend response if provided
                if (data && data.session_id) {
                    this.saveSessionId(data.session_id);
                    this.state.session_id = data.session_id;
                }
                
                // If backend returns a message, display it as a disclaimer banner
                if (data && data.message && data.message.trim() !== '') {
                    this.showStartingDisclaimer(data);
                }
            } catch (error) {
                console.warn('Error fetching starting disclaimer:', error);
                // Silently fail - don't block user from using chatbot
            }
        }
        
        /**
         * Displays the starting disclaimer banner at the top of the messages area
         * 
         * @param {Object} responseData - The response object from backend containing message, privacy_url, terms_url
         */
        showStartingDisclaimer(responseData) {
            if (!responseData || !responseData.message || responseData.message.trim() === '') return;
            
            // Check if disclaimer already exists
            const existingDisclaimer = this.messagesDiv.querySelector('.chatbot-lg-starting-disclaimer');
            if (existingDisclaimer) {
                return; // Already shown
            }
            
            // Get message and URLs from response
            let message = responseData.message;
            const privacyUrl = responseData.privacy_url;
            const termsUrl = responseData.terms_url;
            
            // Create disclaimer banner
            const disclaimerDiv = document.createElement('div');
            disclaimerDiv.className = 'chatbot-lg-starting-disclaimer';
            
            // Step 1: Replace link text with unique placeholders BEFORE any HTML processing
            const PRIVACY_PLACEHOLDER = '___PRIVACY_POLICY_PLACEHOLDER___';
            const TERMS_PLACEHOLDER = '___TERMS_CONDITIONS_PLACEHOLDER___';
            const NEWLINE_PLACEHOLDER = '___NEWLINE_PLACEHOLDER___';
            
            // Replace "Privacy Policy" and "Terms and Conditions" with placeholders (case-insensitive)
            if (privacyUrl) {
                message = message.replace(/\bPrivacy Policy\b/gi, PRIVACY_PLACEHOLDER);
            }
            
            if (termsUrl) {
                message = message.replace(/\bTerms and Conditions\b/gi, TERMS_PLACEHOLDER);
            }
            
            // Step 2: Replace newlines with a placeholder (before HTML escaping)
            message = message.replace(/\n/g, NEWLINE_PLACEHOLDER);
            
            // Step 3: Escape HTML to prevent XSS (placeholders will remain as-is since they're unique)
            const tempDiv = document.createElement('div');
            tempDiv.textContent = message;
            let escapedMessage = tempDiv.innerHTML;
            
            // Step 4: Convert newline placeholders to <br> tags
            escapedMessage = escapedMessage.replace(new RegExp(NEWLINE_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<br>');
            
            // Step 5: Replace placeholders with actual HTML links (with proper escaping of URLs)
            if (privacyUrl) {
                // Escape the URL to prevent XSS
                const escapedPrivacyUrl = privacyUrl.replace(/"/g, '&quot;');
                const privacyLink = `<a href="${escapedPrivacyUrl}" target="_blank" rel="noopener noreferrer" class="chatbot-disclaimer-link" style="color: #00B7B0 !important; text-decoration: underline !important; font-weight: 700 !important; cursor: pointer !important;"><strong style="font-weight: 700 !important; color: inherit !important;">Privacy Policy</strong></a>`;
                escapedMessage = escapedMessage.replace(new RegExp(PRIVACY_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), privacyLink);
            }
            
            if (termsUrl) {
                // Escape the URL to prevent XSS
                const escapedTermsUrl = termsUrl.replace(/"/g, '&quot;');
                const termsLink = `<a href="${escapedTermsUrl}" target="_blank" rel="noopener noreferrer" class="chatbot-disclaimer-link" style="color: #00B7B0 !important; text-decoration: underline !important; font-weight: 700 !important; cursor: pointer !important;"><strong style="font-weight: 700 !important; color: inherit !important;">Terms and Conditions</strong></a>`;
                escapedMessage = escapedMessage.replace(new RegExp(TERMS_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), termsLink);
            }
            
            // Step 6: Set HTML content (no need to wrap in <p> since we're handling newlines with <br>)
            disclaimerDiv.innerHTML = escapedMessage;
            
            // Debug: Log to console to verify links were created
            const links = disclaimerDiv.querySelectorAll('a.chatbot-disclaimer-link');
            console.log('Disclaimer links found:', links.length);
            links.forEach((link, i) => {
                console.log(`Link ${i + 1}:`, link.href, link.textContent);
            });
            
            // Insert at the top of messages
            if (this.messagesDiv.firstChild) {
                this.messagesDiv.insertBefore(disclaimerDiv, this.messagesDiv.firstChild);
            } else {
                this.messagesDiv.appendChild(disclaimerDiv);
            }
        }

        /**
         * Closes the chatbot widget
         * 
         * Hides the widget, shows the toggle button, and collapses if expanded.
         */
        close() {
            // Collapse widget if it's in fullscreen mode
            if (this.isExpanded) {
                this.collapse();
            }
            this.widget.style.display = 'none';
            this.toggle.style.display = 'flex';
            this.isOpen = false;
        }

        /**
         * Toggles between expanded (fullscreen) and collapsed states
         */
        toggleExpand() {
            if (this.isExpanded) {
                this.collapse();
            } else {
                this.expand();
            }
        }
        
        /**
         * Expands the widget to fullscreen
         * 
         * Adds the 'expanded' CSS class which makes the widget cover the entire viewport.
         * Updates the expand button icon to show a collapse icon.
         */
        expand() {
            this.isExpanded = true;
            this.widget.classList.add('expanded');
            const expandBtn = this.widget.querySelector('#chatbot-lg-expand');
            if (expandBtn) {
                // Change icon to collapse icon
                expandBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 3V5C8 6.10457 8.89543 7 10 7H14C15.1046 7 16 6.10457 16 5V3M21 8H19C17.8954 8 17 8.89543 17 10V14C17 15.1046 17.8954 16 19 16H21M16 21V19C16 17.8954 15.1046 17 14 17H10C8.89543 17 8 17.8954 8 19V21M3 16H5C6.10457 16 7 15.1046 7 14V10C7 8.89543 6.10457 8 5 8H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                expandBtn.title = 'Collapse';
            }
        }
        
        /**
         * Collapses the widget from fullscreen to normal size
         * 
         * Removes the 'expanded' CSS class and updates the expand button icon.
         */
        collapse() {
            this.isExpanded = false;
            this.widget.classList.remove('expanded');
            const expandBtn = this.widget.querySelector('#chatbot-lg-expand');
            if (expandBtn) {
                // Change icon back to expand icon
                expandBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                expandBtn.title = 'Expand to fullscreen';
            }
        }

        /**
         * Shows the notification badge on the toggle button
         * 
         * Displays a badge with "1" to indicate a new message when the widget is closed.
         * Only shows if badge is enabled in config and widget is not open.
         */
        showBadge() {
            if (this.badge && !this.isOpen) {
                this.badge.style.display = 'flex';
                this.badge.textContent = '1';
            }
        }

        /**
         * Hides the notification badge
         */
        hideBadge() {
            if (this.badge) {
                this.badge.style.display = 'none';
            }
        }

        /**
         * Resets the chat to initial state
         * 
         * Clears all messages, session data, cached messages, and resets the
         * conversation state. Shows the "Start Chat" button to begin a new conversation.
         */
        resetChat() {
            // Clear all displayed messages
            this.messagesDiv.innerHTML = '';
            
            // Clear session and cached messages - destroy existing session_id
            this.clearSession();
            this.clearMessageCache();
            
            // Reset conversation state to initial values
            this.state = {
                currentStep: 'send_user_types',
                session_id: '',  // Blank session_id - backend will generate new one
                user_type: '',
                concern_category: '',
                question: ''
            };
            
            // Show loading state
            this.footerDiv.innerHTML = '<div style="text-align: center; color: rgba(0, 61, 70, 0.6); padding: 8px; font-size: 13px;">Loading...</div>';
            
            // Send request for send_user_types with blank session_id
            this.sendRequest({
                step: 'send_user_types',
                session_id: ''  // Blank for new session - backend will generate
            }).then(response => {
                if (response) {
                    this.handleResponse(response);
                } else {
                    // If request failed, show error and allow retry
            this.footerDiv.innerHTML = `
                        <button class="chatbot-lg-start-btn" id="chatbot-lg-start">Retry</button>
                    `;
                    this.widget.querySelector('#chatbot-lg-start').addEventListener('click', () => this.resetChat());
                }
            }).catch(error => {
                console.error('Error in resetChat:', error);
                this.footerDiv.innerHTML = `
                    <button class="chatbot-lg-start-btn" id="chatbot-lg-start">Retry</button>
                `;
                this.widget.querySelector('#chatbot-lg-start').addEventListener('click', () => this.resetChat());
            });
            
            // Scroll messages area to top
            this.messagesDiv.scrollTop = 0;
        }

        // ====================================================================
        // MARKDOWN PROCESSING METHODS
        // ====================================================================
        // Converts markdown syntax to HTML for rich text display
        
        /**
         * Converts markdown text to HTML
         * 
         * Parses markdown syntax and converts it to HTML for display in message bubbles.
         * Supports:
         * - Headers (# ## ###)
         * - Bold (**text** or __text__)
         * - Italic (*text* or _text_)
         * - Links ([text](url))
         * - Unordered lists (- item or * item)
         * - Ordered lists (1. item)
         * - Paragraphs (double line breaks)
         * 
         * HTML is escaped first to prevent XSS attacks.
         * 
         * @param {string} text - Markdown text to convert
         * @returns {string} HTML string ready for innerHTML insertion
         */
        parseMarkdown(text) {
            if (!text) return '';
            
            // Escape HTML first to prevent XSS
            const div = document.createElement('div');
            div.textContent = text;
            let html = div.innerHTML;
            
            // Split into lines for processing
            const lines = html.split('\n');
            const result = [];
            let inList = false;
            let listType = null;
            let listItems = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Headers
                if (line.match(/^### (.+)$/)) {
                    if (inList) {
                        result.push(listType === 'ul' ? `<ul>${listItems.join('')}</ul>` : `<ol>${listItems.join('')}</ol>`);
                        listItems = [];
                        inList = false;
                    }
                    result.push(`<h3>${line.replace(/^### /, '')}</h3>`);
                    continue;
                }
                if (line.match(/^## (.+)$/)) {
                    if (inList) {
                        result.push(listType === 'ul' ? `<ul>${listItems.join('')}</ul>` : `<ol>${listItems.join('')}</ol>`);
                        listItems = [];
                        inList = false;
                    }
                    result.push(`<h2>${line.replace(/^## /, '')}</h2>`);
                    continue;
                }
                if (line.match(/^# (.+)$/)) {
                    if (inList) {
                        result.push(listType === 'ul' ? `<ul>${listItems.join('')}</ul>` : `<ol>${listItems.join('')}</ol>`);
                        listItems = [];
                        inList = false;
                    }
                    result.push(`<h1>${line.replace(/^# /, '')}</h1>`);
                    continue;
                }
                
                // Unordered list: - item or * item
                if (line.match(/^[-*] (.+)$/)) {
                    if (!inList || listType !== 'ul') {
                        if (inList && listType === 'ol') {
                            result.push(`<ol>${listItems.join('')}</ol>`);
                            listItems = [];
                        }
                        inList = true;
                        listType = 'ul';
                    }
                    listItems.push(`<li>${line.replace(/^[-*] /, '')}</li>`);
                    continue;
                }
                
                // Ordered list: 1. item
                if (line.match(/^\d+\. (.+)$/)) {
                    if (!inList || listType !== 'ol') {
                        if (inList && listType === 'ul') {
                            result.push(`<ul>${listItems.join('')}</ul>`);
                            listItems = [];
                        }
                        inList = true;
                        listType = 'ol';
                    }
                    listItems.push(`<li>${line.replace(/^\d+\. /, '')}</li>`);
                    continue;
                }
                
                // Empty line - close list if open
                if (line === '') {
                    if (inList) {
                        result.push(listType === 'ul' ? `<ul>${listItems.join('')}</ul>` : `<ol>${listItems.join('')}</ol>`);
                        listItems = [];
                        inList = false;
                    }
                    continue;
                }
                
                // Regular line - close list if open
                if (inList) {
                    result.push(listType === 'ul' ? `<ul>${listItems.join('')}</ul>` : `<ol>${listItems.join('')}</ol>`);
                    listItems = [];
                    inList = false;
                }
                
                // Add regular line as paragraph (will be processed for inline formatting)
                result.push(`<p>${line}</p>`);
            }
            
            // Close any remaining list
            if (inList) {
                result.push(listType === 'ul' ? `<ul>${listItems.join('')}</ul>` : `<ol>${listItems.join('')}</ol>`);
            }
            
            html = result.join('\n');
            
            // Inline formatting (apply after structure is in place)
            // Process markdown links FIRST, before other formatting
            // This handles cases like [**text**](url) or [*text*](url)
            
            // Process markdown links: [text](url) - Handle links with formatting inside
            // Match pattern: [text](url) where text can contain ** for bold
            // Use non-greedy matching to handle multiple links in one line
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
                // Trim whitespace from link text and URL
                linkText = linkText.trim();
                url = url.trim();
                
                // Process bold inside link text: **text** -> <strong>text</strong>
                // Handle multiple bold sections in the same link text
                let processedText = linkText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                processedText = processedText.replace(/__(.+?)__/g, '<strong>$1</strong>');
                
                // Process italic inside link text: *text* -> <em>text</em>
                // Only process single asterisks/underscores that aren't part of bold
                // Browser-compatible: Use word boundary and negative lookahead instead of lookbehind
                processedText = processedText.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
                processedText = processedText.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');
                
                // Escape URL to prevent XSS
                const div2 = document.createElement('div');
                div2.textContent = url;
                const escapedUrl = div2.innerHTML;
                
                return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" style="color: #00B7B0; text-decoration: underline; cursor: pointer; word-break: break-word; overflow-wrap: break-word;">${processedText}</a>`;
            });
            
            // Auto-detect and wrap plain URLs in anchor tags (for URLs not in markdown format)
            // Matches http://, https://, www. URLs
            // Use a more sophisticated approach to avoid wrapping URLs already in anchor tags
            const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+)/gi;
            html = html.replace(urlPattern, (url, offset) => {
                // Check if this URL is already inside an anchor tag
                // Look backwards and forwards from the match position
                const beforeMatch = html.substring(Math.max(0, offset - 50), offset);
                const afterMatch = html.substring(offset + url.length, Math.min(html.length, offset + url.length + 50));
                
                // If we see <a before and > after (or </a>), skip wrapping
                const hasOpeningTag = beforeMatch.lastIndexOf('<a') > beforeMatch.lastIndexOf('</a>');
                const hasClosingTag = afterMatch.indexOf('</a>') !== -1 || afterMatch.indexOf('>') !== -1;
                
                if (hasOpeningTag && hasClosingTag) {
                    // Already inside an anchor tag, don't wrap again
                    return url;
                }
                
                // Add https:// if URL starts with www.
                const fullUrl = url.startsWith('www.') ? `https://${url}` : url;
                return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="color: #00B7B0; text-decoration: underline; cursor: pointer; word-break: break-word; overflow-wrap: break-word;">${url}</a>`;
            });
            
            // Bold: **text** or __text__
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
            
            // Italic: *text* or _text_ (only if not already bold)
            // Process single asterisks/underscores that aren't part of bold
            // Browser-compatible: Use word boundary and negative lookahead instead of lookbehind
            html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
            html = html.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');
            
            return html;
        }

        // ====================================================================
        // MESSAGE DISPLAY METHODS
        // ====================================================================
        // Handles adding messages to the conversation UI
        
        /**
         * Adds a message to the conversation display
         * 
         * Creates a message bubble with avatar and adds it to the messages area.
         * Bot messages are rendered with markdown, user messages as plain text.
         * Automatically caches the message and plays sound for bot messages.
         * 
         * @param {string} text - The message text content
         * @param {boolean} isBot - True for bot messages, false for user messages
         * @param {boolean} saveToCache - Whether to save this message to cache (default: true)
         * @param {Array|null} options - Optional: Options array to store with the message
         * @returns {HTMLElement} The message container element
         */
        addMessage(text, isBot = true, saveToCache = true, options = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chatbot-lg-message ${isBot ? 'bot' : 'user'}`;
            
            const avatar = document.createElement('div');
            avatar.className = 'chatbot-lg-message-avatar';
            avatar.style.background = isBot 
                ? `rgba(0, 61, 70, 0.85)`
                : `rgba(0, 183, 176, 0.85)`;
            avatar.textContent = isBot ? '🤖' : '👤';
            
            const container = document.createElement('div');
            container.className = 'chatbot-lg-message-container';
            
            const bubble = document.createElement('div');
            bubble.className = 'chatbot-lg-message-bubble';
            
            // Render markdown for bot messages, plain text for user messages
            if (isBot) {
                bubble.innerHTML = this.parseMarkdown(text);
            } else {
            bubble.textContent = text;
            }
            
            container.appendChild(bubble);
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(container);
            this.messagesDiv.appendChild(messageDiv);
            this.scrollToBottom();
            
            // Cache message if enabled
            if (saveToCache) {
                this.saveMessageToCache(text, isBot, null, options);
            }
            
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

        /**
         * Removed: getOptionIcon() function
         * 
         * Emojis are now controlled entirely by the backend (Google Sheets).
         * Options display exactly as sent from the backend in option_value field.
         */

        /**
         * Adds option buttons below the last message
         * 
         * Creates clickable option buttons from the options array provided by the backend.
         * Each button displays the option text exactly as sent from Google Sheets (including any emojis).
         * Emojis are controlled entirely by the backend, not the frontend.
         * 
         * @param {Array} options - Array of option objects with id and option_value properties
         */
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
                // Display option_value exactly as sent from backend (Google Sheets)
                // Emojis are controlled by backend, not frontend
                btn.textContent = option.option_value || option.value || '';
                btn.onclick = () => this.handleOptionClick(option);
                optionsDiv.appendChild(btn);
            });
            
            container.appendChild(optionsDiv);
        }

        /**
         * Enables the text input field in the footer
         * 
         * Replaces the footer content with an input field and send button.
         * The input field allows users to type custom questions.
         * Enter key or send button submits the question.
         */
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
            // Auto-focus the input field for better UX
            document.getElementById('chatbot-lg-input')?.focus();
        }

        /**
         * Disables the text input field
         * 
         * Replaces the input field with a message instructing users to select
         * an option instead. Used when the conversation flow requires option selection.
         */
        disableTextInput() {
            this.footerDiv.innerHTML = `
                <div style="text-align: center; color: rgba(0, 61, 70, 0.6); padding: 8px; font-size: 13px;">
                    Please select an option above
                </div>
            `;
        }

        /**
         * Shows a typing indicator animation
         * 
         * Displays animated dots to indicate that the bot is processing a response.
         * The indicator is removed when the response is received.
         */
        addTypingIndicator() {
            const typing = document.createElement('div');
            typing.id = 'chatbot-lg-typing';
            typing.className = 'chatbot-lg-message bot';
            typing.innerHTML = `
                <div class="chatbot-lg-message-avatar" style="background: rgba(0, 61, 70, 0.85);">🤖</div>
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

        /**
         * Removes the typing indicator from the messages area
         */
        removeTypingIndicator() {
            const typing = document.getElementById('chatbot-lg-typing');
            if (typing) typing.remove();
        }

        // ====================================================================
        // API COMMUNICATION METHODS
        // ====================================================================
        // Handles all HTTP requests to the backend webhook
        
        /**
         * Sends a request to the backend webhook
         * 
         * Handles all API communication with the backend. Shows typing indicator,
         * validates request data, ensures session_id is included, and handles errors.
         * 
         * Special handling for Step 1 (send_user_types) to ensure only step and
         * session_id are sent, using saved session_id if available.
         * 
         * @param {Object} data - Request payload object
         * @param {string} data.step - Required: The conversation step identifier
         * @param {string} [data.session_id] - Session identifier (auto-filled if missing)
         * @param {string} [data.user_type] - Selected user type
         * @param {string} [data.concern_category] - Selected concern category
         * @param {string} [data.question] - User's question
         * @returns {Promise<Object|null>} Parsed JSON response or null on error
         */
        async sendRequest(data) {
            try {
                this.addTypingIndicator();
                
                // Validate required fields
                if (!data.step) {
                    throw new Error('Request missing required field: step');
                }
                
                // For Step 1 (send_user_types), only send step and session_id
                if (data.step === 'send_user_types') {
                    // ALWAYS include session_id - prioritize state over explicitly passed empty string
                    // Get from: provided value (if truthy) -> state -> sessionStorage -> empty string
                    const sessionId = (data.session_id && data.session_id.trim() !== '') 
                        ? data.session_id 
                        : (this.state.session_id || this.getSessionId() || '');
                    const requestBody = {
                        step: 'send_user_types',
                        session_id: sessionId
                    };
                    
                    console.log('📤 Step 1 Request:', JSON.stringify(requestBody, null, 2));
                    
                    const response = await fetch(this.config.webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                    
                    this.removeTypingIndicator();

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                    }
                    
                    const text = await response.text();
                    if (!text) throw new Error('Empty response from server');
                    
                    let parsedResponse;
                    try {
                        parsedResponse = JSON.parse(text);
                    } catch (parseError) {
                        throw new Error(`Invalid JSON response: ${parseError.message}`);
                    }
                    
                    return parsedResponse;
                }
                
                // For all other steps, ALWAYS ensure session_id is included
                // Get from: provided value -> state -> sessionStorage -> empty string
                if (!data.session_id) {
                    data.session_id = this.state.session_id || this.getSessionId() || '';
                }
                
                console.log('📤 Request:', JSON.stringify(data, null, 2));
                
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
                
                let parsedResponse;
                try {
                    parsedResponse = JSON.parse(text);
                } catch (parseError) {
                    throw new Error(`Invalid JSON response: ${parseError.message}`);
                }
                
                return parsedResponse;
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
                } else if (error.message.includes('Invalid JSON')) {
                    errorMsg = `❌ Invalid Response: ${error.message}\n\n` +
                              `The server returned invalid JSON. Please check the backend response format.`;
                }
                
                console.error('Chatbot Error:', error);
                console.error('Request that failed:', data);
                this.addMessage(errorMsg, true);
                
                // Re-enable input if it was enabled before error
                const input = document.getElementById('chatbot-lg-input');
                if (input && !input.disabled) {
                    // Input was enabled, keep it enabled after error
                    const sendBtn = document.getElementById('chatbot-lg-send');
                    if (sendBtn) sendBtn.disabled = !input.value.trim();
                }
                
                return null;
            }
        }

        /**
         * Initiates a new chat conversation or restores an existing one
         * 
         * Checks for cached messages and session_id. If found, restores the conversation
         * without sending a new request to the backend. Otherwise, starts a fresh
         * conversation by sending a request to the backend.
         * 
         * The backend will generate a new session_id if one doesn't exist, or continue
         * with the existing session if session_id is provided.
         */
        async startChat() {
            // Check if we have a saved session and cached messages
            const savedSessionId = this.getSessionId();
            const cachedMessages = this.getCachedMessages();
            const hasCachedMessages = savedSessionId && cachedMessages.length > 0;
            
            if (hasCachedMessages) {
                // Restore messages from cache and restore full state
                const restored = this.restoreMessagesFromCache();
                
                if (restored) {
                    // Successfully restored from cache - don't send new request
                    // Just restore the UI state based on current step
                    // Check if we're at the AI disclaimer step - if so, show "Start Over" button
                    if (this.state.currentStep === 'send_ai_disclaimer') {
                        this.showStartOverButton();
                    } else {
                        // Clear footer - don't show "Start Chat" button when restoring
                        this.footerDiv.innerHTML = '';
                        
                        // Enable appropriate UI elements based on restored step and state
                        // Use fallback logic since we don't have backend response when restoring from cache
                        // This matches the fallback logic in handleResponse()
                        const shouldEnableInput = (this.state.currentStep === 'send_top_questions' && 
                                                  this.state.concern_category === 'something_else') ||
                                                 (this.state.currentStep === 'send_query_answer');
                        
                        if (shouldEnableInput) {
                            this.enableTextInput();
                        } else {
                            // For other steps, show message that options will appear
                            // But don't show "Start Chat" - options should already be visible from cache
                            this.disableTextInput();
                        }
                    }
                    
                    // Scroll to bottom to show latest messages
                    this.scrollToBottom();
                    return; // Exit early - don't send request to backend
                }
            }
            
            // Remove starting disclaimer if it exists
            const startingDisclaimer = this.messagesDiv.querySelector('.chatbot-lg-starting-disclaimer');
            if (startingDisclaimer) {
                startingDisclaimer.remove();
            }
            
            // No cached messages or restoration failed - start new conversation flow
            // BUT preserve session_id if it was already set from send_ai_starting_disclaimer
            const existingSessionId = this.state.session_id || this.getSessionId() || '';
            this.clearMessageCache();
            this.state = {
                currentStep: 'send_user_types',
                session_id: existingSessionId, // Preserve session_id from disclaimer
                user_type: '',
                concern_category: '',
                question: ''
            };

            this.footerDiv.innerHTML = '<div style="text-align: center; color: rgba(0, 61, 70, 0.6); padding: 8px; font-size: 13px;">Loading...</div>';

            // Send request - session_id will be auto-filled by sendRequest() from state or storage
            const response = await this.sendRequest({
                step: 'send_user_types'
                // session_id will be automatically included by sendRequest() logic
            });

            if (response) {
                this.handleResponse(response);
            } else {
                // If request failed, show error and allow retry
                this.footerDiv.innerHTML = `
                    <button class="chatbot-lg-start-btn" id="chatbot-lg-start">Retry</button>
                `;
                this.widget.querySelector('#chatbot-lg-start').addEventListener('click', () => this.startChat());
            }
        }

        /**
         * Handles user clicks on option buttons
         * 
         * Processes option selections based on the current conversation step:
         * - send_user_types: Saves user_type and requests concern categories
         * - send_concern_categories: Saves concern_category and requests top questions
         *   (or enables input if "something_else" is selected)
         * - send_top_questions: Sends question to AI agent (or enables input if "something_else")
         * - answer: Handles "Ask another question" (restarts from concern categories)
         *           or "Talk to Human" (sends redirect_to_human_support)
         * 
         * @param {Object} option - The clicked option object
         * @param {string} option.id - Option identifier
         * @param {string} option.option_value - Display text for the option
         */
        async handleOptionClick(option) {
            // Disable all option buttons to prevent double-clicking
            document.querySelectorAll('.chatbot-lg-option-btn').forEach(btn => btn.disabled = true);
            
            // Add user message
            // Safeguard: If option_value is a step name (shouldn't happen, but handle gracefully)
            const stepNameMap = {
                'redirect_to_human_support': 'Talk to Human',
                'send_user_types': 'Start Chat',
                'send_concern_categories': 'Select Concern',
                'send_top_questions': 'Select Question',
                'send_query_answer': 'Ask Question',
                'send_ai_disclaimer': 'Send AI Disclaimer'
            };
            
            // Use friendly text if option_value matches a step name, otherwise use option_value
            const displayText = stepNameMap[option.option_value] || option.option_value;
            
            // Only add user message if it's not empty
            if (displayText && displayText.trim() !== '') {
                this.addMessage(displayText, false);
            }

            let requestData = {};

            if (this.state.currentStep === 'send_user_types') {
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
                // Always send request to backend - backend handles "something_else" logic
                    requestData = {
                        step: 'send_top_questions',
                        user_type: this.state.user_type,
                        concern_category: option.id,
                        session_id: this.state.session_id || ''
                    };
                    this.state.concern_category = option.id;
                    this.state.currentStep = 'send_top_questions';
            }
            else if (this.state.currentStep === 'send_top_questions') {
                // Special handling for "Something else" option
                if (option.id === 'something_else') {
                    // Switch to free text mode - request the something_else config from backend
                    requestData = {
                        step: 'send_top_questions',
                        user_type: this.state.user_type,
                        concern_category: 'something_else',
                        session_id: this.state.session_id || ''
                    };
                    this.state.concern_category = 'something_else';
                    this.state.question = '';
                    this.state.currentStep = 'send_top_questions';
                } else {
                    // Normal question handling - check if option has next_step defined (backend-controlled routing)
                    if (option.next_step) {
                        // Backend defined next step - use it
                        requestData = {
                            step: option.next_step,
                            user_type: this.state.user_type,
                            concern_category: this.state.concern_category,
                            question: option.option_value,
                            session_id: this.state.session_id || ''
                        };
                        this.state.question = option.option_value;
                        this.state.currentStep = option.next_step;
                    } else {
                        // Default: Send to AI agent (send_query_answer)
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
            }
            else if (this.state.currentStep === 'send_query_answer') {
                // Use next_step from option if provided (backend-controlled routing)
                // Otherwise, determine step based on option.id for backward compatibility
                const nextStep = option.next_step || 
                                (option.id === 'ask_another' ? 'send_concern_categories' : 
                                 option.id === 'talk_to_human' ? 'redirect_to_human_support' : 
                                 'send_query_answer');
                
                // Build request data based on next step
                if (nextStep === 'send_concern_categories') {
                    // "Ask another question" - Start new question flow
                    // ✅ PRESERVE SESSION: session_id, user_type
                    // 🔄 RESET QUESTION FLOW: Don't send concern_category or question
                    // Backend will detect missing fields and return fresh categories
                    requestData = {
                        step: nextStep,
                        user_type: this.state.user_type,  // ✅ Preserved (same user)
                        session_id: this.state.session_id || ''  // ✅ Preserved (same session)
                        // concern_category: NOT SENT (reset for new question)
                        // question: NOT SENT (reset for new question)
                    };
                    // Update frontend state for new question flow
                    // Note: We don't clear concern_category/question here - they'll be set when user selects/asks
                    this.state.currentStep = nextStep;
                } else if (nextStep === 'redirect_to_human_support') {
                    // "Talk to Human" - Include current question context
                    requestData = {
                        step: nextStep,
                        user_type: this.state.user_type,
                        concern_category: this.state.concern_category || '',
                        question: this.state.question || '',
                        session_id: this.state.session_id || ''
                    };
                    this.state.currentStep = nextStep;
                } else {
                    // Default: Continue with current question context
                    requestData = {
                        step: nextStep,
                        user_type: this.state.user_type,
                        concern_category: this.state.concern_category || '',
                        question: this.state.question || '',
                        session_id: this.state.session_id || ''
                    };
                    this.state.currentStep = nextStep;
                }
                
                // Rating UI will be added in handleResponse if step is redirect_to_human_support
            }

            if (Object.keys(requestData).length > 0) {
                const response = await this.sendRequest(requestData);
                if (response) this.handleResponse(response);
            }
        }

        /**
         * Sends a user-typed question to the backend
         * 
         * Reads the question from the input field, adds it as a user message,
         * and sends it to the backend with send_query_answer step.
         * Clears and re-enables the input field after sending.
         */
        async sendQuestion() {
            const input = document.getElementById('chatbot-lg-input');
            const question = input?.value.trim();
            if (!question) return;

            input.disabled = true;
            const sendBtn = document.getElementById('chatbot-lg-send');
            if (sendBtn) sendBtn.disabled = true;

            this.addMessage(question, false);
            
            // Store the question in state so it's available for feedback submission
            this.state.question = question;

            const response = await this.sendRequest({
                step: 'send_query_answer',
                user_type: this.state.user_type,
                concern_category: this.state.concern_category,
                question: question,
                session_id: this.state.session_id || ''
            });

            if (response) {
                // Clear input and re-enable for follow-up questions
                input.value = '';
                input.disabled = false;
                if (sendBtn) sendBtn.disabled = true; // Disabled until user types
                this.handleResponse(response);
            } else {
                // Re-enable input on error
                input.disabled = false;
                if (sendBtn) sendBtn.disabled = !input.value.trim();
            }
        }

        /**
         * Processes and displays the backend response
         * 
         * Handles the response from the backend by:
         * - Saving session_id if provided
         * - Updating conversation state (currentStep)
         * - Displaying messages and answers
         * - Filtering out unwanted message prefixes
         * - Enabling/disabling text input based on response
         * - Displaying option buttons if provided
         * 
         * @param {Object} response - Backend response object
         * @param {string} [response.session_id] - Session identifier
         * @param {string} [response.step] - Current conversation step
         * @param {string} [response.message] - Bot message to display
         * @param {string} [response.answer] - Bot answer to display
         * @param {boolean} [response.text_input_enabled] - Whether to enable text input
         * @param {Array} [response.options] - Array of option buttons to display
         */
        handleResponse(response) {
            // Special handling for starting disclaimer step
            if (response.step === 'send_ai_starting_disclaimer') {
                // Show disclaimer with embedded links
                if (response.message && response.message.trim() !== '') {
                    this.showStartingDisclaimer(response);
                }
                // Show "Start Chat" button (already in footer)
                return; // Don't process as regular message
            }
            
            // Save session_id from backend response
            if (response.session_id) {
                this.saveSessionId(response.session_id);
                this.state.session_id = response.session_id; // Also update state
            }

            // Use the step name from backend response (matches the switch node branch that processed it)
            if (response.step) {
                this.state.currentStep = response.step;
            }

            // Check if rating UI should be shown (rating_enabled takes precedence over regular options)
            // Handle both boolean true and string "true" from backend
            const isRatingStep = response.rating_enabled === true || response.rating_enabled === 'true';
            
            // Store options to attach to the message/answer
            // If rating is enabled, don't save options as regular options (they're feedback options for rating UI)
            const optionsToStore = (!isRatingStep && response.options && response.options.length > 0) ? response.options : null;
            
            // Display messages and answers exactly as sent from backend (no filtering)
            // Backend is responsible for sending clean, properly formatted messages
            if (response.message) {
                // Store options with the message if they exist (but not if rating is enabled)
                // Rating UI will be saved separately via updateLastCachedMessageRatingFlag
                this.addMessage(response.message, true, true, optionsToStore);
            }
            if (response.answer) {
                // Store options with the answer if they exist (and message didn't have them)
                // Rating UI will be saved separately via updateLastCachedMessageRatingFlag
                this.addMessage(response.answer, true, true, optionsToStore);
            }

            // Determine if input should be enabled
            // Special case: After answer step, ALWAYS enable input for follow-up questions
            // This allows users to ask follow-up questions related to the same category
            let shouldEnableInput = false;
            
            // Special handling: Force enable input after send_query_answer step (for follow-up questions)
            // When backend processes send_query_answer and returns an answer, it sends step: 'send_query_answer'
            if (this.state.currentStep === 'send_query_answer' || response.answer) {
                // After receiving an answer, always enable input for follow-up questions
                // This allows users to continue the conversation about the same topic
                shouldEnableInput = true;
            } else {
                // For all other steps, use backend value with fallback logic
                // Priority: Backend value first, then fallback to frontend logic if backend value is invalid
                
                // Check if backend sent a valid boolean value for text_input_enabled
                if (response.text_input_enabled === true || response.text_input_enabled === false) {
                    // Backend provided valid value - use it
                    shouldEnableInput = response.text_input_enabled === true;
                } else {
                    // Backend value is missing, null, undefined, or invalid - use fallback frontend logic
                    // Fallback logic for cases where backend doesn't send text_input_enabled
                    shouldEnableInput = (this.state.currentStep === 'send_top_questions' && 
                                     this.state.concern_category === 'something_else');
                }
            }

            if (shouldEnableInput) {
                this.enableTextInput();
            } else {
                this.disableTextInput();
            }

            // Add rating UI if backend explicitly enables it (via rating_enabled flag)
            // When rating_enabled is true, options contains feedback options (not action buttons)
            // Handle both boolean true and string "true" from backend
            if (response.rating_enabled === true || response.rating_enabled === 'true') {
                // Add rating UI under the last bot message with feedback options from backend
                // Debug: Log what we're receiving
                console.log('📊 Rating enabled. Feedback options received:', response.options);
                this.addRatingUI(response.options || []);
                
                // Update the last cached message to include rating_enabled flag
                // This allows us to restore rating UI when cache is loaded
                this.updateLastCachedMessageRatingFlag(true, response.options || []);
            } else {
                // When rating is not enabled, options are regular action buttons
            if (response.options && response.options.length > 0) {
                this.addOptions(response.options);
                }
            }

            this.scrollToBottom();
        }

        /**
         * Scrolls the messages area to the bottom
         * 
         * Ensures the latest message is visible by scrolling to the maximum scroll position.
         */
        scrollToBottom() {
            this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
        }

        // ====================================================================
        // RATING SYSTEM METHODS
        // ====================================================================
        // Handles rating and feedback collection for "Talk to Human" step
        
        /**
         * Adds rating UI (5 stars + feedback options) after redirect_to_human_support message
         * 
         * Creates a rating interface with 5 clickable stars and predefined feedback options.
         * If "Other" option is selected, shows a text input for custom feedback.
         * 
         * @param {Array} feedbackOptions - Array of feedback option objects from backend
         *                                  Format: [{id: 'perfect', value: 'Chat was perfect'}, ...]
         */
        addRatingUI(feedbackOptions = []) {
            // Check if rating UI already exists
            if (document.getElementById('chatbot-lg-rating-container')) return;

            const lastMessage = this.messagesDiv.lastElementChild;
            if (!lastMessage) return;

            const container = lastMessage.querySelector('.chatbot-lg-message-container');
            if (!container) return;

            // Create rating container
            const ratingContainer = document.createElement('div');
            ratingContainer.id = 'chatbot-lg-rating-container';
            ratingContainer.className = 'chatbot-lg-rating-container';

            // Create stars container
            const starsContainer = document.createElement('div');
            starsContainer.className = 'chatbot-lg-stars-container';
            starsContainer.innerHTML = `
                <div class="chatbot-lg-rating-label">Rate your experience:</div>
                <div class="chatbot-lg-stars" id="chatbot-lg-stars">
                    <span class="chatbot-lg-star" data-rating="1">⭐</span>
                    <span class="chatbot-lg-star" data-rating="2">⭐</span>
                    <span class="chatbot-lg-star" data-rating="3">⭐</span>
                    <span class="chatbot-lg-star" data-rating="4">⭐</span>
                    <span class="chatbot-lg-star" data-rating="5">⭐</span>
                </div>
            `;

            // Create feedback container with predefined options
            const feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'chatbot-lg-feedback-container';
            
            // Build feedback options HTML (radio buttons)
            // Validate and filter feedback options - ensure they have correct structure
            let feedbackOptionsHTML = '';
            const validFeedbackOptions = feedbackOptions.filter(opt => {
                // Filter out invalid options (step names, empty values, etc.)
                const stepNames = ['redirect_to_human_support', 'send_user_types', 'send_concern_categories', 
                                 'send_top_questions', 'send_query_answer', 'send_ai_disclaimer'];
                const optId = (opt.id || '').toLowerCase();
                const optValue = (opt.value || opt.option_value || '').toLowerCase();
                
                // Skip if it's a step name or empty
                if (stepNames.includes(optId) || stepNames.some(step => optValue.includes(step))) {
                    return false;
                }
                // Must have both id and value
                return opt.id && (opt.value || opt.option_value);
            });
            
            if (validFeedbackOptions.length > 0) {
                feedbackOptionsHTML = `
                    <div class="chatbot-lg-feedback-label">What can we improve?</div>
                    <div class="chatbot-lg-feedback-options" id="chatbot-lg-feedback-options">
                `;
                
                validFeedbackOptions.forEach((option, index) => {
                    // Support both 'value' and 'option_value' properties
                    const displayValue = option.value || option.option_value || '';
                    const optionId = option.id || `option-${index}`;
                    const isOther = optionId.toLowerCase() === 'other' || displayValue.toLowerCase().includes('other');
                    
                    feedbackOptionsHTML += `
                        <label class="chatbot-lg-feedback-option">
                            <input 
                                type="radio" 
                                name="feedback-option" 
                                value="${optionId}" 
                                id="feedback-${optionId}"
                                ${isOther ? 'data-is-other="true"' : ''}
                            />
                            <span>${displayValue}</span>
                        </label>
                    `;
                });
                
                feedbackOptionsHTML += '</div>';
            } else {
                // Fallback: Show message if no valid feedback options
                feedbackOptionsHTML = `
                    <div class="chatbot-lg-feedback-label" style="color: rgba(0, 61, 70, 0.5); font-style: italic;">
                        No feedback options available
                    </div>
                `;
            }
            
            // Text input for "Other" option (hidden by default)
            feedbackOptionsHTML += `
                <textarea 
                    id="chatbot-lg-feedback-text" 
                    class="chatbot-lg-feedback-input" 
                    placeholder="Please describe..."
                    rows="3"
                    style="display: none; margin-top: 10px;"
                ></textarea>
                <button 
                    id="chatbot-lg-submit-rating" 
                    class="chatbot-lg-submit-rating-btn"
                    disabled
                >
                    Submit Rating
                </button>
            `;
            
            feedbackContainer.innerHTML = feedbackOptionsHTML;
            ratingContainer.appendChild(starsContainer);
            ratingContainer.appendChild(feedbackContainer);
            container.appendChild(ratingContainer);

            // Attach event listeners
            this.attachRatingEvents(feedbackOptions);
            
            // Initialize all stars as empty (no rating selected yet)
            this.updateStarDisplay(0);
        }

        /**
         * Attaches event listeners to rating stars, feedback options, and submit button
         * 
         * @param {Array} feedbackOptions - Array of feedback option objects from backend
         */
        attachRatingEvents(feedbackOptions = []) {
            const stars = document.querySelectorAll('.chatbot-lg-star');
            const submitBtn = document.getElementById('chatbot-lg-submit-rating');
            const feedbackTextInput = document.getElementById('chatbot-lg-feedback-text');
            let selectedRating = 0;
            let selectedFeedbackOption = null;

            // Star click handlers
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    selectedRating = index + 1;
                    this.updateStarDisplay(selectedRating);
                    this.checkRatingSubmitEnabled(selectedRating, selectedFeedbackOption, submitBtn);
                });

                star.addEventListener('mouseenter', () => {
                    this.highlightStars(index + 1);
                });
            });

            // Reset stars on mouse leave
            const starsContainer = document.getElementById('chatbot-lg-stars');
            if (starsContainer) {
                starsContainer.addEventListener('mouseleave', () => {
                    this.highlightStars(selectedRating);
                });
            }

            // Feedback option radio button handlers
            const feedbackRadios = document.querySelectorAll('input[name="feedback-option"]');
            feedbackRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    selectedFeedbackOption = e.target.value;
                    const isOther = e.target.dataset.isOther === 'true';
                    
                    // Show/hide text input based on "Other" selection
                    if (isOther && feedbackTextInput) {
                        feedbackTextInput.style.display = 'block';
                        feedbackTextInput.focus();
                    } else if (feedbackTextInput) {
                        feedbackTextInput.style.display = 'none';
                        feedbackTextInput.value = '';
                    }
                    
                    this.checkRatingSubmitEnabled(selectedRating, selectedFeedbackOption, submitBtn);
                });
            });

            // Submit button handler
            if (submitBtn) {
                submitBtn.addEventListener('click', () => {
                    if (selectedRating > 0) {
                        const feedbackText = feedbackTextInput && feedbackTextInput.style.display !== 'none' 
                            ? feedbackTextInput.value.trim() 
                            : '';
                        this.submitRating(selectedRating, selectedFeedbackOption, feedbackText);
                    }
                });
            }
        }

        /**
         * Checks if submit button should be enabled based on rating and feedback selection
         * 
         * @param {number} rating - Selected rating (0-5)
         * @param {string|null} feedbackOption - Selected feedback option ID
         * @param {HTMLElement} submitBtn - Submit button element
         */
        checkRatingSubmitEnabled(rating, feedbackOption, submitBtn) {
            if (!submitBtn) return;
            
            // Enable submit if rating is selected
            // Feedback option is optional (user can skip it)
            submitBtn.disabled = rating === 0;
        }

        /**
         * Updates star display based on selected rating
         * 
         * @param {number} rating - Selected rating (1-5)
         */
        updateStarDisplay(rating) {
            const stars = document.querySelectorAll('.chatbot-lg-star');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                    // Keep filled star emoji - CSS handles the glow effect
                    star.textContent = '⭐';
                    // Clear inline styles so CSS active class can take over
                    star.style.opacity = '';
                    star.style.filter = '';
                } else {
                    star.classList.remove('active');
                    // Keep filled star emoji - CSS handles the blurred appearance
                    star.textContent = '⭐';
                    // Reset to default blurred state
                    star.style.opacity = '0.3';
                    star.style.filter = 'grayscale(0.5) blur(0.5px)';
                }
            });
        }

        /**
         * Highlights stars on hover
         * 
         * @param {number} rating - Rating to highlight up to
         */
        highlightStars(rating) {
            const stars = document.querySelectorAll('.chatbot-lg-star');
            stars.forEach((star, index) => {
                // If star is active (selected), let CSS handle the glow - don't override
                if (star.classList.contains('active')) {
                    star.style.opacity = '';
                    star.style.filter = '';
                    return;
                }
                
                if (index < rating) {
                    // Temporarily brighten on hover (but not as bright as selected)
                    star.style.opacity = '0.7';
                    star.style.filter = 'grayscale(0.2) blur(0.2px)';
                } else {
                    // Reset to default blurred state
                    star.style.opacity = '0.3';
                    star.style.filter = 'grayscale(0.5) blur(0.5px)';
                }
            });
        }

        /**
         * Submits rating and feedback to backend
         * 
         * @param {number} rating - User's rating (1-5)
         * @param {string|null} feedbackOption - Selected feedback option ID (e.g., 'perfect', 'slow', 'other')
         * @param {string} feedbackText - Custom feedback text (only if "Other" was selected)
         */
        async submitRating(rating, feedbackOption = null, feedbackText = '') {
            const submitBtn = document.getElementById('chatbot-lg-submit-rating');
            const feedbackTextInput = document.getElementById('chatbot-lg-feedback-text');
            const feedbackRadios = document.querySelectorAll('input[name="feedback-option"]');

            // Disable submit button immediately and prevent any interaction
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
                submitBtn.style.pointerEvents = 'none';
                submitBtn.style.cursor = 'not-allowed';
            }

            // Disable all inputs immediately to prevent changes during submission
            const stars = document.querySelectorAll('.chatbot-lg-star');
            stars.forEach(star => {
                star.style.pointerEvents = 'none';
            });
            
            feedbackRadios.forEach(radio => {
                radio.disabled = true;
            });
            
            if (feedbackTextInput) {
                feedbackTextInput.disabled = true;
            }

            try {
                // Send rating and feedback to backend
                // Backend expects: rating (1-5), feedback_option (ID), feedback_text (only if "Other" selected)
                const response = await this.sendRequest({
                    step: 'send_ai_disclaimer',
                    session_id: this.state.session_id || '',
                    rating: rating,
                    feedback_option: feedbackOption || '',  // Selected option ID (e.g., 'perfect', 'slow', 'other')
                    feedback_text: feedbackText || '',        // Custom text (only if "Other" was selected)
                    user_type: this.state.user_type || '',
                    concern_category: this.state.concern_category || '',
                    question: this.state.question || ''
                });

                // Keep rating UI visible after submission (don't hide it)
                // Update submit button to show success state (keep it disabled)
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '✓ Submitted';
                    submitBtn.style.background = 'linear-gradient(135deg, rgba(0, 183, 176, 0.9), rgba(0, 183, 176, 0.9))';
                    submitBtn.style.pointerEvents = 'none';
                    submitBtn.style.cursor = 'not-allowed';
                }
                
                // Disable stars after submission (ensure they stay disabled)
                stars.forEach(star => {
                    star.style.pointerEvents = 'none';
                    star.style.opacity = '0.6';
                    star.style.cursor = 'not-allowed';
                });
                
                // Disable feedback options after submission (ensure they stay disabled)
                feedbackRadios.forEach(radio => {
                    radio.disabled = true;
                    radio.style.cursor = 'not-allowed';
                });
                
                // Disable feedback text input after submission
                if (feedbackTextInput) {
                    feedbackTextInput.disabled = true;
                    feedbackTextInput.style.opacity = '0.6';
                    feedbackTextInput.style.cursor = 'not-allowed';
                }

                // Show thank you message if backend provides one
                // Save it with send_ai_disclaimer step since we're in the disclaimer flow
                if (response && response.message) {
                    this.state.currentStep = 'send_ai_disclaimer';
                    this.addMessage(response.message, true, true, null);
                }
                
                // Show AI disclaimer if backend provides it (fetched from Google Sheets)
                if (response && response.disclaimer) {
                    this.addDisclaimer(response.disclaimer);
                }

                // Always show "Start Over" button after rating submission
                // Ensure step is set before showing button
                this.state.currentStep = 'send_ai_disclaimer';
                this.showStartOverButton();
            } catch (error) {
                // On error, keep button disabled but show error state
                console.error('Error submitting rating:', error);
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Error - Try Again';
                    submitBtn.style.background = 'linear-gradient(135deg, rgba(255, 106, 61, 0.9), rgba(255, 140, 90, 0.9))';
                    submitBtn.style.pointerEvents = 'none';
                }
                
                // Still show "Start Over" button even on error
                this.showStartOverButton();
            }
        }

        /**
         * Shows "Start Over" button in the footer
         */
        showStartOverButton() {
            this.footerDiv.innerHTML = `
                <button class="chatbot-lg-start-btn" id="chatbot-lg-start-over">Start Over</button>
            `;
            
            // Attach event listener
            const startOverBtn = document.getElementById('chatbot-lg-start-over');
            if (startOverBtn) {
                startOverBtn.addEventListener('click', () => this.resetChat());
            }
        }

        /**
         * Adds AI disclaimer message after feedback submission
         * 
         * Displays the disclaimer text fetched from Google Sheets via backend.
         * The disclaimer is shown as a bot message with special styling.
         * 
         * @param {string} disclaimerText - Disclaimer text from backend (Google Sheets)
         */
        addDisclaimer(disclaimerText) {
            if (!disclaimerText || disclaimerText.trim() === '') return;
            
            // Create a special message container for disclaimer
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chatbot-lg-message bot';
            
            const avatar = document.createElement('div');
            avatar.className = 'chatbot-lg-message-avatar';
            avatar.style.background = `rgba(0, 61, 70, 0.85)`;
            avatar.textContent = '🤖';
            
            const container = document.createElement('div');
            container.className = 'chatbot-lg-message-container';
            
            const bubble = document.createElement('div');
            bubble.className = 'chatbot-lg-message-bubble chatbot-lg-disclaimer';
            
            // Render markdown for disclaimer (supports formatting)
            bubble.innerHTML = this.parseMarkdown(disclaimerText);
            
            container.appendChild(bubble);
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(container);
            this.messagesDiv.appendChild(messageDiv);
            
            // Update state to reflect that we're at the AI disclaimer step
            this.state.currentStep = 'send_ai_disclaimer';
            
            // Cache the disclaimer message
            this.saveMessageToCache(disclaimerText, true, 'send_ai_disclaimer');
            
            this.scrollToBottom();
        }
    }

    // ====================================================================
    // GLOBAL API
    // ====================================================================
    // Exposes the chatbot initialization function to the global window object
    
    /**
     * Global API for initializing the chatbot widget
     * 
     * Provides a simple interface for website integration.
     * Prevents multiple instances from being created.
     * 
     * @example
     * ChatbotLiquidGlass.init({
     *   webhookUrl: 'https://example.com/webhook',
     *   position: 'bottom-right'
     * });
     */
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


