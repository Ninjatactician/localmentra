# AGENTS.md - MentraOS Notes Application

## Build, Lint, and Test Commands

### Build Commands
- `bun install` - Install all project dependencies
- `bun run src/main.ts` - Run the main application
- `bun --watch src/main.ts` - Run the application in watch mode for development

### Lint Commands
- `bun run lint` - Run TypeScript linter
- `bun run format` - Format code using Prettier

### Test Commands
- `bun run test` - Run all tests (currently no specific test scripts defined)
- `bun run test-langchain.ts` - Run LangChain specific tests
- `bun run test-webhook.ts` - Run webhook functionality tests
- `bun run test-combined.ts` - Run combined application tests
- `bun run test-tts-endpoint.ts` - Run TTS endpoint tests

To run a single test:
- `bun test-langchain.ts` - Run specific LangChain test file
- `bun test-webhook.ts` - Run specific webhook test file
- `bun test-combined.ts` - Run specific combined app test file

## Code Style Guidelines

### Imports
- All imports should be organized at the top of the file
- Use absolute imports for project modules
- Group imports by type (external, internal, types)
- Follow alphabetical order within groups

### Formatting
- Use TypeScript with ESM module syntax
- Follow 2-space indentation
- Use single quotes for strings
- Add trailing commas in arrays and objects
- Format code with Prettier using default settings
- Use semicolons for statements

### Types
- Use TypeScript for all code
- Define explicit types for all function parameters and return values
- Use interfaces for object shapes
- Use type aliases for complex types
- Prefer readonly properties when possible
- Use strict null checking

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_CASE for constants
- Use descriptive names for variables and functions
- Prefix private members with underscore (_)
- Use meaningful names for test files

### Error Handling
- Always implement try/catch blocks for async operations
- Handle all possible errors gracefully
- Provide informative error messages
- Log errors appropriately using the logger module
- Use custom error classes for specific error types
- Don't ignore errors or exceptions

### Documentation
- Add JSDoc comments for all exported functions
- Document complex logic and algorithms
- Include parameter descriptions and return types
- Add file headers with brief descriptions

### File Structure
- All source code in `src/` directory
- Test files in root directory with `test-` prefix
- Main entry point in `src/main.ts`
- Combined application logic in `src/combined-app.ts`
- Logging utilities in `src/logger.ts`

### Security Considerations
- Never commit sensitive information (API keys, tokens)
- All environment variables should be loaded from `.env` file
- Validate inputs to prevent injection attacks
- Use HTTPS for all external API calls

### Best Practices
- Use modern TypeScript features
- Keep functions small and focused
- Avoid global variables
- Prefer immutability when possible
- Use proper async/await patterns
- Handle promises properly with error handling
- Follow DRY (Don't Repeat Yourself) principle
- Use meaningful commit messages
- Keep code clean and well-organized