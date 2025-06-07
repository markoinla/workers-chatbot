# Workers-AI Chat Assistant Implementation Plan

## Project Overview
Transform the open-source WorkersAI demo into a fully-edge, multi-tenant chat assistant that floats above Paintmapper's UI and can be embedded with a single script tag.

## Architecture Decision: WebSocket-Based Real-Time Chat

**Chosen Solution**: New WebSocket-based architecture alongside existing structure
- **Rationale**: Chat applications require real-time bidirectional communication, WebSockets are optimal for token streaming, and Cloudflare Durable Objects are designed for this pattern
- **Benefits**: Clean separation, follows Cloudflare best practices, achieves size/latency requirements
- **Trade-offs**: New codebase separate from existing protobuf structure, but maintains focus and simplicity

## ✅ Phase 1: Core Infrastructure Setup (Week 1) - **COMPLETED** 🎉

### ✅ 1.1 Project Structure Setup - **COMPLETED**
```
workers-chatbot/
├── chat-embed/               ✅ Created
│   ├── src/                  ✅ Created
│   │   └── embed.js          ❌ TODO
│   ├── dist/                 ✅ Created
│   └── package.json          ❌ TODO (embed script)
├── chat-widget/              ✅ Created
│   ├── src/                  ✅ Created
│   │   ├── components/       ✅ Created
│   │   ├── hooks/            ✅ Created
│   │   ├── types/            ✅ Created
│   │   ├── utils/            ✅ Created
│   │   ├── stores/           ✅ Created
│   │   ├── App.tsx           ✅ Created (with shadcn demo)
│   │   └── main.tsx          ✅ Created
│   ├── public/               ✅ Created
│   ├── vite.config.ts        ✅ Created
│   ├── tailwind.config.js    ✅ Created (shadcn compatible)
│   └── package.json          ✅ Created
├── chat-worker/              ✅ Created
│   ├── src/                  ✅ Created
│   │   ├── index.ts          ✅ Created (basic routing)
│   │   ├── websocket.ts      ❌ TODO
│   │   ├── durable-object.ts ✅ Created (with mock AutoRAG)
│   │   ├── auth.ts           ❌ TODO (deferred)
│   │   ├── autorag.ts        ❌ TODO
│   │   └── types.ts          ❌ TODO
│   ├── wrangler.toml         ✅ Created
│   └── package.json          ✅ Created
└── shared/                   ✅ Created
    └── types/
        └── messages.ts       ✅ Created
```

### ✅ 1.2 Development Environment Setup - **COMPLETED**
- ✅ **Tools**: Node.js 18+, Wrangler CLI, Vite, TypeScript
- ✅ **Dependencies installed** for chat-worker and chat-widget
- ✅ **shadcn/ui setup and component installation** (12 components)
- ✅ **Root workspace package.json configuration** (monorepo scripts)

### ✅ 1.3 Configuration Files - **COMPLETED**
- ✅ **chat-worker/wrangler.toml**: AI binding, KV namespace, Durable Object class
- ✅ **chat-worker/tsconfig.json**: TypeScript configuration
- ✅ **chat-widget/vite.config.ts**: Build for iframe, path aliases, transparent support
- ✅ **chat-widget/tailwind.config.js**: shadcn/ui compatible with CSS variables
- ✅ **chat-widget/postcss.config.js**: Tailwind + Autoprefixer
- ✅ **chat-widget/tsconfig.json**: Project references structure 
- ✅ **chat-widget/tsconfig.app.json**: App-specific TypeScript config
- ✅ **chat-widget/components.json**: shadcn/ui configuration
- ✅ **chat-widget/lib/utils.ts**: cn() utility for shadcn components
- ✅ **chat-widget/globals.css**: Tailwind + shadcn themes + iframe styles
- ✅ **chat-widget/index.html**: Transparent iframe-ready template
- ✅ **Root package.json**: Workspace configuration with build scripts

## ❌ Phase 2: Embed Script Implementation (Week 1-2) - **NOT STARTED**

### 2.1 Embed Script Core (`chat-embed/src/embed.js`)
**Size Target**: <3kB gzipped

**Key Features**:
- Fixed-position iframe injection
- PostMessage communication
- State management (open/closed)
- Responsive positioning
- Error handling

