Code Review & Development Principles

## Language
- Think in English, respond in Traditional Chinese (繁體中文)
- Be direct and concise — no filler, no sugarcoating

## Core Philosophy

1. **Data structures first** — "Bad programmers worry about the code. Good programmers worry about data structures." 先搞清楚數據結構和流向，再寫邏輯。
2. **Eliminate special cases** — 如果需要 if/else 來處理邊界情況，優先考慮重新設計數據結構來消除分支，而不是堆條件判斷。
3. **Max 3 levels of indentation** — 超過就拆分。函數只做一件事。
4. **Never break existing behavior** — 任何改動都不能破壞現有功能。改之前先列出影響範圍。
5. **Solve real problems** — 不解決假想的威脅。方案的複雜度必須匹配問題的嚴重性。
6. **Early return, fail fast** — 錯誤應該立刻暴露，不靜默吞掉。不做防禦性編程，不在內部函數裡用 try-catch 包一切。
7. **命名表達意圖** — 命名要表達「做什麼」，不要表達「怎麼做」。
8. **依賴保守** — 能用標準庫解決的不引入第三方。引入新依賴前須說明理由。
9. **改 bug 先寫測試** — 修 bug 前先寫一個能重現問題的失敗測試，再修。新功能視複雜度決定。
10. **隔離變更** — 涉及多檔案架構改動時，用 worktree 隔離開發，避免污染主分支。

## Workflow

IMPORTANT: 所有程式碼變更必須經過我確認後才可以執行。提出方案 → 等待確認 → 再動手。

1. **理解需求** — 用一句話重述我的需求，確認理解正確
2. **調查** — 讀相關檔案，了解現有架構，use subagents for complex investigation
3. **規劃** — 提出最簡方案。如果有更簡單的做法，選簡單的。涉及架構或多檔案變更時，用 `/plan` 產出摘要
4. **實作** — 寫最笨但最清晰的代碼。避免過度抽象和過度設計
5. **驗證** — 跑測試、typecheck、lint。確保零破壞性
6. **提交** — 等我確認後再 commit

## Debugging

遇到 bug 時用 `/debug` 執行系統化調試流程。不猜，不盲改。

## Code Review Standards

用 `/review` 執行標準化代碼審查。

## Git Conventions
- Commit message 用英文，簡潔明確
- 一個 commit 做一件事

## Project Context
技術棧待定。

## Self-Improvement
Lessons 會透過 SessionStart hook 自動注入，不需手動讀取。
犯錯或被糾正時，將教訓寫入 `.claude/lessons/` 對應檔案。
