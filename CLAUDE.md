# CLAUDE.md

Этот файл предоставляет инструкции Claude Code при работе с кодом в этом репозитории.

## Стиль общения
- Профессионально, кратко и по существу
- НЕ используй эмодзи в код-ревью, чейнджлогах и любом генерируемом контенте. Разрешены профессиональные визуальные индикаторы или markdown-форматирование вместо эмодзи.
- Фокус на содержании, а не на форме
- Используй чёткий технический язык

## Обзор проекта
vibesdk — AI-платформа для генерации full-stack приложений, построенная на инфраструктуре Cloudflare.

**Технологический стек:**
- Frontend: React 19, TypeScript, Vite, TailwindCSS, React Router v7
- Backend: Cloudflare Workers, Durable Objects, D1 (SQLite)
- AI/LLM: OpenAI, Anthropic, Google AI Studio (Gemini)
- WebSocket: PartySocket для коммуникации в реальном времени
- Sandbox: Кастомный контейнерный сервис с CLI-инструментами
- Git: isomorphic-git с SQLite filesystem

**Структура проекта**

**Frontend (`/src`):**
- React-приложение с 80+ компонентами
- Единый источник истины для типов: `src/api-types.ts`
- Все API-вызовы в `src/lib/api-client.ts`
- Кастомные хуки в `src/hooks/`
- Компоненты маршрутов в `src/routes/`

**Backend (`/worker`):**
- Точка входа: `worker/index.ts` (7860 строк)
- Система агентов: `worker/agents/` (88 файлов)
  - Ядро: SimpleCodeGeneratorAgent (Durable Object, 2800+ строк)
  - Операции: PhaseGeneration, PhaseImplementation, UserConversationProcessor
  - Инструменты: tools для LLM (read-files, run-analysis, regenerate-file и др.)
  - Git: isomorphic-git с SQLite filesystem
- База данных: `worker/database/` (Drizzle ORM, D1)
- Сервисы: `worker/services/` (sandbox, code-fixer, oauth, rate-limit, secrets)
- API: `worker/api/` (routes, controllers, handlers)

**Прочее:**
- `/shared` — общие типы между frontend/backend (не worker-специфичные типы, также импортируемые на frontend)
- `/migrations` — миграции базы данных D1
- `/container` — инструментарий sandbox-контейнера
- `/templates` — шаблоны скаффолдинга проектов

**Основная архитектура:**
- Каждая сессия чата — отдельный экземпляр Durable Object (SimpleCodeGeneratorAgent)
- Конечный автомат управляет генерацией кода (IDLE → PHASE_GENERATING → PHASE_IMPLEMENTING → REVIEWING)
- История git хранится в SQLite, поддержка полного протокола клонирования
- WebSocket для потоковой передачи в реальном времени и синхронизации состояния

## Ключевые архитектурные паттерны

**Паттерн Durable Objects:**
- Каждая сессия чата = экземпляр Durable Object
- Персистентное состояние в SQLite (blueprint, файлы, история)
- Эфемерное состояние в памяти (abort controllers, активные промисы)
- Однопоточный на экземпляр

**Конечный автомат:**
IDLE → PHASE_GENERATING → PHASE_IMPLEMENTING → REVIEWING → IDLE

**CodeGenState (состояние агента):**
- Идентификация проекта: blueprint, projectName, templateName
- Управление файлами: generatedFilesMap (отслеживает все файлы)
- Отслеживание фаз: generatedPhases, currentPhase
- Конечный автомат: currentDevState, shouldBeGenerating
- Sandbox: sandboxInstanceId, commandsHistory
- Диалог: conversationMessages, pendingUserInputs

**WebSocket-коммуникация:**
- Потоковая передача в реальном времени через PartySocket
- Восстановление состояния при переподключении (сообщение agent_connected)
- Дедупликация сообщений (выполнение инструментов вызывает дубли)

**Система Git:**
- isomorphic-git с адаптером SQLite filesystem
- Полная история коммитов в хранилище Durable Object
- Поддержка протокола git clone (rebase на шаблоне)
- FileManager автосинхронизируется из git через коллбэки

## Типовые задачи разработки

**Изменить LLM-модель для операции:**
Редактировать `/worker/agents/inferutils/config.ts` → объект `AGENT_CONFIG`

**Изменить поведение агента диалога:**
Редактировать `/worker/agents/operations/UserConversationProcessor.ts` (системный промпт, строка 50)

**Добавить новое WebSocket-сообщение:**
1. Добавить тип в `worker/api/websocketTypes.ts`
2. Обработать в `worker/agents/core/websocket.ts`
3. Обработать в `src/routes/chat/utils/handle-websocket-message.ts`

