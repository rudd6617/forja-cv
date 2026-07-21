# PDF Rendering Lessons

## react-pdf CJK 斷行：FEFF glue 不足以避免連字號

textkit 的 K&P 演算法規定 glue 節點前面必須是 box 才能當斷點。hyphenation callback
在 CJK 字元間插入的 U+FEFF glue 前面永遠有一個 penalty 節點，所以中英混排時
（K&P 有足夠空間伸縮而不會 fallback 到 best-fit）斷行只能落在 penalty 上 →
自動補 "-"。修法：頂層 `<Text>` 加 `hyphenationPenalty={10000}`（=== textkit 的
linebreak.infinity），penalty 斷點被完全跳過，斷行回到 FEFF glue（best-fit fallback）。
純中文段落不會重現此 bug（K&P 必定失敗直接走 fallback），驗證時必須用中英混排樣本。

## 驗證 PDF 排版用 renderToFile + Read 工具目視

`@react-pdf/layout` 手刻 document object 走不到完整管線（結果不可信）。
正確做法：node script 用真實 `renderToFile` 輸出 PDF，再用 Read 工具直接看渲染結果。
字型用 `./public/fonts/*.ttf` 相對路徑註冊即可。script 必須放在專案根目錄內執行
（ESM 依 script 位置解析 node_modules），用完即刪。

## 瀏覽器端 PDF 模組改完要整頁重新整理

`PdfDocument` / `htmlToPdfNodes` 是 App.tsx 動態 import 的，瀏覽器 module cache
不受 HMR 影響——改完程式碼後舊分頁再按「下載 PDF」拿到的還是舊模組。
必須先 F5 重新載入頁面再測。使用者回報「沒有改變」時先確認這點（可用
`curl http://localhost:5173/src/...` 確認 dev server 已 serve 新碼）。
