# 🍎 Chatbot Liquid Glass - Apple-Inspired Design

A **stunning, production-ready** chatbot widget with **Apple liquid glass** (glassmorphism) design. Built with pure JavaScript, no dependencies, and fully customizable.

## ✨ Features

- 🍎 **Apple Liquid Glass Design** - Beautiful glassmorphism effects with backdrop blur
- 🔊 **Sound Effects** - Subtle audio feedback for bot messages (configurable)
- 📱 **Mobile-Friendly** - Fully responsive, works on all devices
- 🎨 **Brand Customizable** - Easy color and styling customization
- ⚡ **Lightweight** - ~50KB, no dependencies
- 🔒 **Secure** - No hardcoded secrets, webhook URL required
- ♿ **Accessible** - Keyboard navigation support
- 🎯 **Production Ready** - Battle-tested and ready to deploy

## 🚀 Quick Start

### Installation

**Via jsDelivr CDN (Recommended):**
```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/chatbot-liquid-glass@main/chatbot-liquid-glass.js"></script>
<script>
  ChatbotLiquidGlass.init({
    webhookUrl: 'YOUR_N8N_WEBHOOK_URL', // ⚠️ REQUIRED
    position: 'bottom-right'
  });
</script>
```

**Via GitHub Pages:**
```html
<script src="https://YOUR_USERNAME.github.io/chatbot-liquid-glass/chatbot-liquid-glass.js"></script>
```

**Via Raw GitHub:**
```html
<script src="https://raw.githubusercontent.com/YOUR_USERNAME/chatbot-liquid-glass/main/chatbot-liquid-glass.js"></script>
```

**Via npm (if published):**
```bash
npm install chatbot-liquid-glass
```

## 📋 Usage

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->
  
  <!-- Chatbot Script - Add before closing </body> tag -->
  <script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/chatbot-liquid-glass@main/chatbot-liquid-glass.js"></script>
  <script>
    ChatbotLiquidGlass.init({
      webhookUrl: 'YOUR_N8N_WEBHOOK_URL', // ⚠️ REQUIRED - Get from backend
      position: 'bottom-right'
    });
  </script>
</body>
</html>
```

### Configuration Options

```javascript
ChatbotLiquidGlass.init({
  webhookUrl: 'YOUR_WEBHOOK_URL',     // Required - n8n webhook URL
  position: 'bottom-right',            // Widget position: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
  title: 'Genie Support',              // Chatbot title
  subtitle: 'The Digital PO Box',       // Chatbot subtitle
  primaryColor: '#003D46',             // Brand primary color
  accentColor: '#00B7B0',              // Brand accent color
  highlightColor: '#FF6A3D',          // Brand highlight color
  soundsEnabled: true,                 // Enable/disable sound effects
  showBadge: true                      // Show notification badge
});
```

## 🎨 Design Features

### Glassmorphism Effects
- **Frosted Glass**: `backdrop-filter: blur(20-40px)` for authentic glass effect
- **Translucent Backgrounds**: RGBA colors with transparency
- **Multi-layer Shadows**: Realistic depth and dimension
- **Smooth Animations**: Elegant transitions and micro-interactions

### Visual Elements
- Sleek, compact option buttons with smart grid layout
- Glass-style message bubbles
- Translucent header and footer
- Gradient overlays for depth
- Soft border highlights

## 🔒 Security Best Practices

### ❌ Don't Do This (Exposes Webhook URL):
```javascript
ChatbotLiquidGlass.init({
  webhookUrl: 'https://n8n.example.com/webhook/secret-key-123' // Visible in source code!
});
```

### ✅ Do This Instead (Backend Proxy):
```javascript
// Frontend
ChatbotLiquidGlass.init({
  webhookUrl: '/api/chatbot' // Your backend endpoint
});

// Backend (Node.js example)
app.post('/api/chatbot', async (req, res) => {
  const response = await fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});
```

## 🌐 Browser Support

- ✅ Chrome 76+
- ✅ Firefox 103+
- ✅ Safari 9+
- ✅ Edge 79+

**Note:** Glass effects require `backdrop-filter` support. Older browsers will show semi-transparent backgrounds without blur.

## 📁 Files

- **`chatbot-liquid-glass.js`** ⭐ - Main chatbot script (production ready)
- **`README.md`** - This file
- **`LICENSE`** - MIT License
- **`package.json`** - npm package configuration

### Documentation
- **`GITHUB_DEPLOYMENT.md`** - How to publish to GitHub
- **`PRODUCTION_TESTING_GUIDE.md`** - Testing on production website
- **`FRONTEND_DEVELOPER_INSTRUCTIONS.md`** - Instructions for frontend devs
- **`LOCAL_TESTING_STEPS.md`** - Local development setup

## 🧪 Local Development

### Prerequisites
- Node.js (for local testing server only)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/chatbot-liquid-glass.git
   cd chatbot-liquid-glass
   ```

2. **Create `.env` file:**
   ```bash
   echo "CHATBOT_WEBHOOK_URL=https://your-webhook-url.com/webhook/path" > .env
   ```

3. **Start local server:**
   ```bash
   node local-server.js
   ```

4. **Open test page:**
   ```
   http://localhost:3000/test-liquid-glass.html
   ```

**Note:** The local server is only for testing. Production doesn't need it!

## 🎯 Features in Detail

### Smart Badge Notification
- Badge only appears when bot sends a new message
- Automatically hides when widget is opened
- No false notifications

### Reset Functionality
- "Start Over" button after "Talk to Human"
- Clears chat history and resets state
- Fresh conversation start

### Sound Effects
- Subtle audio feedback for bot messages
- Configurable (can be disabled)
- Uses Web Audio API (no external files)

### Sleek Options Design
- Compact, space-efficient buttons
- Smart grid layout (auto-adjusts columns)
- Icons for visual clarity

## 📞 Support

- 📧 Email: support@thedigitalpobox.com
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/chatbot-liquid-glass/issues)
- 📚 Documentation: See documentation files in repository

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **Design Inspiration**: Apple's liquid glass aesthetic
- **Brand**: The Digital PO Box
- **Font**: Montserrat (Google Fonts)

## 🔄 Changelog

### v1.0.0 (Current)
- ✅ Initial release
- ✅ Apple liquid glass design
- ✅ Sound effects
- ✅ Smart badge notifications
- ✅ Reset functionality
- ✅ Sleek option buttons
- ✅ Production ready

---

**Made with ❤️ for The Digital PO Box**
