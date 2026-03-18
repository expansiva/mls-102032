/// <mls fileReference="_102032_/l2/agents/agentTranslationApplier.ts" enhancement="_blank"/>

import { IAgentAsync, IAgentMeta } from '/_100554_/l2/aiAgentBase.js';
import { replaceTripleslashAndTag } from '/_102027_/l2/libStor.js';

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentTranslationApplier",
        agentProject: 102032,
        agentFolder: "",
        agentDescription: "Agent for apply translation html",
        visibility: "public",
        beforePromptImplicit,
        beforePromptStep,
        afterPromptStep
    };
}

async function beforePromptImplicit(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

    if (!userPrompt || userPrompt.length < 5) throw new Error('invalid prompt');

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
        }
    };
    return [addMessageAI];

}

async function beforePromptStep(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
    args?: string
): Promise<mls.msg.AgentIntent[]> {
    if (!args) throw new Error(`[beforePromptStep] args invalid`)

    const continueParallel: mls.msg.AgentIntentPromptReady = {
        type: "prompt_ready",
        args,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        hookSequential,
        parentStepId: parentStep.stepId,
        humanPrompt: args || '',
        systemPrompt: system1

    }
    return [continueParallel];

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

    if (!context.task?.iaCompressed?.longMemory) throw new Error(`[afterPromptStep] invalid long memory`);
    const { targetFolder, project, fileReference, originFolder } = context.task?.iaCompressed?.longMemory as Record<string, string>;
    if (!targetFolder || !project || !fileReference || !originFolder) throw new Error(`[afterPromptStep] invalid long memory`);

    console.log("=== Output ");
    console.info({ html: decodeHtml(output), targetFolder, project, fileReference, originFolder });

    await createFiles(decodeHtml(output), targetFolder, +project, fileReference, originFolder)

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

    return [updateStatus];

}

async function createFiles(html: string, targetFolder: string, project: number, fileReference: string, originFolder: string) {
    const files = Object.values(mls.stor.files).filter((file) => file.folder.startsWith(originFolder) && file.project === project);
    for (let file of files) {
        const storFileNew = await duplicateFile(file, originFolder, targetFolder);
        const ref = mls.stor.convertFileToFileReference(file);
        const refNew = mls.stor.convertFileToFileReference(storFileNew);

        if (ref === fileReference.replace('.ts', '.html')) {
            // const storFileNew = await duplicateFile(file, targetFolder);
            // const refNew = mls.stor.convertFileToFileReference(storFileNew);
            console.info(`===update file :${refNew}`)
            await updateHtml(storFileNew, html);
        }
    }
}


async function duplicateFile(storFile: mls.stor.IFileInfo, oldFolder: string, newFolder: string): Promise<mls.stor.IFileInfo> {

    let _folder = storFile.folder.replace(oldFolder, newFolder);

    const keyToNewFile = mls.stor.getKeyToFile({ ...storFile, folder: _folder });
    const storFileDist = mls.stor.files[keyToNewFile];
    if (storFileDist) return storFileDist;

    console.info(`===duplicate file :${keyToNewFile}`)


    let source = await storFile.getContent();
    if (!source) throw new Error('[migrateFile] Impossible rename this file:' + storFile.shortName);
    if (!_folder) _folder = storFile.folder;

    if (storFile.level === 2 && typeof source === 'string') {
        source = replaceTripleslashAndTag(storFile, storFile.project, storFile.shortName, _folder, source);
    }

    const file = await createStorFile({
        project: storFile.project,
        shortName: storFile.shortName,
        level: storFile.level,
        folder: _folder,
        content: source,
        extension: storFile.extension,
        versionRef: '0'
    });

    return file;
}

async function updateHtml(storFile: mls.stor.IFileInfo, newHtml: string) {
    const modelDefs = await storFile.getOrCreateModel();
    modelDefs.model.setValue(newHtml);
}

async function createStorFile(params: { project: number, shortName: string, level: number, folder: string, content: string | Blob, extension: string, versionRef: string }): Promise<mls.stor.IFileInfo> {
    const file = await mls.stor.addOrUpdateFile(params);
    if (!file) throw new Error('Invalid storFile');
    file.status = 'new';
    const fileInfo: mls.stor.IFileInfoValue = {
        content: params.content,
        contentType: typeof params.content === 'string' ? 'string' : 'blob',
    };
    file.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(file, fileInfo);
    file.inLocalStorage = true;
    return file;
}

function decodeHtml(html: string) {
    return html
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
}

const system1 = `
<!-- modelType: codeflash -->

You are an agent responsible for applying translations to HTML.

Your task is to receive:
1. The original HTML
2. A list of translated texts

You must replace the original texts with their translations in the HTML.

IMPORTANT RULES:

- NEVER modify the HTML structure.
- NEVER change or remove tags.
- NEVER modify attributes.
- ONLY replace text nodes.
- Preserve whitespace when possible.
- If a text appears multiple times, replace all occurrences.
- If a translation is missing, keep the original text.
- Do NOT translate anything yourself. Only apply provided translations.

Examples:

Original HTML:
<div><h1>Welcome</h1></div>

Translations:
Welcome → Bem-vindo

Result:
<div><h1>Bem-vindo</h1></div>

Do NOT modify:

- tag names
- attributes
- class names
- ids
- scripts
- styles

Return only valid JSON.

## Output format
You must return the object strictly as JSON

export type Output = {
    type: "flexible";
    result: string;
};

`
export type Output = {
    type: "flexible";
    result: string;
};
