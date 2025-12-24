# Mind Assist Generator (PoC)

**あなたの判断基準に合わせて、Copilotを情報整理・考察の相棒に最適化します。**

このアプリは **静的サイト** です。**APIは使いません**（外部通信は任意のアクセスカウンターのみ）。

---

## 1. できること
- 利用コードでログイン → 質問診断（選択式 + その他自由記述）
- 回答をもとに、Copilot の **カスタム指示** に貼る文章を生成
- 用途別に 4モード（General / Judge / Editor / Advisor）を切替

---

## 2. Copilot にカスタム指示を入れる（設定方法）
アプリ内「使い方」カードに記載しています。

## 3. 元に戻す（無効化する）
- Copilot の設定で **Custom instructions をオフ** にする  
- または、指示文を消して空にして保存

---

## 4. 利用コード（ログイン）を変更する
`app.js` を開いて、`VALID_CODES` を書き換えます。

例：
```js
const VALID_CODES = ["AB12CD34","EF56GH78"];
```

> 注意：静的サイトなので、このログインは「簡易ゲート」です（厳密な認証ではありません）。

---

## 5. アクセスカウンター（GoatCounter）
`index.html` の末尾に GoatCounter のタグがあります。

```html
<script data-goatcounter="https://YOURCODE.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

1) https://goatcounter.com でアカウント作成  
2) 新しい site を作成し、CODE（YOURCODE）を取得  
3) `YOURCODE` を自分のものに置換して commit

---

## 6. GitHub Pages で公開する（最短）
### A) GitHubにアップロード
1. GitHub で新しいリポジトリを作成（例：`mind-assist-generator`）
2. このフォルダの中身（`index.html` など）を **全部** そのままアップロード

### B) GitHub Pages をON
1. リポジトリ → **Settings**
2. **Pages**
3. Source を `Deploy from a branch` にして、Branch を `main` / `/ (root)` に設定
4. Save → 数十秒後にURLが表示されます

---

## 7. ローカルで確認（任意）
PCにファイルを置いて `index.html` を開くだけでも動きます。

---

## 8. ファイル一覧
- `index.html` : 画面
- `styles.css` : 見た目
- `questions.js` : 質問定義（全問：その他自由記述）
- `generator.js` : 指示文生成（テンプレート）
- `app.js` : 画面制御/ログイン/保存/コピー
