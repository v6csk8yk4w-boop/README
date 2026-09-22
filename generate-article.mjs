#!/usr/bin/env node
/**
 * generate-article.mjs
 *
 * Claude API を使って note.com 向けの記事を自動生成し、article.json に書き出す。
 * 既存のPlaywright投稿スクリプトは article.json を読み込むだけでOKになる想定。
 *
 * 必要な環境変数:
 *   ANTHROPIC_API_KEY  … Claude APIキー（必須）
 *   ARTICLE_AUDIENCE   … 想定読者（任意、未設定ならデフォルト値を使用）
 *   ARTICLE_TONE       … 文体・トーン（任意）
 *   ARTICLE_TOPIC      … 今回のテーマ（任意。空ならAIにお任せで決めさせる）
 */

import { writeFile } from "node:fs/promises";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY が設定されていません");
  process.exit(1);
}

// ▼ 動画の「3つの質問」に相当する部分。ここを自分のnoteアカウントに合わせて調整してください
const AUDIENCE =
  process.env.ARTICLE_AUDIENCE ||
  "AIを使ってみたいけど何から始めるかわからない会社員";
const TONE = process.env.ARTICLE_TONE || "親しみやすい";
const TOPIC_HINT = process.env.ARTICLE_TOPIC || "";

const systemPrompt = `あなたはnote.comで人気の記事を書くプロのライターです。
読者: ${AUDIENCE}
文体・トーン: ${TONE}
${
  TOPIC_HINT
    ? `今回のテーマ: ${TOPIC_HINT}`
    : "今回のテーマはあなたが自由に決めてください（似た切り口の繰り返しを避けること）"
}

出力は必ず次のJSON形式のみで返してください。説明文やコードブロックの記号（\`\`\`）は一切つけないこと。
{"title": "記事タイトル", "body": "記事本文（見出しや改行を含むMarkdown形式、2000〜3000文字目安）"}`;

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: "上記の条件で記事を1本作成してください。" }],
  }),
});

if (!response.ok) {
  console.error("Claude API エラー:", response.status, await response.text());
  process.exit(1);
}

const data = await response.json();
const textBlock = data.content?.find((b) => b.type === "text");
if (!textBlock) {
  console.error("記事本文を取得できませんでした:", JSON.stringify(data));
  process.exit(1);
}

let article;
try {
  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  article = JSON.parse(cleaned);
} catch {
  console.error("JSONパースに失敗しました。Claudeの応答:\n", textBlock.text);
  process.exit(1);
}

await writeFile("article.json", JSON.stringify(article, null, 2), "utf-8");
console.log("記事を生成しました:", article.title);
