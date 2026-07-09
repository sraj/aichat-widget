# AI Chat Widget Documentation

This folder contains detailed technical documentation for the AI Chat Widget project, organized into three comprehensive guides.

## 🚀 Getting Started

If you just need the setup and integration flow, start with:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - monorepo structure, widget packages, and integration patterns
- [SECURITY.md](./SECURITY.md) - security and accessibility guidance
- [PERFORMANCE.md](./PERFORMANCE.md) - bundle size, analysis, and optimization

## 📚 Documentation Index

### **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture & Design
Complete architectural overview covering:
- Turborepo monorepo structure and organization
- Component architecture and separation of concerns
- Shadow DOM implementation details
- Technology stack and design decisions
- Script loading strategies (defer, async, ESM)
- Integration patterns and best practices
- Development workflow

### **[SECURITY.md](./SECURITY.md)** - Security & Accessibility
Comprehensive security and accessibility guide covering:
- OWASP Top 10 2021 security implementations
- XSS prevention and input sanitization
- Focus trap implementation (WCAG 2.1 Level AA)
- ARIA attributes and screen reader support
- Security headers and CSP configuration
- Privacy and data protection
- Best practices and checklists

### **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance & Optimization
Performance optimization and bundle analysis covering:
- Current bundle stats (31.75 KB gzipped UMD)
- Bundle analysis tools and techniques
- Size tracking and CI integration
- Build optimization strategies
- Runtime performance best practices
- Network optimization
- Monitoring and troubleshooting

## 🚀 Quick Links

- [Main README](../README.md) - Getting started and quick setup
- [Widget Package README](../packages/widget/README.md) - Widget-specific documentation

## 📖 What's Covered

This documentation suite provides everything you need to:
- ✅ Understand the monorepo structure and architecture
- ✅ Implement secure, production-ready integrations
- ✅ Build accessible widgets (WCAG 2.1 compliant)
- ✅ Optimize bundle size and performance
- ✅ Configure dual protocol support (SSE/WebSocket)
- ✅ Deploy with proper security headers
- ✅ Monitor and track performance metrics
- ✅ Configure multi-protocol support (EventSource SSE / fetch-SSE / WebSocket)
- ✅ Follow industry best practices
