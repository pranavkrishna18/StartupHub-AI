# StartupHub AI 🚀

> **AI-Powered Startup Validation, Co-Founder Discovery, and Startup Growth Platform**

StartupHub AI is an enterprise-grade SaaS application designed to help founders validate their ideas with artificial intelligence, discover co-founders using algorithmic skill compatibility, interact in real-time, showcase their growth traction to investors, and maintain platform integrity with advanced moderation features.

---

## 🌟 Key Features Built

### 1. The Foundation & Auth (Phase 1)
* **Secure Authentication**: Built using JSON Web Tokens (JWT) stored in HTTP-Only cookies with automatic token refresh mechanisms.
* **Role-Based Access Control (RBAC)**: Distinguishes between `founder`, `cofounder`, `investor`, and `admin` permissions.
* **Launchpad Feed**: Main landing dashboard featuring search, focus category filter pills, sorting options, early waitlist subscriptions, and community upvotes.

### 2. Rotating AI Validation Engine (Phase 2)
* **AI Viability Analysis**: Generates structured business canvas models, SWOT matrices, competitor comparisons, pricing maps, and milestone roadmaps.
* **Key-Rotation & Fallback System**: Rotates API requests across multiple Gemini key gateways with automatic failover to Groq Llama 3.1 70B if limit thresholds are exceeded.

### 3. Collaboration & Real-Time Messaging (Phase 3)
* **Real-time Communication**: Powered by Socket.IO for active 1-to-1 chat, listing online contacts and messaging history.
* **Algorithm-based Co-Founder Matching**: Scores and recommends matches based on skill overlaps between founders' requirements and co-founders' profiles.
* **Team Portal**: Application processing dashboard for founders to accept/reject collaboration requests.

### 4. Investor Ecosystem (Phase 4)
* **Discovery Portal**: Advanced dashboard showing startup validation indices plotted against community traction metrics using **Recharts**.
* **Startup Bookmarking**: Lets investors bookmark promising startups and follow founders to track early growth milestones.

### 5. Enterprise Governance & Security (Phase 5)
* **Abuse Reporting & Moderation**: Integrated flagging mechanism allowing users to report content, with an admin control dashboard to take down offending startups.
* **Trust Verification Workflow**: Allows founders to submit incorporation proof links for review and approval to display a Verified trust checkmark.
* **System Audit Trails**: Middleware that captures and logs metadata (IP addresses, User-Agents, actions) for administrative updates to ensure system compliance.

---

## 🏗️ Technical Architecture

### Tech Stack
* **Frontend**: React (Vite), Redux Toolkit (Auth State), TanStack React Query (Server State caching), Tailwind CSS (Futuristic Glassmorphic Theme), Recharts (Stats charts).
* **Backend**: Node.js, Express, Socket.IO (WebSockets).
* **Database**: MongoDB (Mongoose Object Modeling).

### Project Layout
```text
StartUp_HUB/
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── components/     # Custom Glassmorphic buttons, forms, report modals, Navbar
│   │   ├── pages/          # Feed, Chat, Matches, AIReportView, Dashboards
│   │   ├── services/       # Axios API client instances
│   │   ├── App.jsx         # App routes mapping
│   │   └── main.jsx
│   └── package.json
└── server/                 # Express Backend
    ├── src/
    │   ├── config/         # DB connection & WebSocket socket.js wrappers
    │   ├── controllers/    # API Controllers (auth, admin, ai, matches, etc.)
    │   ├── middleware/     # Auth checks, error handling, audit log trails
    │   ├── models/         # Database schemas (User, Startup, AuditLog, etc.)
    │   └── routes/         # Express router endpoints
    └── package.json
```

---

## 🚀 Local Development Setup

Follow these steps to run the complete environment on your local system:

### Prerequisites
* **Node.js** (v18+ recommended)
* **MongoDB** (running locally on `mongodb://127.0.0.1:27017/startuphub` or your MongoDB Atlas URI)

### Setup Configurations
Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/startuphub
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key
FRONTEND_URL=http://localhost:5173

# AI Key Rotation (Provide keys to enable AI reports)
GEMINI_API_KEY_1=your_first_gemini_key
GEMINI_API_KEY_2=your_second_gemini_key
GROQ_API_KEY=your_groq_llama_key
```

### Launch the Application

#### Step 1: Start the Backend Server
```bash
cd server
npm install
npm run dev
```
The server will start on port `5000` and seed default database categories.

#### Step 2: Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173` to explore StartupHub AI!
