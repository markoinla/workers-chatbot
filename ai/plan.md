# Workers-AI Chat Assistant Implementation Plan

## Project Overview
Transform the open-source WorkersAI demo into a fully-edge, multi-tenant chat assistant that floats above Paintmapper's UI and can be embedded with a single script tag.

## Architecture Decision: WebSocket-Based Real-Time Chat

**Chosen Solution**: New WebSocket-based architecture alongside existing structure
- **Rationale**: Chat applications require real-time bidirectional communication, WebSockets are optimal for token streaming, and Cloudflare Durable Objects are designed for this pattern
- **Benefits**: Clean separation, follows Cloudflare best practices, achieves size/latency requirements
- **Trade-offs**: New codebase separate from existing protobuf structure, but maintains focus and simplicity

## Phase 1: Core Infrastructure Setup (Week 1)

### 1.1 Project Structure Setup
```
workers-chatbot/
├── chat-embed/
│   ├── src/
│   │   └── embed.js              # Vanilla JS embed script
│   ├── dist/                     # Built embed script
│   └── package.json
├── chat-widget/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatBubble.tsx    # Collapsible chat button
│   │   │   ├── ChatPanel.tsx     # Main chat interface
│   │   │   ├── MessageList.tsx   # Message rendering
│   │   │   └── StreamingMessage.tsx # Token-by-token display
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts   # WebSocket management
│   │   │   ├── useAuth.ts        # JWT validation
│   │   │   └── useChat.ts        # Chat state management
│   │   ├── types/
│   │   │   └── chat.ts           # TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── postMessage.ts    # Cross-frame communication
│   │   │   └── jwt.ts            # JWT utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── chat-worker/
│   ├── src/
│   │   ├── index.ts              # Main Worker entry
│   │   ├── websocket.ts          # WebSocket handler
│   │   ├── durable-object.ts     # Chat session DO
│   │   ├── auth.ts               # JWT verification
│   │   ├── autorag.ts            # AutoRAG integration
│   │   └── types.ts              # Shared types
│   ├── wrangler.toml
│   └── package.json
└── shared/
    └── types/
        └── messages.ts           # Cross-component message types
```

### 1.2 Development Environment Setup
- **Tools**: Node.js 18+, Wrangler CLI, Vite, TypeScript
- **Commands to run**:
  ```bash
  npm create cloudflare@latest chat-worker -- --type=worker-typescript
  npm create vite@latest chat-widget -- --template=react-ts
  ```

### 1.3 Configuration Files
- **chat-worker/wrangler.toml**: AI binding, KV namespace, Durable Object class
- **chat-widget/vite.config.ts**: Build for iframe, transparent background support
- **Root package.json**: Workspace configuration for monorepo structure

## Phase 2: Embed Script Implementation (Week 1-2)

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

## Phase 3: Chat Widget Development (Week 2-3)

### 3.1 React Components Architecture

**ChatBubble.tsx**:
- 56×56px collapsed state
- Smooth expand/collapse animations
- Pointer events management
- Notification badges for new messages

**ChatPanel.tsx**:
- 360×480px expanded view
- Transparent background support
- Drag functionality
- Responsive layout

**StreamingMessage.tsx**:
- Token-by-token rendering
- Typing indicators
- Markdown support
- Copy functionality

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

## Phase 4: Cloudflare Worker Backend (Week 3-4)

### 4.1 Main Worker (`chat-worker/src/index.ts`)
**Endpoints**:
- `GET /socket/<uuid>`: WebSocket upgrade
- `POST /health`: Health check
- `GET /embed.js`: Serve embed script

**Key Features**:
- JWT verification middleware
- Rate limiting
- CORS handling
- Error logging

### 4.2 Durable Object Implementation (`src/durable-object.ts`)
**Responsibilities**:
- WebSocket connection management
- Message persistence (KV storage)
- AutoRAG query orchestration
- Streaming response handling

**Critical Methods**:
```typescript
class ChatSession {
  async handleWebSocket(request: Request): Promise<Response>
  async processMessage(message: string, userId: string, projectId: string)
  async queryAutoRAG(query: string, projectId: string): Promise<ReadableStream>
  async persistMessage(message: ChatMessage): Promise<void>
}
```

### 4.3 AutoRAG Integration (`src/autorag.ts`)
**Implementation**:
```typescript
const response = await env.AI.autorag("paintmapper").aiSearch({
  query: userMessage,
  filters: { folder: `${projectId}/` },
  stream: true,
  maxResults: 5
});
```

**Security**: Folder-level filtering ensures multi-tenant isolation

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
- Widget bundle: <100kB gzipped
- Total: <150kB including dependencies

**Techniques**:
- Tree shaking with Vite
- Code splitting for non-critical features
- SVG icons instead of icon fonts
- Minimal Tailwind CSS build

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