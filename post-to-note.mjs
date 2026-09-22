#!/usr/bin/env node
/**
 * post-to-note.mjs
 *
 * article.json の内容を note.com に「下書き保存」する。
 *
 * 必要な環境変数:
 *   NOTE_EMAIL    … noteのログインメールアドレス
 *   NOTE_PASSWORD … noteのログインパスワード
 *
 * 注意: note.com側の画面の作り(セレクタ)は将来変わる可能性があります。
 *       うまく動かないときは before-save.png / error-screenshot.png を見て、
 *       実際の画面と照らし合わせながら調整してください。
 */

import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const EMAIL = process.env.NOTE_EMAIL;
const PASSWORD = process.env.NOTE_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("NOTE_EMAIL / NOTE_PASSWORD が設定されていません");
  process.exit(1);
}

const { title, body } = JSON.parse(await readFile("article.json", "utf-8"));

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  // 1. ログイン
  await page.goto("https://note.com/login");
  await page.fill('input[name="login"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("https://note.com/**", { timeout: 15000 });

  // 2. 新規記事作成ページへ
  await page.goto("https://note.com/notes/new");
  await page.waitForSelector('textarea[placeholder="記事タイトル"]', {
    timeout: 15000,
  });

  // 3. タイトルと本文を入力
  await page.fill('textarea[placeholder="記事タイトル"]', title);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await editor.type(body);

  // 保存前の状態を記録(うまく入力できているかの確認用)
  await page.screenshot({ path: "before-save.png", fullPage: true });

  // 4. 下書き保存
  await page.click("text=下書き保存");
  await page.waitForTimeout(2000);

  console.log("下書き保存しました:", title);
} catch (err) {
  console.error("エラーが発生しました:", err);
  await page.screenshot({ path: "error-screenshot.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
