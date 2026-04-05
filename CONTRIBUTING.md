# Contributing to ChessLens

Thank you for your interest in contributing to ChessLens! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16 (or Docker)
- Redis 7 (or Docker)
- Stockfish binary (or Docker)

### Getting Started

1. **Fork and clone** the repository
2. **Copy environment config:** `cp .env.example .env`
3. **Start infrastructure:** `docker compose up postgres redis -d`
4. **Install frontend deps:** `cd apps/web && npm install`
5. **Run migrations:** `npx prisma migrate dev`
6. **Start frontend:** `npm run dev`
7. **Install Python deps:** `cd apps/analysis && pip install -e ".[dev]"`
8. **Start analysis service:** `uvicorn main:app --reload`

### Running Tests

```bash
# Frontend
cd apps/web
npm test

# Analysis service
cd apps/analysis
pytest
```

### Code Style

- **TypeScript/JavaScript:** ESLint + Prettier (configured in the project)
- **Python:** Ruff (configured in pyproject.toml)

## Pull Request Process

1. Update the README.md if you've changed the API or added features
2. Add tests for new functionality
3. Ensure all tests pass
4. Update types in `packages/shared/` if you've changed data structures
5. Keep PRs focused — one feature or fix per PR

## Areas for Contribution

- **Engine analysis improvements** — Better move classification, accuracy formulas
- **Opening database** — ECO code mappings and opening name data
- **UI/UX** — Board themes, piece sets, accessibility improvements
- **Mobile** — Responsive design improvements
- **Documentation** — API docs, user guides, tutorials
- **Testing** — Unit tests, integration tests, E2E tests
- **i18n** — Translation support

## Code of Conduct

Be respectful, collaborative, and constructive. We're all here to make chess analysis better.
