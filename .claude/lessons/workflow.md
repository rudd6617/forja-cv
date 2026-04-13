# Workflow Lessons

## 修改完程式碼必須跑 build 驗證

改完程式碼後一定要跑 `npx tsc -b --noEmit` 或對應的 build 指令確認零錯誤，不能只靠讀 code 分析。提出方案前先本地驗證，修改後也要再驗證。
