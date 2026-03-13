/// <mls fileReference="_102032_/l2/previewModeLandingPage.ts" enhancement="_blank"/>

import { PreviewModeBase } from '/_102027_/l2/previewBase.js';
import { buildLandingPageByStor} from '/_102032_/l2/libCompileLandingPage.js'



export class PreviewModeLandingPage extends PreviewModeBase {


    public async init(): Promise<void> {
        if (!this.storFile || !this.iFrame) throw new Error('[PreviewModeLandingPage] Invalid arguments');

        const content = await buildLandingPageByStor(this.storFile, undefined);
        this.configIframe(content);

    }

    private configIframe(content: string) {

        if (!this.iFrame) throw new Error('[configIframe] Invalid iFrame');
        this.iFrame.srcdoc = content; 
        
    }

}