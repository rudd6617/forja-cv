# Tech Stack

- **Runtime**: TypeScript (strict) + Vite 8 dev server/bundler
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **Rich Text**: Quill.js
- **AI**: vLLM (OpenAI-compatible API)
- **Deployment**: Cloudflare Pages / Workers
- **PDF**: Browser print (`window.print()` + `@media print` CSS)
- **Data**: Local JSON + localStorage
- **Target**: ES2020, browser

# Commands

| 用途 | 指令 |
|------|------|
| 開發 | `npm run dev` |
| 開發（含 Pages Functions） | `npm run dev:full` |
| 型別檢查 | `tsc --noEmit` |
| 建置 | `npm run build` (tsc + vite build) |
| 預覽 | `npm run preview` |
| 部署 | `npm run deploy` (build + wrangler pages deploy) |

# Architecture

- SPA 單頁應用，部署到 Cloudflare Pages
- Cloudflare Pages Functions 作為 vLLM API proxy (`/api/analyze`)
- vLLM endpoint 透過環境變數設定 (`VLLM_API_URL`, `VLLM_MODEL`)
- 履歷資料格式為 `.json`（含 Quill.js HTML fragments）
