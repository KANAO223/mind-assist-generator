# Mind Assist Generator (PoC)

あなたの判断基準に合わせて、Copilotを情報整理・考察の相棒に最適化します。

## 利用コード
- `OXUC`（大文字/小文字は区別しません）

## GitHub Pages
Settings → Pages → Deploy from a branch → `main` / `/(root)`

## UX機能（導入済み）
- 24問をステップ分割（6ステップ）
- 入力のたびに自動保存
- 未回答一覧 → クリックで該当設問へ移動
- サンプル入力
- 最終調整（短め/厳しめ/結論ファースト/質問で確認）
- コピー後の次アクション案内

## GoatCounter（mindassist）
`index.html` には以下を設定済みです：

- data-goatcounter: `https://mindassist.goatcounter.com/count`
- 表示は数字のみ（大きいウィジェットは出ません）

GoatCounter側の設定で「Webサイト上で訪問数を表示するのを許可」をONにしてください。


## 出力の反映
- 出力画面でモード選択/最終調整を変えた後は「最終反映」を押してテキストに反映します。
