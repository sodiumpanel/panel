# Contributing to Sodium Panel

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

Be respectful and constructive. We welcome contributors of all experience levels.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/panel.git
   cd panel
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the frontend:
   ```bash
   npm run build
   ```
5. Start the server:
   ```bash
   npm start
   ```
   The setup wizard will appear on first run.

6. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

## Development Workflow

### Running in Development Mode

```bash
# Terminal 1: Watch frontend for changes
npm run watch

# Terminal 2: Start the server
npm start
```

### Project Structure

```
sodium/
├── src/
│   ├── api/          # Backend API routes
│   ├── frontend/     # Frontend assets and scripts
│   └── utils/        # Shared utilities
├── data/             # Runtime data (gitignored)
├── docs/             # Documentation
├── eggs/             # Server templates
└── tests/            # Test files
```

### Configuration

All configuration is stored in `data/config.json`, created automatically by the setup wizard.

## Making Changes

### Before You Start

- Check existing [issues](https://github.com/sodiumpanel/panel/issues) to avoid duplicates
- For large changes, open an issue first to discuss the approach

### Code Style

- Follow the existing code patterns
- Use meaningful variable and function names
- Keep functions small and focused
- No TypeScript - this project uses plain JavaScript

### Commit Messages

Use clear, descriptive commit messages:

```
Good:  Add user pagination to admin panel
Good:  Fix memory leak in WebSocket handler
Bad:   Fixed stuff
Bad:   Update
```

## Pull Requests

### Checklist

- [ ] Code follows existing style
- [ ] Changes are focused (one feature/fix per PR)
- [ ] Tested locally
- [ ] Documentation updated if needed

### Process

1. Push your branch to your fork
2. Open a pull request against `main`
3. Fill in the PR template
4. Wait for review

### After Review

- Address feedback promptly
- Push additional commits to the same branch
- Avoid force-pushing after review has started

## Reporting Bugs

Open an [issue](https://github.com/sodiumpanel/panel/issues/new) with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS

## Feature Requests

Open an [issue](https://github.com/sodiumpanel/panel/issues/new) with:

- Description of the feature
- Use case / why it's needed
- Any implementation ideas (optional)

## Questions?

- Open an [issue](https://github.com/sodiumpanel/panel/issues) for questions
- Check existing issues and [documentation](docs/) first

---

Thank you for contributing!
