/// <mls fileReference="_102032_/l2/pluginGenerateDist.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, svg, TemplateResult, unsafeHTML } from 'lit';
import { state, query } from 'lit/decorators.js';
import { CollabLitElement } from '/_102027_/l2/collabLitElement.js';
import { getAllDefs } from '/_102027_/l2/libMindMap.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import {  buildLandingPageByStor } from '/_102032_/l2/libCompileLandingPage.js';


/// **collab_i18n_start**
const message_pt = {
    clickInPublish: "Clique no botão 'publicar' para iniciar a publicação.",
    step1: "Configuração",
    step2: "Selecionar Páginas",
    step3: "Log de Geração",
    continue: "Continuar",
    back: "Voltar",
    publish: "Publicar",
    alertTitle: "⚠️ Atenção",
    alertOnlySelected: "Apenas as páginas selecionadas neste passo serão atualizadas.",
    alertNotSelected: "Páginas não selecionadas não serão atualizadas após a conclusão.",
    alertReview: "Recomendamos revisar cuidadosamente as páginas selecionadas antes de continuar.",
    errorLanguage: "É preciso selecionar pelo menos uma linguagem!",
    errorPage: "É preciso selecionar pelo menos uma página!",
    startPublish: "Iniciando processo de publicação",
    publishCompleted: "Publicação concluída!",
    startingPublishLanguage: "Iniciando publicação da linguagem:",
    compilingPage: "Compilando página:",
    startingSaveDist: "Iniciando salvamento do dist",
    checkingFork: "Verificando fork...",
    addNewBranch: "Criando nova branch...",
    savingFiles: "Salvando arquivos...",
    savingAssets: "Salvando recursos...",
    creatingPullRequest: "Criando pull request...",
    publishFinish: "Finalizar"
}

const message_en = {
    clickInPublish: "Click the 'publish' button to start publishing.",
    step1: "Configuration",
    step2: "Select Pages",
    step3: "Generate Log",
    continue: "Continue",
    back: "Back",
    publish: "Publish",
    alertTitle: "⚠️ Attention",
    alertOnlySelected: "Only selected pages will be updated.",
    alertNotSelected: "Unselected pages will not be updated after completion.",
    alertReview: "We recommend carefully reviewing selected pages before continuing.",
    errorLanguage: "You must select at least one language!",
    errorPage: "You must select at least one page!",
    startPublish: "Starting publish process",
    publishCompleted: "Publish completed!",
    startingPublishLanguage: "Starting publish language:",
    compilingPage: "Compiling page:",
    startingSaveDist: "Starting save dist",
    checkingFork: "Checking fork...",
    addNewBranch: "Creating new branch...",
    savingFiles: "Saving files...",
    savingAssets: "Saving assets...",
    creatingPullRequest: "Creating pull request...",
    publishFinish: "Finish"
};

type MessageType = typeof message_en;

const messages: { [key: string]: MessageType } = {
    'pt': message_pt,
    'en': message_en
}
/// **collab_i18n_end**

export class PluginGenerateDist extends CollabLitElement {

    private myState: IStatePlugin = {
        mode: '',
        newVersion: '',
        modeLang: '',
        languages: [],
        folders: { ori: '', dest: '' },
        pages: [],
        assets: [],
        actualtheme: 'Default'
    };

    private msg: MessageType = messages['en'];
    private publishModeOptions = [
        {
            value: "versioned-folder",
            label: "Versioned Folder",
            description: "Each deploy is published in its own folder, such as /version/123/."
        },
        {
            value: "hashed-assets",
            label: "Hashed Assets",
            description: "Stable paths with generated asset names, such as app.[hash].js."
        }
    ];


    @state() completed: number[] = [];
    @state() current: number = 1;

    @state() mode: string = 'versioned-folder';
    @state() newVersion: string = this.getLocalDateTime();
    @state() modeLang: string = 'noLang';
    @state() folders = { ori: 'www', dest: 'dist' };
    @state() languages: ILanguage[] = [];
    @state() pages: mls.stor.IFileInfo[] = [];

    @state() inPublish: boolean = false;
    @state() clickedPublish: boolean = false;
    @state() logs: string[] = [];
    @query('#logBox') logBox: HTMLElement | undefined;


