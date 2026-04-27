/// <mls fileReference="_102032_/l2/agents/agentTextTranslation.ts" enhancement="_blank"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { TranslationExtractItem } from '/_102032_/l2/agents/agentTextExtractor.js'

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentTextTranslation",
        agentProject: 102032,
        agentFolder: "",
        agentDescription: "Agent for translation html",
        visibility: "public",
        beforePromptImplicit,
        afterPromptStep
    };
}

async function beforePromptImplicit(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

    if (!userPrompt || userPrompt.length < 5) throw new Error('invalid prompt');

    const data: IUserPrompt = JSON.parse(userPrompt);
    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: [{
                type: "system",
                content: system1,
            }, {
                type: "human",
                content: context.message.content
            }],
            taskTitle: `Translate texts`,
            threadId: context.message.threadId,
            userMessage: context.message.content,
            longTermMemory: {
                targetFolder: data.targetFolder,
                project: data.project.toString(),
                fileReference: data.fileReference,
                originFolder: data.originFolder
            }
        }
    };
    return [addMessageAI];

}

async function afterPromptStep(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {


    if (!agent || !context || !step) throw new Error(`[afterPromptStep] invalid params, agent:${!!agent}, context:${!!context}, step:${!!step}`);

    const payload = (step.interaction?.payload?.[0]);
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)
    let status: mls.msg.AIStepStatus = 'completed';
    let intents: mls.msg.AgentIntent[] = [];

    const output = payload.result;
    console.log("=== Output ");
    console.info(output);

    const updateStatus: mls.msg.AgentIntentUpdateStatus = {
        type: 'update-status',
        hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: parentStep.stepId,
        stepId: step.stepId,
        status
    };

    if (!context.task?.iaCompressed?.longMemory) throw new Error(`[afterPromptStep] invalid long memory`);
    const { targetFolder, project, fileReference } = context.task?.iaCompressed?.longMemory as Record<string, string>;
    if (!targetFolder || !project || !fileReference) throw new Error(`[afterPromptStep] invalid long memory`);

    const file = mls.stor.convertFileReferenceToFile(fileReference);
    const html = await getSource(file);

    const data = {
        "translations": output,
        "html": html,
    }

    const newStep: mls.msg.AgentIntentAddStep = {
        type: "add-step",
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: 1,
        step:
        {
            type: 'agent',
            stepId: 0,
            interaction: null,
            status: 'waiting_human_input',
            nextSteps: [],
            agentName: "agentTranslationApplier",
            prompt: JSON.stringify(data),
            rags: null,
        }
    };

    return [newStep, updateStatus];

}

async function getSource(fileBase: mls.stor.IFileInfoBase): Promise<string> {
    // change first line to new pattern
    const file = await mls.stor.getFiles({ ...fileBase, loadContent: false })
    if (!file) throw new Error(`[beforePromptStep] invalid args, file dont exists`)
    const source = (await file.html?.getContent()) as string | null;
    if (typeof source !== 'string' || !source) throw new Error(`[beforePromptAtomic] invalid source`)
    const array = source.split("\n");
    if (!array || array.length < 2) throw new Error('[beforePrompt] invalid source, no lines');
    return source;
}

const system1 = `
<!-- modelType: codeflash -->
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->

You are a translation agent.

Your task is to translate texts from a source language to a target language.

Input:
- sourceLanguage
- targetLanguage
- a list of texts extracted from HTML

Rules:

1. Only translate items where "translatable" is true.
2. Preserve the meaning and tone of the original text.
3. Keep the translation natural and suitable for UI interfaces.
4. Do not translate brand names or technical identifiers.
5. Preserve placeholders such as:
   - {{name}}
   - {value}
   - \${price}

Example:
"Hello {{name}}" → "Olá {{name}}"


## Output format
You must return the object strictly as JSON, no spaces, no indent, minified

export type Output = {
    type: "flexible";
    result: TranslationItem[];
};

export interface TranslationItem {
    id: string,
    tag: string,
    original: string,
    translation: string,
}

`

export type Output = {
    type: "flexible";
    result: TranslationItem[];
};

export interface TranslationItem {
    id: string,
    tag: string,
    original: string,
    translation: string,
}

interface IUserPrompt {
    sourceLanguage: string,
    targetLanguage: string,
    targetFolder: string,
    originFolder: string,
    fileReference: string,
    project: number,
    texts: TranslationExtractItem[],
}
