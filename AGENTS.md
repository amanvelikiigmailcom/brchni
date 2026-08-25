# AGENTS.md

## Build/Test/Lint Commands
- **Build:** `npm run build` (tsc + vite)
- **Typecheck:** `npm run typecheck`
- **Lint:** `npm run lint`
- **Test all:** `npm run test`
- **Test single file:** `npx vitest run path/to/file.test.ts`
- **Test watch:** `npm run test:watch`
- **Dev servers:** `npm run dev` (frontend), `npm run dev:worker` (backend)

## Code Style
- **No `any` type** - find or create proper types
- **Types:** Frontend imports from `@/api-types` (single source of truth)
- **Formatting:** Prettier with single quotes, tabs (see package.json)
- **Naming:** React components `PascalCase.tsx`, utilities/hooks `kebab-case.ts`, backend services `PascalCase.ts`
- **Comments:** Explain purpose, not narration. No verbose AI-like comments. No emojis.
- **DRY:** Search for existing code before creating new. Never copy-paste.
- **Imports:** Frontend APIs in `src/lib/api-client.ts`, types in `src/api-types.ts`

## Error Handling
- Backend services return `null`/`boolean` on error, never throw in RPC methods
- Use existing error classes from `worker/utils/ErrorHandling.ts`

## Key Patterns
- **Add API endpoint:** types in `src/api-types.ts` -> `src/lib/api-client.ts` -> service in `worker/database/services/` -> controller in `worker/api/controllers/` -> route in `worker/api/routes/`
- **Add LLM tool:** create in `worker/agents/tools/toolkit/` -> register in `worker/agents/tools/customTools.ts`

## Архитектура проекта и стек технологий (RU)

Этот проект (**Cloudflare VibeSDK**) представляет собой AI-платформу для генерации full-stack веб-приложений. Он работает полностью в экосистеме **Cloudflare**, поэтому использование сторонних сервисов вроде Appwrite или Firebase не требуется.

### Технологический стек:
*   **Фронтенд:** React 19, TypeScript, Vite, TailwindCSS, React Router v7. Находится в папке `src/`.
*   **Бэкенд:** Cloudflare Workers. Основной код сервера. Находится в папке `worker/`.
*   **База данных:** Cloudflare D1 (Serverless SQLite база данных). Взаимодействие происходит через Drizzle ORM (`worker/database/`).
*   **Состояние и потоки (State & Real-time):** Cloudflare Durable Objects обеспечивают изоляцию и сохранение состояния каждого чата-агента. PartySocket (поверх WebSockets) используется для передачи данных клиенту в реальном времени без перезагрузки страниц.
*   **Песочница для кода:** Cloudflare Containers используются для изоляции и безопасного запуска сгенерированного пользователем кода. Управление находится в `container/`.
*   **AI Интеграции:** Система использует Cloudflare AI Gateway для подключения к LLM (OpenAI, Anthropic, Google Gemini).

### Структура директорий:
*   `src/`: Исходный код React фронтенда.
*   `worker/`: Исходный код Cloudflare Worker бэкенда (API, агенты, сервисы).
*   `shared/`: Общие типы данных, используемые как на фронтенде, так и на бэкенде.
*   `container/`: Скрипты и типы для окружения песочницы (запуск кода пользователей).
*   `sdk/`: TypeScript SDK для программного доступа к платформе VibeSDK.
*   `migrations/`: SQL миграции для базы данных D1.