**Implementation Details**:
```javascript
// Core structure
(function() {
  const config = {
    widgetUrl: 'https://chat.laddershq.com/widget/',
    userId: script.dataset.user,
    projectId: script.dataset.project,
    jwt: script.dataset.sig
  };
  
  // Iframe creation with transparent background
  // PostMessage event handlers
  // Resize observer for responsive behavior
})();
```

### 2.2 Cross-Frame Communication Protocol
**Messages**:
- `INIT`: Send config to widget
- `TOGGLE`: Open/close chat panel
- `RESIZE`: Adapt to content changes
- `ERROR`: Handle authentication/connection errors

## ❌ Phase 3: Chat Widget Development (Week 2-3) - **NOT STARTED**

### 3.1 React Components Architecture (shadcn/ui-based)

**ChatBubble.tsx**:
- 56×56px collapsed state using shadcn Button component
- Smooth expand/collapse animations with Framer Motion
- Pointer events management
- Badge component for new message notifications
- Tooltip component for hover states

**ChatPanel.tsx**:
- 360×480px expanded view using shadcn Card component
- Transparent background support with backdrop-blur
- Drag functionality with shadcn's drag utilities
- Responsive layout using shadcn Container
- ScrollArea component for message overflow

**StreamingMessage.tsx**:
- Token-by-token rendering with Typography components
- Skeleton components for loading states
- Markdown support using react-markdown + shadcn styling
- Copy functionality with shadcn Button + Clipboard API
- Avatar component for user/assistant icons

**Additional shadcn Components to Use**:
- **Input**: Message input field with proper focus management
- **Dialog**: For settings/preferences
- **Separator**: Between messages
- **Alert**: For error states
- **Progress**: For long operations
- **Popover**: For additional controls

### 3.2 WebSocket Integration
**File**: `src/hooks/useWebSocket.ts`
- Connection management with exponential backoff
- Message queuing during disconnection
- Heartbeat/keepalive mechanism
- Error handling and reconnection logic

### 3.3 State Management
**File**: `src/stores/chatStore.ts`
- Message history (last 20 turns as per requirements)
- Connection status
- Authentication state
- UI state (open/closed, dragging)

## 🔄 Phase 4: Cloudflare Worker Backend (Week 3-4) - **PARTIALLY COMPLETED**

### 🔄 4.1 Main Worker (`chat-worker/src/index.ts`) - **BASIC VERSION COMPLETED**
**Endpoints**:
- ✅ `GET /socket/<uuid>`: WebSocket upgrade (basic implementation)
- ✅ `POST /health`: Health check
- ✅ `GET /embed.js`: Serve embed script (placeholder)

**Key Features**:
- ✅ CORS handling
- ❌ **TODO**: JWT verification middleware (deferred)
- ❌ **TODO**: Rate limiting
- ❌ **TODO**: Error logging

### 🔄 4.2 Durable Object Implementation (`src/durable-object.ts`) - **MOCK VERSION COMPLETED**
**Responsibilities**:
- ✅ WebSocket connection management
- ❌ **TODO**: Message persistence (KV storage)
- 🔄 AutoRAG query orchestration (mock implementation)
- ✅ Streaming response handling

**Critical Methods**:
```typescript
class ChatSession {
  ✅ async handleWebSocket(request: Request): Promise<Response>
  🔄 async processMessage(message: string, userId: string, projectId: string) // mock
  🔄 async queryAutoRAG(query: string, projectId: string): Promise<ReadableStream> // mock
  ❌ async persistMessage(message: ChatMessage): Promise<void>
}
```

### ❌ 4.3 AutoRAG Integration (`src/autorag.ts`) - **TODO**
**Implementation**:
```typescript
const response = await env.AI.autorag("ladders-rag").aiSearch({
  query: userMessage,
  filters: { folder: `${userId}/${projectId}/` }, // Updated scope
  stream: true,
  maxResults: 5
});
```

**Security**: Folder-level filtering ensures multi-tenant isolation

---

## 🎯 **CURRENT STATUS & RECOMMENDED NEXT STEPS**

