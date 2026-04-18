# Tech Stack

- **Runtime**: TypeScript (strict) + Vite 8 dev server/bundler
- **Framework**: React 19
- **Styling**: Tailwind CSS + CSS custom properties for theming
- **Rich Text**: Quill.js
- **AI**: 本地 LLM（vLLM 或 oMLX，OpenAI-compatible API，皆為本地端運行不上雲）
- **Deployment**: Cloudflare Pages + Vite Plugin (`@cloudflare/vite-plugin`)
- **PDF**: Browser print (`window.print()` + `@media print` CSS)
- **Database**: Cloudflare D1 (forja-cv-db)
- **Auth**: Google Sign-In (ID token)
- **Data**: D1 + localStorage cache
- **Target**: ES2023, browser

# Commands

| 用途 | 指令 |
|------|------|
| 開發 | `npm run dev` |
| 型別檢查 | `tsc --noEmit` |
| 建置 | `npm run build` (tsc + vite build) |
| 預覽 | `npm run preview` |
| 部署 | push to main → Cloudflare Pages CI/CD |

# Architecture

- SPA 單頁應用，部署到 Cloudflare Pages（GitHub 綁定自動 CI/CD）
- Cloudflare Worker 作為 LLM API proxy（`/api/analyze`，`worker/index.ts`）
- `wrangler.jsonc` 設定 SPA routing + `/api/*` worker-first
- LLM endpoint 透過環境變數設定（`LLM_API_URL`, `LLM_MODEL`）；可指向 vLLM 或 oMLX，只要是 OpenAI-compatible server 皆可
- 履歷資料格式為 `.json`（含 Quill.js HTML fragments）
- 4 種版面：right-sidebar, left-sidebar, top-header, single-column
- 主題系統：4 字型 × 4 配色，透過 CSS custom properties 套用
- 主題/版面偏好存 localStorage