**Добавить новый LLM-инструмент:**
1. Создать `/worker/agents/tools/toolkit/my-tool.ts`
2. Экспортировать функцию `createMyTool(agent, logger)`
3. Импортировать в `/worker/agents/tools/customTools.ts`
4. Добавить в `buildTools()` (диалог) или `buildDebugTools()` (дебаггер)

**Добавить API-эндпоинт:**
1. Определить типы в `src/api-types.ts`
2. Добавить в `src/lib/api-client.ts`
3. Создать сервис в `worker/database/services/`
4. Создать контроллер в `worker/api/controllers/`
5. Добавить маршрут в `worker/api/routes/`
6. Зарегистрировать в `worker/api/routes/index.ts`

## Важный контекст

**Deep Debugger:**
- Расположение: `/worker/agents/assistants/codeDebugger.ts`
- Модель: Gemini 2.5 Pro (reasoning_effort: high, 32k токенов)
- Приоритет диагностики: run_analysis → get_runtime_errors → get_logs
- Может исправлять несколько файлов параллельно (regenerate_file)
- Не может работать во время генерации кода (проверяется через isCodeGenerating())

**Хранилище секретов пользователя (Durable Object):**
- Расположение: `/worker/services/secrets/`
- Назначение: Зашифрованное хранилище API-ключей пользователей с ротацией ключей
- Архитектура: Один DO на пользователя, шифрование XChaCha20-Poly1305, SQLite-бэкенд
- Деривация ключей: MEK → UMK → DEK (иерархический PBKDF2)
- Возможности: Ротация ключей, мягкое удаление, отслеживание доступа, поддержка истечения срока
- RPC-методы: Возвращают `null`/`boolean` при ошибке, никогда не бросают исключения
- Тестирование: 90 комплексных тестов в `/test/worker/services/secrets/`

**Система Git:**
- Класс GitVersionControl оборачивает isomorphic-git
- Ключевые методы: commit(), reset(), log(), show()
- FileManager автосинхронизируется через регистрацию коллбэков
- Контроль доступа: диалоги пользователей получают безопасные команды, дебаггер — полный доступ
- Адаптер SQLite filesystem (`/worker/agents/git/fs-adapter.ts`)

**Паттерн Abort Controller:**
- `getOrCreateAbortController()` переиспользует контроллер для вложенных операций
- Очищается после завершения операций верхнего уровня
- Общий для родительских и вложенных вызовов инструментов
- Отмена пользователем отменяет всё дерево операций

**Дедупликация сообщений:**
- Выполнение инструментов вызывает дублирование AI-сообщений
- Бэкенд пропускает избыточные LLM-вызовы (пустые результаты инструментов)
- Утилиты фронтенда дедуплицируют живые и восстановленные сообщения
- Системный промпт учит LLM не повторяться

## Основные правила (неоспоримые)

**1. Строгая типобезопасность**
- НИКОГДА не использовать тип `any`
- Frontend импортирует типы из `@/api-types` (единый источник истины)
- Искать существующие типы в кодовой базе перед созданием новых

**2. Принцип DRY**
- Искать похожую функциональность перед реализацией
- Выносить переиспользуемые утилиты, хуки и компоненты
- Никогда не копировать-вставлять код — рефакторить в общие функции

**3. Следовать существующим паттернам**
- Frontend API: всё в `/src/lib/api-client.ts`
- Backend-маршруты: контроллеры в `worker/api/controllers/`, маршруты в `worker/api/routes/`
- Сервисы базы данных: в `worker/database/services/`
- Типы: общие в `shared/types/`, API в `src/api-types.ts`

**4. Качество кода**
- Только production-ready код — никаких TODO или заглушек
- Никаких хаков и костылей
- Комментарии объясняют назначение, а не пересказывают код
- Никаких многословных AI-подобных комментариев

**5. Именование файлов**
- React-компоненты: PascalCase.tsx
- Утилиты/Хуки: kebab-case.ts
- Backend-сервисы: PascalCase.ts

## Распространённые ошибки

**Не делай:**
- Использовать тип `any` (найди или создай правильные типы)
- Копировать-вставлять код (выноси в утилиты)
- Использовать Vite env-переменные в коде Worker
- Забывать обновлять типы при изменении API
- Создавать новые реализации без поиска существующих
- Использовать эмодзи в коде или комментариях
- Писать многословные AI-подобные комментарии

**Делай:**
- Тщательно искать по кодовой базе перед написанием нового кода
- Последовательно следовать существующим паттернам
- Держать комментарии краткими и содержательными
- Писать production-ready код
- Тщательно тестировать перед отправкой