### **✅ What We've Completed:**
1. Basic project structure and directories
2. Package management and dependencies
3. Basic Cloudflare Worker with mock WebSocket handling
4. Durable Object with mock streaming responses
5. TypeScript configuration for worker
6. Comprehensive .gitignore

### **🔄 What's In Progress:**
1. Phase 1 configuration files (Tailwind, PostCSS, workspace setup)
2. Basic Durable Object (needs real AutoRAG integration)

### **🎯 RECOMMENDED NEXT STEPS (Priority Order):**

#### ✅ **Step 1: Complete Phase 1 Setup - COMPLETED!** 
- ✅ Create root workspace package.json
- ✅ Add Tailwind/PostCSS configuration to chat-widget (shadcn compatible) 
- ✅ Add TypeScript configuration to chat-widget
- ✅ Initialize shadcn/ui in chat-widget
- ✅ Install core shadcn components (Button, Card, Input, Badge, etc.)
- ✅ Create basic HTML template with shadcn theme support
- ✅ **BONUS**: Working React app with shadcn demo (55.23kB gzipped - under budget!)

#### ✅ **Step 2: Build Minimal Working React Widget - COMPLETED!** (2 hours)
- ✅ Create basic App.tsx and main.tsx with shadcn theme provider
- ✅ Build ChatBubble component using shadcn Button + Badge + Avatar
- ✅ Build ChatPanel component using shadcn Card + ScrollArea + Separator
- ✅ Create MessageInput using shadcn Input component + Send Button
- ✅ Add comprehensive WebSocket connection hook with retry logic
- ✅ **BONUS**: Zustand state management, streaming support, typing indicators
- ✅ **BUILD SUCCESS**: 65.59kB gzipped (45% under 120kB budget)

#### ✅ **Step 3: Test End-to-End Flow - COMPLETED!** (1 hour)
- ✅ Deploy worker to test environment (wrangler dev on port 8787)
- ✅ Test widget → worker → mock response flow (both services running)
- ✅ Validate streaming works (mock streaming implemented)
- ✅ **BONUS**: KV namespaces created, AI binding configured, WebSocket ready

#### **Step 4: Integrate Real AutoRAG (1 hour)**
- Replace mock AutoRAG with real ladders-rag integration
- Test with actual user/project scope filtering
- Validate multi-tenant isolation

#### **Step 5: Build Embed Script (1 hour)**
- Create minimal iframe embedding script
- Test cross-frame communication
- Validate transparent background

**Total estimated time to working prototype: ~5.5-6.5 hours**

## 🎨 **SHADCN/UI COMPONENT MAPPING**

### **Core Chat Components**:
- **ChatBubble**: `Button` + `Badge` + `Tooltip`
- **ChatPanel**: `Card` + `ScrollArea` + `Separator`
- **Message Input**: `Input` + `Button` (send)
- **Messages**: `Avatar` + `Typography` + `Separator`
- **Loading States**: `Skeleton` + `Progress`
- **Error States**: `Alert` + `AlertDescription`

### **Enhanced Features**:
- **Settings**: `Dialog` + `Switch` + `Slider`
- **File Upload**: `Input[type=file]` + `Progress`
- **Mentions/Commands**: `Popover` + `Command`
- **Theme Toggle**: `Button` + `DropdownMenu`

### **Benefits of shadcn/ui**:
✅ **Accessibility**: ARIA-compliant components out of the box  
✅ **Performance**: Tree-shakeable, optimized bundle size  
✅ **Customization**: CSS variables for easy theming  
✅ **TypeScript**: Full type safety  
✅ **Modern**: Uses Radix primitives + Tailwind  
✅ **Consistency**: Professional design system  

Would you like me to start with **Step 1 (Complete Phase 1 Setup + shadcn/ui initialization)**?

## Phase 5: Security & Authentication (Week 4)

### 5.1 JWT Verification
**File**: `chat-worker/src/auth.ts`
- HMAC-SHA256 signature validation
- Expiration checking
- Rate limiting per user/project
- Malicious request detection

### 5.2 Multi-Tenant Isolation
- AutoRAG folder filtering: `/projectId/...`
- KV namespace separation
- Request validation middleware
- CORS policy enforcement

