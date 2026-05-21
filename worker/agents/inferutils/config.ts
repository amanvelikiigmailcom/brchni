import {
    AgentActionKey,
    AgentConfig,
    AgentConstraintConfig,
    AIModels,
} from "./config.types";

/**
 * All agent operations run on a single hidden model: Kimi K2.5 (api.moonshot.ai).
 *
 * Kimi K2.5 only accepts temperature 1. Reasoning depth is selected per operation
 * through reasoning_effort, which core.ts maps onto Moonshot's enable_thinking flag:
 *   - reasoning_effort 'high' -> thinking mode     (deeper reasoning, heavy work)
 *   - reasoning_effort 'low'  -> non-thinking mode (faster, lightweight operations)
 * reasoning_effort itself is never sent to Moonshot (the model is marked nonReasoning).
 */
const KIMI = AIModels.KIMI_K2_5;
const TEMPERATURE = 1;

export const AGENT_CONFIG: AgentConfig = {
    templateSelection: {
        name: KIMI,
        reasoning_effort: 'low',
        max_tokens: 4000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    blueprint: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 64000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    projectSetup: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 48000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    phaseGeneration: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 48000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    firstPhaseImplementation: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 48000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    phaseImplementation: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 48000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    fileRegeneration: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 32000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    realtimeCodeFixer: {
        name: KIMI,
        reasoning_effort: 'low',
        max_tokens: 32000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    conversationalResponse: {
        name: KIMI,
        reasoning_effort: 'low',
        max_tokens: 8000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    deepDebugger: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 16000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    agenticProjectBuilder: {
        name: KIMI,
        reasoning_effort: 'high',
        max_tokens: 16000,
        temperature: TEMPERATURE,
        fallbackModel: KIMI,
    },
    // Optional enhancement passes - kept disabled.
    screenshotAnalysis: {
        name: AIModels.DISABLED,
        reasoning_effort: 'low',
        max_tokens: 8000,
        temperature: TEMPERATURE,
        fallbackModel: AIModels.DISABLED,
    },
    fastCodeFixer: {
        name: AIModels.DISABLED,
        reasoning_effort: 'low',
        max_tokens: 64000,
        temperature: TEMPERATURE,
        fallbackModel: AIModels.DISABLED,
    },
};

/**
 * Per-operation model constraints. The platform runs on a single fixed model
 * with no model-selection UI, so there are no constraints to enforce.
 */
export const AGENT_CONSTRAINTS: Map<AgentActionKey, AgentConstraintConfig> = new Map();
