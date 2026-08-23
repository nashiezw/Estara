import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const port = process.argv[2] || "9224";
const downloadDir = path.resolve(".chrome-marketing-downloads");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requestJson(method, url) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = http.request({ method, hostname: target.hostname, port: target.port, path: target.pathname + target.search }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try { resolve(JSON.parse(body || "{}")); }
        catch (error) { reject(error); }
      });
    });
    request.on("error", reject);
    request.end();
  });
}

function cdpSocket(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const ready = new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  const send = async (method, params = {}) => {
    await ready;
    return await new Promise((resolve, reject) => {
      const callId = ++id;
      const onMessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== callId) return;
        socket.removeEventListener("message", onMessage);
        message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
      };
      socket.addEventListener("message", onMessage);
      socket.send(JSON.stringify({ id: callId, method, params }));
    });
  };
  return { socket, send, ready };
}

async function main() {
  fs.mkdirSync(downloadDir, { recursive: true });
  const before = new Set(fs.readdirSync(downloadDir));
  const browserInfo = await requestJson("GET", `http://127.0.0.1:${port}/json/version`);
  const browser = cdpSocket(browserInfo.webSocketDebuggerUrl);
  await browser.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir, eventsEnabled: true });

  const target = await requestJson("PUT", `http://127.0.0.1:${port}/json/new?${encodeURIComponent("http://localhost:3004/marketing-studio")}`);
  const page = cdpSocket(target.webSocketDebuggerUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await page.send("Runtime.evaluate", { expression: "document.readyState + '|' + document.body.innerText.slice(0, 500)", returnByValue: true });
    if (String(state.result.value).includes("Download")) break;
    await sleep(500);
  }

  const state = await page.send("Runtime.evaluate", {
    expression: "({ url: location.href, text: document.body.innerText.slice(0, 1000), buttons: [...document.querySelectorAll('button')].map((button) => button.innerText).filter(Boolean).slice(0, 30) })",
    returnByValue: true,
  });
  console.log("STATE", JSON.stringify(state.result.value));

  const clicked = await page.send("Runtime.evaluate", {
    expression: "(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Download'); if (!button) return { clicked: false, reason: 'button missing' }; button.click(); return { clicked: true }; })()",
    returnByValue: true,
    awaitPromise: true,
  });
  console.log("CLICK", JSON.stringify(clicked.result.value));

  await sleep(10000);
  const added = fs.readdirSync(downloadDir).filter((file) => !before.has(file));
  const result = await page.send("Runtime.evaluate", {
    expression: "({ error: [...document.querySelectorAll('.studio-error')].map((item) => item.innerText), message: [...document.querySelectorAll('.studio-message')].map((item) => item.innerText) })",
    returnByValue: true,
  });
  console.log("RESULT", JSON.stringify({ added, page: result.result.value }));

  const hasDownloadedFile = added.some((file) => /\.(png|jpe?g|svg)$/i.test(file));
  const hasPreviewError = (result.result.value.error || []).join(" ").includes("Preview image could not be prepared");
  process.exit(hasDownloadedFile && !hasPreviewError ? 0 : 2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