### 5.3 Iframe Security
- `sandbox="allow-scripts allow-same-origin"`
- CSP headers for XSS protection
- Same-site cookie isolation
- Transparent background security considerations

## Phase 6: Performance Optimization (Week 5)

### 6.1 Bundle Size Optimization
**Targets**:
- Embed script: <3kB gzipped
- Widget bundle: <120kB gzipped (adjusted for shadcn/ui)
- Total: <150kB including dependencies

**Techniques**:
- Tree shaking with Vite (shadcn components are tree-shakeable)
- Code splitting for non-critical features
- Use shadcn's optimized Lucide icons instead of icon fonts
- Minimal Tailwind CSS build (shadcn uses CSS variables efficiently)
- Only import needed shadcn components
- Bundle analyzer to monitor shadcn component impact

### 6.2 Latency Optimization
**Target**: ≤400ms first-token latency

**Strategies**:
- WebSocket pre-warming
- Durable Object location hints
- AutoRAG index warming
- CDN edge caching for static assets

### 6.3 Streaming Optimization
- Server-Sent Events fallback
- Chunked transfer encoding
- Efficient JSON serialization
- Backpressure handling

## Phase 7: Testing & Validation (Week 5-6)

### 7.1 Unit Tests
**Coverage**:
- JWT verification logic
- Multi-tenant filtering
- Message serialization
- WebSocket error handling

### 7.2 Integration Tests
**Scenarios**:
- Full embed → chat → response flow
- Multi-tenant isolation verification
- Authentication failure handling
- WebSocket reconnection

### 7.3 Load Testing
**Tools**: k6, Artillery
**Targets**:
- 100 concurrent WebSocket connections per DO
- Sub-400ms response times under load
- Memory usage monitoring

### 7.4 Security Testing
- JWT tampering attempts
- Cross-tenant data access attempts
- XSS/CSRF protection validation
- Rate limiting effectiveness

## Phase 8: Deployment & Monitoring (Week 6)

### 8.1 Deployment Pipeline
**Worker Deployment**:
```bash
cd chat-worker && wrangler deploy
```

**Widget Deployment**:
```bash
cd chat-widget && npm run build && wrangler pages publish dist
```

**Embed Script**:
```bash
cd chat-embed && npm run build && wrangler pages publish dist
```

### 8.2 Environment Configuration
**Production Settings**:
- AI binding: `AI`
- KV namespace: `CHAT_STORAGE`
- Durable Object class: `ChatSession`
- JWT secret: Environment variable
- AutoRAG namespace: `paintmapper`

### 8.3 Monitoring Setup
- WebSocket connection metrics
- AutoRAG query performance
- Error rate tracking
- Token usage monitoring

## Phase 9: Documentation & Integration (Week 6)

### 9.1 Integration Guide
**For Paintmapper Team**:
- Script tag implementation
- JWT generation example
- Styling customization options
- Troubleshooting guide

### 9.2 API Documentation
- WebSocket message format
- Authentication requirements
- Error codes and handling
- Rate limiting details

## Acceptance Criteria Validation

1. **First-token latency ≤ 400ms**: Load testing with k6
2. **Bundle size < 150kB**: Webpack bundle analyzer
3. **Multi-tenant isolation**: Unit tests with mock data
4. **Chat bubble collapse**: E2E tests with Playwright
5. **100 concurrent sockets**: Load testing with synthetic users

## Risk Mitigation

**Technical Risks**:
- AutoRAG API changes: Implement adapter pattern
- Cloudflare limits: Monitor usage, implement graceful degradation
- WebSocket failures: Implement SSE fallback

**Security Risks**:
- JWT compromise: Short expiration times, refresh mechanism
- XSS attacks: Strict CSP, input sanitization
- Data leakage: Comprehensive multi-tenant testing

## Success Metrics

- **Performance**: 95th percentile first-token latency <400ms
- **Reliability**: 99.9% uptime, <0.1% message loss
- **Security**: Zero cross-tenant data access incidents
- **Adoption**: Easy integration with single script tag
- **Scalability**: Support for 1000+ concurrent users per project

This plan provides a comprehensive roadmap for implementing the multi-tenant chat assistant while meeting all specified requirements and acceptance criteria. 