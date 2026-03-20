/// <mls fileReference="_102032_/l2/enhancementLandingPage.ts" enhancement="_blank"/>

import { convertFileNameToTag } from '/_102027_/l2/utils.js'
import { getPropierties } from '/_102027_/l2/propiertiesLit.js'
import { validateTagName, validateRender } from '/_102027_/l2/validateLit.js';
import { setCodeLens } from '/_102027_/l2/codeLensLit.js';
import { injectStyle, injectStyleAction } from '/_102027_/l2/processCssLit.js'

export const requires: mls.l2.enhancement.IRequire[] = [
    {
        type: "import",
        name: "tailwind.js",
        ref: "https://cdn.tailwindcss.com"
        //ref: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
    }
];

export const getDefaultHtmlExamplePreview = (modelTS: mls.editor.IModelTS): string => {
    const { project, shortName, folder } = modelTS.storFile;
    const tag = convertFileNameToTag({ project, shortName, folder });
    return `<${tag}></${tag}>`;
}

export const getDesignDetails = async (modelTS: mls.editor.IModelTS): Promise<mls.l2.enhancement.IDesignDetailsReturn> => {
    return new Promise<mls.l2.enhancement.IDesignDetailsReturn>((resolve, reject) => {
        try {
            const ret: mls.l2.enhancement.IDesignDetailsReturn = {
                defaultGroupName: "",
                defaultHtmlExamplePreview: getDefaultHtmlExamplePreview(modelTS),
                properties: getPropierties(modelTS),
                webComponentDependencies: []
            }
            resolve(ret);
        } catch (e) {
            reject(e);
        }
    })
}

export const onAfterChange = async (modelTS: mls.editor.IModelTS): Promise<void> => {


    try {
        setCodeLens(modelTS);
        if (validateTagName(modelTS)) {
            mls.events.fireFileAction('statusOrErrorChanged', modelTS.storFile, 'left');
            mls.events.fireFileAction('statusOrErrorChanged', modelTS.storFile, 'right');
            return;
        }

        if (validateRender(modelTS)) {
            mls.events.fireFileAction('statusOrErrorChanged', modelTS.storFile, 'left');
            mls.events.fireFileAction('statusOrErrorChanged', modelTS.storFile, 'right');
            return;
        }
    } catch (e: any) {
        return e.message || e;
    }
};


export const onAfterCompile = async (modelTS: mls.editor.IModelTS): Promise<void> => {
    await injectStyle(modelTS, 'Default', '_102032_enhancementLandingPage');
    return;
}

export const onAfterCompileAction = async (sourceJS: string, sourceTS: string, css?: { sourceLess: string, sourceTokens: string }): Promise<string> => {
    return await injectStyleAction(sourceJS, sourceTS, css?.sourceLess || '', css?.sourceTokens || '', 'Default', '_102032_enhancementLandingPage');
}