    firstUpdated() {
        this.init();
    }

    async updated(changedProperties: Map<string | number | symbol, unknown>) {
        super.updated(changedProperties);
        const propMode = changedProperties.get('mode');
    }

    render(): TemplateResult {

        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];
        return html`
        <div class="agent-box">
            ${this.renderHeader()}
            ${this.renderWizard()}
            ${this.renderScenary()}
            
        </div> 
        `;
    }

    renderHeader(): TemplateResult {
        return html`
            <header>
                <span class="svg-container">${pluginData.getSvg()}</span>
                <span>${pluginData.title} - ${mls.actualProject}</span>
            </header>
        `;
    }

    renderWizard() {
        return html`
            <div class="steps">
                <div class="step ${this.completed.includes(1) ? 'completed' : ''} ${this.current == 1 ? 'active' : ''}">
                    <div class="circle">1</div>
                    <span>${this.msg.step1}</span>
                </div>
                <div class="step ${this.completed.includes(2) ? 'completed' : ''} ${this.current == 2 ? 'active' : ''}">
                    <div class="circle">2</div>
                    <span>${this.msg.step2}</span>
                </div>
                <div class="step ${this.completed.includes(3) ? 'completed' : ''} ${this.current == 3 ? 'active' : ''}">
                    <div class="circle">3</div>
                    <span>${this.msg.step3}</span>
                </div>
            </div>
        `
    }

    renderScenary() {

        switch (this.current) {
            case (1): return this.renderScenary1();
            case (2): return this.renderScenary2();
            case (3): return this.renderScenary3();
        }

    }

    renderScenary1() {
        return html`
            <div class="content">
                <fieldset>
                    <legend>Folder</legend>
                    <div class="field">
                        <label>Folder origin</label>
                        <input value="www" @change=${(e: any) => this.folders.dest = e.target.value}></input>
                    </div>
                    <div class="field">
                        <label>Folder destiny</label>
                        <input value="dist" disabled></input>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Mode Build</legend>
                    <div class="field">
                        <label>Mode</label>
                        <select @change=${(e: any) => this.mode = e.target.value}>
                            <option value="versioned-folder">Versioned Folder</option>
                            <option value="hashed-assets">Hashed Assets</option>
                        </select>
                    </div>
                    <div class="description">
                        ${this.publishModeOptions.find((f) => f.value === this.mode)?.description}
                    </div>
                    <div class="field" style="display:${this.mode === 'versioned-folder' ? '' : 'none'}">
                        <label>New version</label>
                        <input value="${this.newVersion}"  disabled></input>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Mode Language</legend>
                    <div class="field">
                        <label>Mode</label>
                        <select @change=${(e: any) => this.modeLang = e.target.value}>
                            <option value="noLang">No language</option>
                            <option value="useLang">Use language</option>
                        </select>
                    </div>
                    ${this.modeLang === 'useLang' ? this.renderLang() : ''}
                </fieldset>

                <div class="actions">
                    <button @click=${() => this.next(2)}>${this.msg.continue}</button>
                </div>
            
            </div>

        `
    }

    renderLang() {
        return html`
        <div class="grid" style="margin-top:1rem">
            ${this.languages.map((l) =>
            html`
                <label class="card" for="${l.name}">
                    <input type="checkbox" .info=${l} id="${l.name}"> ${l.name} <small>(path: "${l.path}")</small>
                </label>`
        )}

        </div>`
    }

    renderScenary2() {
        return html`
            <div class="content"> 
                <div class="grid">
                    ${this.pages.map((p) => html`
                        <label class="card" for="${p.shortName}">
                            <input type="checkbox" .info=${p} id="${p.shortName}" checked> ${p.folder ? p.folder + '/' + p.shortName : p.shortName}
                        </label>`
        )}
                </div>
                <div class="actions">
                    <button @click=${() => this.next(1)} class="secondary">${this.msg.back}</button>
                    <button @click=${() => this.next(3)}>${this.msg.continue}</button>
                </div>
            </div>

        `
    }

    renderScenary3() {
        return html`
            <div class="content"> 
                <div class="log-box" id="logBox">
                    ${this.logs.map((p) => unsafeHTML(p))}
                </div>
                <div class="actions">
                    <button @click=${() => this.next(2)} class="secondary" ?disabled=${this.inPublish}>${this.msg.back}</button>
                    <button @click=${this.startPublish} class="publish-btn ${this.inPublish ? 'loading' : ''}" style="display:${this.clickedPublish ? 'none' : ''}">
                        <span class="btn-text">${this.msg.publish}</span>
                        <span class="loader"></span>
                    </button>
                    <button @click=${this.fineshedPublish} class="publish-btn" style="display:${!this.clickedPublish ? 'none' : ''}">
                        <span class="btn-text">${this.msg.publishFinish}</span>
                    </button>
                </div>
            </div>

        `
    }

    //-------IMPLEMENTATION-------

    private async init() {

        await this.getLanguages();
        await this.getPages();
        this.getAssets();

    }

    private async getLanguages() {

        const info = await mls.l5.getProjectConf(mls.actualProject || 0);
        this.languages = info.languages;

    }

    private async getPages() {

        const allItens = await getAllDefs();
        const pages: mls.stor.IFileInfo[] = [];
        Object.keys(allItens).forEach((key: string) => {

            if (!allItens) return;
            const item = allItens[key];
            if (item.defs.meta.componentType === 'page') {
                const stor = mls.stor.files[key.replace('.defs', '')];
                if (stor && stor.project === mls.actualProject) pages.push(stor);
            }

        })

        this.pages = pages;

    }

    private getAssets() {

        const assets: mls.stor.IFileInfo[] = [];
        Object.keys(mls.stor.files).forEach((key) => {

            const stor = mls.stor.files[key];
            if (stor.project === mls.actualProject && stor.level === 2 && stor.folder.startsWith(this.myState.folders.ori)) {
                const defsKey = mls.stor.getKeyToFile({ ...stor, extension: '.defs.ts' });
                if (mls.stor.files[defsKey]) return;
                assets.push(stor);
            }

        });

        this.myState.assets = assets;

    }

    private next(scenary: number) {

        try {

            if (this.current === 1) {
                this.isValid1()
            }

            if (this.current === 2 && scenary > 2) {
                this.isValid2()
            }

            if (scenary === 1) {
                this.completed = [];
            }

            if (scenary === 2) {
                this.completed = [1];
            }

            if (scenary === 3) {
                this.logs = [`<div class="log-line log-info">[INFO] ${this.msg.clickInPublish}</div>`];
                this.completed = [1, 2];
            }

            this.current = scenary;

        } catch (e: any) {
            alert(e && e.message ? e.message : 'Error invalid step');
        }

    }

    private isValid1() {

        if (!this.mode) throw new Error('Select a mode');
        this.myState.mode = this.mode;

        if (this.mode === 'versioned-folder' && !this.newVersion) throw new Error('Fill a new version');
        this.myState.newVersion = this.newVersion;

        if (!this.modeLang) throw new Error('Select a language mode');
        this.myState.modeLang = this.modeLang;

        if (this.modeLang === 'useLang') {
            const els = this.querySelectorAll('input:checked');
            if (els.length < 1) throw new Error(this.msg.errorLanguage);
            const infos: ILanguage[] = [];
            els.forEach((el: any) => {
                if (el.info) infos.push(el.info);
            });

            if (infos.length < 1) throw new Error(this.msg.errorLanguage);

            this.myState.languages = infos;
        }

        if (this.folders.dest === '') throw new Error('Fill a folder dest');
        if (this.folders.ori === '') throw new Error('Fill a folder ori');

        this.myState.folders.dest = this.folders.dest;
        this.myState.folders.ori = this.folders.ori;


    }

    private isValid2() {
        const els = this.querySelectorAll('input:checked');
        if (els.length < 1) throw new Error(this.msg.errorPage);
        const infos: mls.stor.IFileInfo[] = [];
        els.forEach((el: any) => {
            if (el.info) infos.push(el.info);
        });

        if (infos.length < 1) throw new Error(this.msg.errorPage);
        this.myState.pages = infos;

    }

    //---------------------------------------------------------
    //---------------------GENERATE DIST-----------------------
    //---------------------------------------------------------

    private async startPublish() {
        if (this.inPublish) return;
        this.inPublish = true;
        await this.addLog(`${this.msg.startPublish} (${this.myState.pages.length} pages)...`, 'INFO');

        switch (this.myState.mode) {
            case ('versioned-folder'): await this.modeVersion(); break;
            case ('hashed-assets'): await this.modeHash(); break;
            default: await this.addLog(`This mode not implemented(${this.myState.mode})`, 'ERROR');
        }

        await this.addLog(this.msg.publishCompleted, 'SUCCESS');

        setTimeout(() => {
            this.clickedPublish = true;
            this.inPublish = false;

        }, 500);
    }

    private fineshedPublish() {

        this.clickedPublish = false;

        this.myState = {
            mode: '',
            newVersion: '',
            modeLang: '',
            languages: [],
            folders: { ori: '', dest: '' },
            pages: [],
            assets: [],
            actualtheme: 'Default'
        };

        this.next(1);

    }

    private async modeVersion() {


        if (this.myState.modeLang === 'noLang') {
            await this.publishMyPages();
            await this.publishMyAssets();
            await this.createVersionFile();
        } else {
            await this.addLog(`This language mode not implemented(${this.myState.modeLang})`, 'ERROR');
        }



    }

    private async modeHash() {
        await this.addLog(`In development...`, 'ERROR');
    }

    private async publishMyPages(lang: ILanguage | undefined = undefined) {

        let pages: mls.stor.IFileInfo[] = [];

        for await (const stor of this.myState.pages) {
            const p = await this.publishPage(stor, lang);
            if (p) {
                pages.push(p);
            }
        }

        return pages;

    }

    private async publishPage(stor: mls.stor.IFileInfo, lang: ILanguage | undefined = undefined): Promise<mls.stor.IFileInfo | undefined> {
        try {

            await this.addLog(`Compiling page: ${stor.folder ? stor.folder + '/' + stor.shortName : stor.shortName}`, 'INFO');

            let { project, shortName, folder } = stor;
            const content = await buildLandingPageByStor(stor, lang);


            let auxFolder = this.myState.folders.dest.endsWith('/') ? this.myState.folders.dest : this.myState.folders.dest + '/';

            folder = folder.replace(this.myState.folders.ori, '');

            if (this.myState.mode === 'versioned-folder') {
                auxFolder += this.myState.newVersion;
            } else {
                await this.addLog(`This mode not implemented(${this.myState.mode})`, 'ERROR');
                return undefined;
            }

            const param: IReqCreateStorFile = {
                project,
                folder: folder.startsWith('/') ? auxFolder + folder : auxFolder + '/' + folder,
                shortName,
                level: 2,
                extension: '.html',
                source: content,
                status: 'new'

            }

            const info = await createStorFile(param, false, false, false);
            return info;

        } catch (e: any) {
            console.info(e)
            return undefined;
        }


    }

    private async createVersionFile() {

        await this.addLog(`Creating version file...`, 'INFO');

        let project = mls.actualProject || 0;
        let level = 2;
        let shortName = 'version';
        let extension = '.json';
        let folder = 'dist';
        let content = `{"html":"${this.myState.newVersion}"}`



        const key = mls.stor.getKeyToFile({ project, level, shortName, extension, folder });
        const stor = mls.stor.files[key];

        if (!stor) {
            const param: IReqCreateStorFile = {
                project,
                folder,
                shortName,
                level,
                extension,
                source: content,
                status: 'new'

            }

            const info = await createStorFile(param, false, false, false);
            return;

        }

        const m = await stor.getOrCreateModel();
        if (m) m.model.setValue(content);

    }


    private async publishMyAssets() {

        for await (const f of this.myState.assets) {
            await this.publishAssets(f)
        }

    }

    private async publishAssets(stor: mls.stor.IFileInfo): Promise<mls.stor.IFileInfo | undefined> {
        try {

            await this.addLog(`Create assets: ${stor.folder ? stor.folder + '/' + stor.shortName : stor.shortName}`, 'INFO');

            let { project, shortName, folder } = stor;

            let auxFolder = this.myState.folders.dest.endsWith('/') ? this.myState.folders.dest : this.myState.folders.dest + '/';

            folder = folder.replace(this.myState.folders.ori, '');

            if (this.myState.mode === 'versioned-folder') {
                auxFolder += this.myState.newVersion;
            } else {
                await this.addLog(`This mode not implemented(${this.myState.mode})`, 'ERROR');
                return undefined;
            }

            const params = {
                project,
                folder: folder.startsWith('/') ? auxFolder + folder : auxFolder + '/' + folder,
                shortName,
                level: 2,
                extension: stor.extension,
                versionRef: '0',
            };

            const file = await mls.stor.addOrUpdateFile(params);
            if (!file) throw new Error('[createStorFile] Invalid storFile');

            file.status = 'new';


            const fileInfo: mls.stor.IFileInfoValue = {
                content: await stor.getContent(),
                contentType: 'blob'
            };

            await mls.stor.localStor.setContent(file, fileInfo);

            await mls.stor.cache.addIfNeed({ ...file, content: fileInfo.content, contentType: fileInfo.contentType, version: '0' })

            return file;

        } catch (e: any) {
            console.info(e)
            return undefined;
        }


    }

    private async addLog(msg: string, tp: 'INFO' | 'SUCCESS' | 'ERROR') {

        let str = '';
        if (tp === 'INFO') {
            str = `<div class="log-line log-info">[INFO] ${msg}</div>`
        } else if (tp === 'SUCCESS') {
            str = `<div class="log-line log-success">[SUCCESS] ${msg}</div>`
        } else if (tp === 'ERROR') {
            str = `<div class="log-line log-error">[ERROR] ${msg}</div>`
        } else {
            str = `<div class="log-line">[MESSAGE] ${msg}</div>`
        }

        this.logs = [...this.logs, str]; // IMPORTANTE: nova referência
        await this.waitRender();         // 🔥 deixa o browser pintar

        if (this.logBox) {
            this.logBox.scrollTop = this.logBox.scrollHeight;
        }
    }

    private getLocalDateTime() {
        const now = new Date()
        const pad = (n: any) => String(n).padStart(2, '0')
        const year = now.getFullYear()
        const month = pad(now.getMonth() + 1)
        const day = pad(now.getDate())
        const hour = pad(now.getHours())
        const min = pad(now.getMinutes())
        const sec = pad(now.getSeconds())

        return `${year}${month}${day}${hour}${min}${sec}`
    }


    private async waitRender() {
        await new Promise(requestAnimationFrame);
    }

}

