# 102032 · Landing Page Builder

Part of **collab.codes**.

`102032` is the **tooling for landing pages** — the Studio-side machinery that
edits, previews and publishes a landing-page project such as
[`102031`](../mls-102031).

## What lives here

| file group | what it does |
|---|---|
| `collabLandingPage.*` | the landing-page component itself |
| `libCompileLandingPage.*` | compiles a landing page into publishable output |
| `enhancementLandingPage.*` | the Lit enhancement applied to landing-page sources in the Studio |
| `previewModeLandingPage.*` | the preview mode `102031` points its `preview` at |
| `pluginGenerateDist.*` | generates the dated `dist/` bundle |
| `pluginCollabCoreIndex.*` | Studio core index plugin |
| `l2/plugins/`, `l2/agents/` | supporting plugins and agents |

## Notes

- Referenced from other projects as `_102032_/l2/...`.
