/// <mls fileReference="_102032_/l2/libCompileLandingPage.ts" enhancement="_blank"/>

import { getDependenciesByHtmlFile } from '/_102027_/l2/libCompile.js';
import { getPath, convertFileNameToTag } from '/_102027_/l2/utils.js';

export async function buildLandingPageByStor(stor: mls.stor.IFileInfo, language: ILanguage | undefined, theme: string = 'Default') {

    let { project, shortName, folder } = stor;
    const keyHTML = mls.stor.getKeyToFiles(project, 2, shortName, folder, '.html');

    if (!mls.stor.files[keyHTML]) {
        throw new Error(`Not found html page: ${stor.folder ? stor.folder + '/' + stor.shortName : stor.shortName}`);

    }

    const contentHTML = await mls.stor.files[keyHTML].getContent() as string;

    let json = await getDependenciesByHtmlFile(stor, contentHTML, theme, true);

    const js = await buildJs(json, stor);
    const content = await generateHTML(project, json, js, contentHTML);

    return content
}

async function buildJs(json: any, stor: mls.stor.IFileInfo) {

    await loadEsbuild();
    let allImports = [...new Set(json.importsJs.filter((i: string) => i.startsWith('/')))];

    const virtualFsPlugin = {
        name: 'virtual-fs',
        setup(build: any) {

            build.onResolve({ filter: /.*/ }, (args: any) => {


                if ((args.path.startsWith("/") || args.path.startsWith("./") || args.path.startsWith("../")) &&
                    !args.importer.startsWith("https://")) {

                    const url = new URL(args.path, 'file:' + args.importer);
                    let path = url.pathname;

                    if (!(/_(\d+)_/.test(path))) {

                        const info = getPath(args.importer.replace('/l2/', '').replace('/', ''));

                        if (!info) throw new Error('[virtualFsPlugin] Not found path:' + args.importer.replace('/l2/', '').replace('/', ''));

                        if (!info.project) info.project = mls.actualProject as number;

                        if (path.indexOf(`_${info.project}_`) < 0) {
                            path = url.pathname.replace('/', `/_${info.project}_`)
                        }
                    }

                    return { path, namespace: 'virtual' };

                }

                return null;
            });

            build.onLoad({ filter: /.*/, namespace: 'virtual' }, async (args: any) => {
                try {

                    let path = args.path;

                    const res = await fetch(path);
                    if (!res.ok) throw new Error(`Error get ${args.path}`);

                    const text = await res.text();
                    return { contents: text, loader: 'js' };

                } catch (e: any) {
                    console.info('erro:' + args.path);
                    return {
                        contents: '',
                        loader: 'js',
                        warnings: [{
                            text: e.message, notes: [
                                { text: 'build-error' }
                            ]
                        }]
                    }
                }

            });
        },
    };

    const virtualEntryPath = "virtual-entry.js";
    const virtualEntryContent = allImports.map(path => `import "${path}";`).join("\n");

    const result = await esbuild.build({
        stdin: {
            contents: virtualEntryContent,
            resolveDir: "/",
            sourcefile: virtualEntryPath,
            loader: "js"
        },
        bundle: true,
        minify: true,
        format: "esm",
        sourcemap: false,
        write: false,
        plugins: [virtualFsPlugin]
    });

    return result.outputFiles[0].text;

}

async function getPreviewConfigByProject(project: number): Promise<any | undefined> {
    if (!project) return;
    const url = `/_${project}_/l2/project.js`
    try {
        const modulePrj = await import(url);
        if (!modulePrj || !modulePrj.projectConfig || !modulePrj.projectConfig.masterFrontEnd || !modulePrj.projectConfig.masterFrontEnd.preview) return;

        return modulePrj.projectConfig.masterFrontEnd;

    } catch (err) {
        console.error('no find project config');
        return;
    }
}

async function generateHTML(project: number, json: any, js: String, contentHTML: string) {

    const css = await getCss(json);
    const info = await getPreviewConfigByProject(project);
    console.info(info);
    const metas = (info.meta || []).join('\n');

    let html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        ${info?.title ? `<title>${info.title}</title>` : '<title> Landing Page</title>'}
        ${metas}        
        ${json.importsLinks.map((i: any) => { return `<link ref="${i.ref}" rel="${i.rel}"/>` })}
        ${css}
    </head>
    <body>
        ${contentHTML}
        <script>
            ${js}
        </script> 
        ${json.importsJs.map((i: string) => { if (i.startsWith('/')) { return '' } else return `<script src="${i}"></script>` }).join('')}
    </body> 
    </html>  
    `

    return html.trim();
}

async function getCss(json: any) {

    let css = json.tokens || '';

    for await (const js of json.importsJs) {

        if (!js.startsWith('/')) continue;
        const path = getPath(js.replace('/', ''));
        if (!path) continue;

        const k = mls.stor.getKeyToFile({ ...path, level: 2, extension: '.less' });
        const s = mls.stor.files[k];

        if (!s) continue;

        const src = await s.getContent() as string;

        const less = await mls.l2.less.compile(src);
        const tag = convertFileNameToTag(s);
        if (!less) continue;

        css = `
            ${css}
            ${less.replace(new RegExp(tag, 'g'), '')}
            `;


    }

    return `<style>${css}</style>`


}


var esbuild: any;
async function loadEsbuild() {

    if ((mls as any).esbuild) {
        esbuild = (mls as any).esbuild;
    } else if (!(mls as any).esbuildInLoad) await initializeEsBuild();

}

async function initializeEsBuild() {

    (mls as any).esbuildInLoad = true;
    const url = 'https://unpkg.com/esbuild-wasm@0.14.54/esm/browser.min.js';
    if (!esbuild) {
        esbuild = await import(url);
        await esbuild.initialize({
            wasmURL: "https://unpkg.com/esbuild-wasm@0.14.54/esbuild.wasm"
        });
        (mls as any).esbuild = esbuild;
        (mls as any).esbuildInLoad = false

    }

}


interface ILanguage {
    language: string,
    name: string,
    path: string
}