interface ILanguage {
    language: string,
    name: string,
    path: string
}

interface IStatePlugin {
    mode: string,
    newVersion: string,
    modeLang: string,
    languages: ILanguage[],
    folders: { ori: string, dest: string }
    pages: mls.stor.IFileInfo[],
    assets: mls.stor.IFileInfo[],
    actualtheme: string
}

if (!customElements.get('plugin-generate-dist-102032')) {
    customElements.define('plugin-generate-dist-102032', PluginGenerateDist);
}

export const pluginData: mls.plugin.IPluginData = {
    title: "Generate Dist",
    getSvg(): TemplateResult {
        return svg`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M352 173.3L352 384C352 401.7 337.7 416 320 416C302.3 416 288 401.7 288 384L288 173.3L246.6 214.7C234.1 227.2 213.8 227.2 201.3 214.7C188.8 202.2 188.8 181.9 201.3 169.4L297.3 73.4C309.8 60.9 330.1 60.9 342.6 73.4L438.6 169.4C451.1 181.9 451.1 202.2 438.6 214.7C426.1 227.2 405.8 227.2 393.3 214.7L352 173.3zM320 464C364.2 464 400 428.2 400 384L480 384C515.3 384 544 412.7 544 448L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 448C96 412.7 124.7 384 160 384L240 384C240 428.2 275.8 464 320 464zM464 488C477.3 488 488 477.3 488 464C488 450.7 477.3 440 464 440C450.7 440 440 450.7 440 464C440 477.3 450.7 488 464 488z"/></svg>
    `;
    }
}