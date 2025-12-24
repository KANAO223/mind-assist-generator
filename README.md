# Mind Assist Generator (PoC)

あなたの判断基準に合わせて、Copilotを情報整理・考察の相棒に最適化します。

## 利用コード
- `OXUC`（大文字/小文字は区別しません）

## GitHub Pages
Settings → Pages → Deploy from a branch → `main` / `/(root)`

## アクセスカウンター（GoatCounter）を「数字で表示」する手順

このアプリは **GoatCounter の「訪問数表示（Visitor counter）」**を使って、TOP（ヘッダー）と質問画面に回数を表示します。

### 1) GoatCounterでサイトを作る
1. GoatCounterにログイン
2. 「Add new site」等からサイトを追加
3. 作成すると **CODE（例: mindassist）** が決まります  
   → 以降、この CODE を使います

### 2) index.html の mindassist を置換
`index.html` の末尾付近にある下記の行を探し、`mindassist` をあなたの CODE に置き換えます。

例）CODE が `kanao223` の場合：

```html
<script data-goatcounter="https://kanao223.goatcounter.com/count"
        src="//gc.zgo.at/count.js"></script>
```

置換したら GitHub に commit してください。

### 3) GoatCounter側で「表示を許可」する
GoatCounter のサイト設定で **Allow adding visitor counts on your website** をONにします  
（デフォルトOFFのことが多いです）

### 4) 反映確認
公開サイトをリロードすると、TOP（ヘッダー）と質問画面に数字が出ます。
「—」のままなら、(a) CODE の置換漏れ、(b) 設定がOFF、(c) ブラウザキャッシュ を確認してください。


## 「Views for this page: 0 / stats by GoatCounter」と大きく出てしまう場合
それは GoatCounter の `visit_count()` が **ウィジェット（枠付き表示）** を挿入している状態です。

このPoCでは **数字だけを小さく表示**したいので、
`visit_count()` は使わず、GoatCounterの **JSON API（.json）** を取得して `アクセス` の横に数字だけ入れる方式にしています。
