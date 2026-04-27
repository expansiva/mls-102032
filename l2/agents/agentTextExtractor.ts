/// <mls fileReference="_102032_/l2/agents/agentTextExtractor.ts" enhancement="_blank"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { executeBeforePrompt, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';


export function createAgent(): IAgentAsync {
    return {
        agentName: "agentTextExtractor",
        agentProject: 102032,
        agentFolder: "",
        agentDescription: "Agent for translation html",
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

    const data: IUserPrompt = JSON.parse(userPrompt);
    if (!data || !data.targetLanguage || !data.originFolder || !data.project || !data.originLanguage || !data.targetLanguage) throw new Error('invalid prompt');
    //@@agentTextExtractor  {"targetLanguage": "pt", "targetFolder": "www/pt", "originFolder": "www/en", "originLanguage": "en", "project": 102031, "excludeFiles": ["index", "landingpage1", "landingpage2"] }

    //@@agentTextExtractor  {"targetLanguage": "pt", "targetFolder": "www/pt", "originFolder": "www/en", "originLanguage": "en", "project": 102031, pages:["initial2"] }

    const paths: string[] = getFilesNeedTranslate(data.project, data.originFolder, data.excludeFiles || [], data.pages)
        .map(f => mls.stor.getKeyToFile(f))
        .filter(Boolean)
    // .slice(0, 1)

    if (paths.length < 1) throw new Error('no files to  translate');

    const inputs: mls.msg.IAMessageInputType[] = [{ type: "system", content: system1 }];

    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: inputs,
            taskTitle: `Generate translate for language: ${data.targetFolder}`,
            threadId: context.message.threadId,
            userMessage: context.message.content,
            longTermMemory: {
                targetFolder: data.targetFolder,
                project: data.project.toString(),
                originLanguage: data.originLanguage,
                originFolder: data.originFolder
            }
        },
        executionMode: {
            type: 'parallel',
            args: paths
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
    const file = mls.stor.files[args];

    const continueParallel: mls.msg.AgentIntentPromptReady = {
        type: "prompt_ready",
        args,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        hookSequential,
        parentStepId: parentStep.stepId,
        humanPrompt: JSON.stringify(await getSource(file))
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

    const output = payload.result as {
        fileReference: string,
        items: TranslationExtractItem[];
    }
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
    const { targetFolder, project, originLanguage, targetLanguage, originFolder } = context.task?.iaCompressed?.longMemory as Record<string, string>;
    if (!targetFolder || !project || !originLanguage || !originFolder) throw new Error(`[afterPromptStep] invalid long memory`);

    const nextAgentInNewTask = 'agentTextTranslation'
    const data = {
        "sourceLanguage": originLanguage,
        "targetLanguage": targetLanguage,
        "originFolder": originFolder,
        "targetFolder": targetFolder,
        "fileReference": output.fileReference,
        "project": project,
        "texts": output.items
    }

    const prompt = `@@agentTextTranslation ${JSON.stringify(data)}`
    const agent2 = await loadAgent(nextAgentInNewTask);
    if (!agent2) throw new Error(`[processOutputToBePages] invalid agent: ${nextAgentInNewTask}`)
    const context2 = getTemporaryContext(context.message.threadId, context.message.senderId, prompt)
    executeBeforePrompt(agent2, context2)

    return [updateStatus];

}


async function getSource(fileBase: mls.stor.IFileInfoBase): Promise<{ source: string | null, fileReference: string }> {
    // change first line to new pattern
    const files = await mls.stor.getFiles({ ...fileBase, loadContent: false })
    if (!files || !files.ts) throw new Error(`[beforePromptStep] invalid args, file dont exists`)
    const source = (await files.html?.getContent()) as string | null;
    const sourceTs = (await files.ts?.getContent()) as string | null;

    if (typeof sourceTs !== 'string' || !sourceTs) throw new Error(`[beforePromptAtomic] invalid source`);

    const array = sourceTs.split("\n");
    if (!array || array.length < 2) throw new Error('[beforePrompt] invalid source ts, no lines');

    const fileReference = mls.stor.convertFileToFileReference(files.ts);

    return { source, fileReference };
}



function getFilesNeedTranslate(
    project: number,
    origin: string,
    excludeFiles: string[],
    onlyPages: string[] = []
) {

    const filesInOrigin = Object.values(mls.stor.files)
        .filter((item) =>
            item.project === project &&
            item.folder === origin &&
            item.extension === '.html'
        );

    // se onlyPages foi informado → retornar somente essas páginas
    if (onlyPages && onlyPages.length > 0) {
        return filesInOrigin.filter((item) =>
            onlyPages.some((page) => {
                const paths = page.split('/');
                const shortName = paths.pop();
                const folder = paths.join('/');

                return item.shortName === shortName &&
                    item.folder === origin + (folder ? '/' + folder : '');
            })
        );
    }

    // caso contrário usar excludeFiles
    return filesInOrigin.filter((item) =>
        !excludeFiles.some((item2) => {
            const paths = item2.split('/');
            const shortName = paths.pop();
            const folder = paths.join('/');

            return item.shortName === shortName &&
                item.folder === origin + (folder ? '/' + folder : '');
        })
    );
}

const system1 = `
<!-- modelType: codeflash -->
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->

You are an agent responsible for extracting translatable text from HTML.

Your task is to analyze the HTML and extract human-readable texts that should be translated.

IMPORTANT:
Not every text should be translated. Identify whether the text is translatable.

Do NOT mark as translatable if the text is:

• a brand name
• a product name
• a domain name
• a URL
• a variable
• a technical identifier
• a programming keyword

Examples of non-translatable text:

Google
OpenAI
ChatGPT
YouTube
iPhone
google.com
api.openai.com

Rules:

- Extract visible text only
- Ignore script/style/code/pre/svg/path
- Ignore attributes (class, id, src, href, data-*, aria-*)
- Trim spaces
- Ignore empty strings

## Output format
You must return the object strictly as JSON, no spaces, no indent, minified

export type Output = {
    type: "flexible";
    result: {
        fileReference: string,
        items: TranslationExtractItem[];
    }
};

export interface TranslationExtractItem {
    id: string,
    text: string,
    tag: string,
    path: string,  //"section.hero > button.primary",
    context: string,
    translatable: boolean
}

`
export type Output = {
    type: "flexible";
    result: {
        fileReference: string,
        items: TranslationExtractItem[];
    }
};

export interface TranslationExtractItem {
    id: string,
    text: string,
    tag: string,
    path: string,  //"section.hero > button.primary",
    context: string,
    translatable: boolean
}

interface IUserPrompt {
    originFolder: string,
    originLanguage: string,
    targetLanguage: string,
    targetFolder: string,
    project: number,
    excludeFiles?: string[],
    pages?: string[]
}
