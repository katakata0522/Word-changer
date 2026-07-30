# Word-changer

英字・カナ・空白の実用変換と、文字順の反転やランダム文字などのネタ変換をブラウザ内で行える静的Webツールです。

入力した文章は外部へ送信されません。ブラウザへ保存するのは、最後に選択したカテゴリと変換方法だけです。

## 主な機能

### 実用変換

- 英字の大文字化・小文字化
- ひらがなから半角カナへの変換
- 全角英数字と半角英数字の相互方向の変換
- 全角カナから半角カナへの変換
- 空白・改行・タブの一括削除

### ネタ変換

- アラビア文字、ハングル、記号へのランダム置換
- 文字順の反転
- 濁点の付加
- 一文字ごとの空白挿入

ランダム置換は翻訳ではなく、意味のない文字列を生成します。

## 使い方

1. 「実用」または「ネタ」を選びます。
2. 使用する変換方法を選びます。
3. 文章を入力し、「変換する」を押します。
4. 必要に応じて変換結果をコピーします。

`Ctrl + Enter`、Macでは`Command + Enter`でも変換できます。

## ローカルで確認する

`config.json`を読み込むため、`index.html`をファイルとして直接開かず、簡易Webサーバーを使用してください。

```bash
python -m http.server 8000
```

起動後、`http://localhost:8000/`を開きます。

## テスト

Node.js 20.19以上を使用します。初回はテスト用パッケージをインストールしてください。

```bash
npm ci
npm run check
```

次を確認します。

- JavaScriptの構文
- 絵文字・結合文字を含むUnicode変換
- カナ・英数字・空白の変換
- 入力上限、設定エラー、コピー、キーボード操作などの画面状態
- `config.json`と変換処理の対応
- HTMLの主要なアクセシビリティ要素
- HTML構文
- 不要なランダム記号の混入

Pull RequestではGitHub Actionsでも同じチェックを実行します。

## 保存データ

`localStorage`には次の選択状態だけを保存します。

- `jmn_v3_mainCategory`
- `jmn_v3_subTab_practical`
- `jmn_v3_subTab_fun`

入力文章と変換結果は保存しません。`localStorage`が使用できない環境でも、変換機能は継続します。

## 対応環境と制限

- 現行のChrome、Edge、Firefox、Safariを想定しています。
- 書記素分割には`Intl.Segmenter`を優先して使用し、未対応環境ではUnicodeコードポイント単位へフォールバックします。
- 入力上限は2000文字です。超過した文章は削除せず、上限以内に収まるまで変換を停止します。
- 半角に同じ小書き文字が存在しない「ヮ・ヵ・ヶ」などは、通常サイズの「ﾜ・ｶ・ｹ」へ近似変換します。
- コピーAPIが利用できない場合は、従来方式でのコピーを試みます。

## ファイル構成

```text
.
├── index.html
├── style.css
├── conversions.js
├── app.js
├── config.json
├── package.json
├── package-lock.json
├── tests/
│   ├── conversions.test.cjs
│   ├── app.test.cjs
│   └── static-check.cjs
└── .github/workflows/quality.yml
```

## 更新

最終更新: 2026-07-30
