# ✨ Pockets

> Create instant collaborative spaces or join existing ones with your friends

Pockets is a modern, lightweight WebRTC-powered video conferencing application that enables seamless peer-to-peer communication. Built with Next.js and TypeScript, it offers a beautiful, responsive interface for creating and joining video chat rooms instantly.

<!-- todo: add screenshot for the application -->

## 🌟 Features

### 🚀 **Instant Room Creation**

- Generate unique room IDs with a single click
- No registration or sign-up required
- Share room IDs to invite others instantly

### 🎥 **High-Quality Video Chat**

- WebRTC-powered peer-to-peer video calls
- Real-time audio and video streaming
- Adaptive quality based on network conditions

### 💬 **Integrated Chat**

- Real-time messaging alongside video calls
- Chat history during the session
- System notifications for user events

### 🎛️ **Full Media Controls**

- Toggle audio/video on demand
- Speaker volume control
- Minimizable video interface
- Picture-in-picture support

### 🎨 **Beautiful Modern UI**

- Glassmorphism design with gradient backgrounds
- Smooth animations and transitions
- Responsive design for all devices
- Dark/light theme support (via next-themes)

### ⚡ **Performance Optimized**

- Built with Next.js 15 and React 19
- Turbopack for lightning-fast development
- Efficient WebSocket signaling server
- SQLite database for session management

## 🛠️ Tech Stack

### **Frontend**

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library
- **Sonner** - Toast notifications

### **Backend**

- **WebSocket Server** - Real-time signaling
- **SQLite** - Lightweight database
- **UUID** - Unique room ID generation

### **WebRTC**

- Peer-to-peer video/audio streaming
- ICE candidate exchange
- STUN/TURN server support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/AatirNadim/pockets.git
   cd pockets
   ```

2. **Install dependencies**

   ```bash
   # Install frontend dependencies
   pnpm install

   # Install server dependencies
   cd server
   pnpm install
   cd ..
   ```

3. **Start the development servers**

   **Terminal 1 - Start the signaling server:**

   ```bash
   cd server
   pnpm dev
   ```

   **Terminal 2 - Start the Next.js app:**

   ```bash
   pnpm dev
   ```

4. **Open your browser**

   - Navigate to `http://localhost:3000`
   - Create a new room or join an existing one!

## 📁 Project Structure

```text
pockets/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── home.tsx           # Home component
│   ├── [room]/            # Dynamic room routes
│   │   └── page.tsx       # Room interface
│   └── assets/            # Static assets
├── components/            # Reusable UI components
│   └── ui/               # Shadcn/ui components
├── lib/                  # Utility functions
│   ├── db.ts            # Database connection
│   └── utils.ts         # Helper utilities
├── server/              # WebSocket signaling server
│   ├── index.ts        # Server implementation
│   └── package.json    # Server dependencies
├── shared/             # Shared types and utilities
│   └── types.ts       # WebSocket message types
└── public/            # Static files
```

## 🎯 How It Works

1. **Room Creation**: Users can create a new room with a unique UUID
2. **WebSocket Signaling**: The server handles WebRTC signaling between peers
3. **Peer Connection**: Direct peer-to-peer connection established via WebRTC
4. **Media Streaming**: Audio/video streams shared directly between users
5. **Real-time Chat**: Messages sent through WebRTC data channels

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SERVER_PATH=localhost
NEXT_PUBLIC_SERVER_PORT=8080
```

### Server Configuration

The WebSocket server runs on port 8080 by default. You can change this in `server/index.ts`:

```typescript
const PORT = Number(process.env.PORT) || 8080;
```

## 🎨 Customization

### Themes

The app supports theme customization through Tailwind CSS and next-themes. Modify the color palette in `tailwind.config.js`.

### UI Components

All UI components are built with Radix UI and can be customized in the `components/ui/` directory.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use conventional commit messages
- Ensure all tests pass
- Update documentation as needed

<!-- ## 🙏 Acknowledgments

- **WebRTC** - For enabling peer-to-peer communication
- **Next.js Team** - For the amazing React framework
- **Vercel** - For seamless deployment platform
- **Radix UI** - For accessible component primitives
- **Tailwind CSS** - For the utility-first CSS framework

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [existing issues](https://github.com/AatirNadim/pockets/issues)
2. Create a new issue with detailed information
3. Include steps to reproduce the problem

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy the frontend automatically
4. Deploy the server separately or use Vercel Functions

### Docker

```bash
# Build and run with Docker
docker build -t pockets .
docker run -p 3000:3000 -p 8080:8080 pockets
```

---

**Made with ❤️ by [AatirNadim](https://github.com/AatirNadim)**

⭐ **Star this repo if you found it helpful!** ⭐ -->
