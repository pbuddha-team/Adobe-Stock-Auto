#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

loadDotEnv();

const PRODUCTS_ROOT = process.env.DROPBOX_PRODUCTS_ROOT || "/Pixelbuddha/Products";
const MAX_SEARCH_PAGES = Number(process.env.DROPBOX_MAX_SEARCH_PAGES || 25);
const MAX_PSD_BYTES = Number(process.env.DROPBOX_MAX_PSD_MB || 500) * 1024 * 1024;
const STEP1_LOG_PATH = process.env.STEP1_LOG_PATH || "step1-log.json";
const COMMANDS = new Map([
  ["today", 0],
  ["prodtoday", 0],
  ["/prodtoday", 0],
  ["yesterday", -1],
  ["yes", -1],
  ["prodyes", -1],
  ["/prodyes", -1],
]);

const args = process.argv.slice(2);
const mode = ["fetch", "batch", "auto", "step1", "auth-url", "auth-code"].includes(args[0]) ? args[0] : "lookup";
const commandPosition = mode === "lookup" ? 0 : 1;
const defaultCommand = mode === "batch" ? "yesterday" : "today";
const commandWasProvided = Boolean(args[commandPosition]) && !args[commandPosition].startsWith("--");
const command = commandWasProvided ? args[commandPosition] : defaultCommand;
const optionsStart = commandWasProvided ? commandPosition + 1 : commandPosition;
const options = parseOptions(args.slice(optionsStart));
const dayOffset = COMMANDS.get(command);

if (!["step1", "auth-url", "auth-code"].includes(mode) && dayOffset === undefined && !options.date) {
  exitWithUsage(`Unknown command: ${command}`);
}

main(dayOffset, mode, options, args).catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});

async function main(offsetDays, mode, options, args) {
  if (mode === "auth-url") {
    printAuthUrl();
    return;
  }

  if (mode === "auth-code") {
    await exchangeAuthCode(args[1]);
    return;
  }

  const token = await getAccessToken();
  if (mode === "step1") {
    await printAdobeAutoProducts(token, resolveTargetDate(0, options), { ...options, download: true });
    return;
  }

  const targetDate = resolveTargetDate(offsetDays, options);
  const dateCode = getDateCode(targetDate);

  if (mode === "auto") {
    await printAdobeAutoProducts(token, targetDate, options);
    return;
  }

  if (mode === "batch") {
    const products = await findProductsWithRootFile(token, dateCode, "auto.md");
    printResults(dateCode, products, "root auto.md");
    await downloadBatch(token, products, options);
    return;
  }

  const products = await findProductsWithAdobe(token, dateCode);
  printResults(dateCode, products, "non-empty Adobe folders");

  if (mode === "fetch") {
    await fetchProducts(token, dateCode, products, options);
  }
}

async function findProductFolders(token, dateCode) {
  const productNamePattern = new RegExp(`^[A-Z]${escapeRegExp(dateCode)}\\s-\\s.+`);
  const matches = await searchByDateCode(token, dateCode);
  const foldersByPath = new Map();

  for (const match of matches) {
    const metadata = match?.metadata?.metadata || match?.metadata;
    if (!metadata || metadata[".tag"] !== "folder") continue;
    if (!productNamePattern.test(metadata.name)) continue;

    const path = metadata.path_display || metadata.path_lower;
    if (!path) continue;
    foldersByPath.set(path.toLowerCase(), {
      id: metadata.id,
      name: metadata.name,
      path,
      productId: metadata.name.split(" - ", 1)[0],
    });
  }

  return [...foldersByPath.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function findProductsWithAdobe(token, dateCode) {
  const folders = await findProductFolders(token, dateCode);
  const products = [];
  for (const folder of folders) {
    const adobePath = `${folder.path.replace(/\/$/, "")}/Adobe`;
    if (!(await folderHasItems(token, adobePath))) continue;

    products.push({
      productId: folder.productId,
      folderName: folder.name,
      path: folder.path,
      link: await getSharedLink(token, folder.path),
    });
  }

  return products.sort((a, b) => a.folderName.localeCompare(b.folderName));
}

async function findProductsWithRootFile(token, dateCode, fileName) {
  const folders = await findProductFolders(token, dateCode);
  const products = [];

  for (const folder of folders) {
    const filePath = `${folder.path.replace(/\/$/, "")}/${fileName}`;
    if (!(await fileExists(token, filePath))) continue;

    products.push({
      productId: folder.productId,
      folderName: folder.name,
      path: folder.path,
      link: await getSharedLink(token, folder.path),
    });
  }

  return products.sort((a, b) => a.folderName.localeCompare(b.folderName));
}

async function getAccessToken() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (refreshToken && appKey && appSecret) {
    const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(`Dropbox OAuth failed: ${JSON.stringify(body)}`);
    }

    return body.access_token;
  }

  if (process.env.DROPBOX_ACCESS_TOKEN) {
    return process.env.DROPBOX_ACCESS_TOKEN;
  }

  if (!refreshToken || !appKey || !appSecret) {
    exitWithUsage(
      "Set DROPBOX_ACCESS_TOKEN, or set DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, and DROPBOX_APP_SECRET.",
    );
  }
}

function getRequiredConfig(key) {
  const value = process.env[key];
  if (!value) {
    exitWithUsage(`Set ${key} in .env first.`);
  }
  return value;
}

function printAuthUrl() {
  const appKey = getRequiredConfig("DROPBOX_APP_KEY");
  const scope = [
    "files.metadata.read",
    "files.content.read",
    "sharing.read",
    "sharing.write",
  ].join(" ");
  const url = new URL("https://www.dropbox.com/oauth2/authorize");
  url.searchParams.set("client_id", appKey);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("token_access_type", "offline");
  url.searchParams.set("scope", scope);

  console.log(url.toString());
}

async function exchangeAuthCode(code) {
  if (!code) {
    exitWithUsage("Pass the Dropbox authorization code: node scripts/dropbox-products.mjs auth-code <code>");
  }

  const appKey = getRequiredConfig("DROPBOX_APP_KEY");
  const appSecret = getRequiredConfig("DROPBOX_APP_SECRET");
  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Dropbox OAuth exchange failed: ${JSON.stringify(body)}`);
  }

  await updateDotEnv("DROPBOX_ACCESS_TOKEN", body.access_token);
  if (body.refresh_token) {
    await updateDotEnv("DROPBOX_REFRESH_TOKEN", body.refresh_token);
  }

  console.log("Updated .env with Dropbox OAuth tokens.");
  console.log(`Granted scopes: ${body.scope || "(not returned)"}`);
}

async function searchByDateCode(token, dateCode) {
  const matches = [];
  let response = await dropboxRpc(token, "files/search_v2", {
    query: dateCode,
    options: {
      path: PRODUCTS_ROOT,
      filename_only: true,
      file_status: "active",
      max_results: 1000,
    },
  });

  matches.push(...(response.matches || []));

  for (let page = 1; response.has_more && response.cursor && page < MAX_SEARCH_PAGES; page += 1) {
    response = await dropboxRpc(token, "files/search/continue_v2", {
      cursor: response.cursor,
    });
    matches.push(...(response.matches || []));
  }

  return matches;
}

async function folderHasItems(token, path) {
  try {
    const response = await dropboxRpc(token, "files/list_folder", {
      path,
      recursive: false,
      include_deleted: false,
      include_non_downloadable_files: true,
      limit: 1,
    });
    return (response.entries || []).length > 0;
  } catch (error) {
    if (error.dropboxTag === "path") return false;
    throw error;
  }
}

async function fileExists(token, path) {
  try {
    const metadata = await dropboxRpc(token, "files/get_metadata", {
      path,
      include_deleted: false,
    });
    return metadata[".tag"] === "file";
  } catch (error) {
    if (error.dropboxTag === "path") return false;
    throw error;
  }
}

async function downloadBatch(token, products, options) {
  const batchFolderName = getBatchFolderName(resolveTargetDate(0, options));
  const destinationRoot = resolve(options.dest || process.env.DROPBOX_BATCH_ROOT || ".");
  const batchRoot = resolve(destinationRoot, batchFolderName);

  if (products.length === 0) return;

  console.log("");
  console.log(`Batch folder: ${formatLocalPath(batchRoot)}`);

  for (const product of products) {
    const localRoot = join(batchRoot, safePathSegment(product.folderName));
    await downloadDropboxFolder(token, product.path, localRoot, options);
  }
}

async function fetchProducts(token, dateCode, products, options) {
  const subdir = options.subdir || process.env.DROPBOX_FETCH_SUBDIR || "Adobe";
  const destinationRoot = resolve(options.dest || process.env.DROPBOX_FETCH_DEST || "dropbox-products");
  const limit = options.limit ? Number(options.limit) : undefined;
  let downloadedCount = 0;

  if (products.length === 0) return;

  console.log("");
  console.log(`Downloading ${subdir} files into ${destinationRoot}`);

  for (const product of products) {
    const sourceRoot = `${product.path.replace(/\/$/, "")}/${subdir.replace(/^\/+/, "")}`;
    const localRoot = join(destinationRoot, dateCode, safePathSegment(product.folderName));
    const result = await downloadDropboxFolder(token, sourceRoot, localRoot, {
      ...options,
      limit: limit === undefined ? undefined : limit - downloadedCount,
      label: product.productId,
    });
    downloadedCount += result.downloadedCount;

    if (limit !== undefined && downloadedCount >= limit) return;
  }
}

async function downloadDropboxFolder(token, sourceRoot, localRoot, options) {
  const limit = options.limit === undefined ? undefined : Number(options.limit);
  const entries = await listFilesRecursively(token, sourceRoot);
  const files = entries.filter((entry) => entry[".tag"] === "file");
  let downloadedCount = 0;
  const events = [];

  console.log("");
  console.log(`${options.label || sourceRoot}: ${files.length} file(s)`);

  for (const file of files) {
    const filePath = file.path_display || file.path_lower;
    const relativePath = relativeDropboxPath(sourceRoot, filePath);
    if (shouldSkipLargePsd(file, MAX_PSD_BYTES)) {
      console.log(`  Skipping ${relativePath} (${formatBytes(file.size)} PSD over ${formatBytes(MAX_PSD_BYTES)})`);
      events.push({
        action: "skipped",
        reason: "psd_over_size_limit",
        path: relativePath,
        dropboxPath: filePath,
        sizeBytes: file.size || 0,
        limitBytes: MAX_PSD_BYTES,
      });
      continue;
    }

    if (limit !== undefined && downloadedCount >= limit) {
      console.log(`Download limit reached: ${limit}`);
      break;
    }

    const target = resolve(localRoot, relativePath);
    if (!target.startsWith(`${localRoot}/`) && target !== localRoot) {
      throw new Error(`Refusing to write outside destination: ${target}`);
    }

    console.log(`  ${options.dryRun ? "Would download" : "Downloading"} ${relativePath}`);
    try {
      if (!options.dryRun) {
        await downloadFile(token, filePath, target);
      }
      events.push({
        action: options.dryRun ? "would_download" : "downloaded",
        path: relativePath,
        dropboxPath: filePath,
        localPath: formatLocalPath(target),
        sizeBytes: file.size || 0,
      });
      downloadedCount += 1;
    } catch (error) {
      events.push({
        action: "failed",
        reason: "download_failed",
        path: relativePath,
        dropboxPath: filePath,
        sizeBytes: file.size || 0,
        error: error.message,
      });
      throw error;
    }
  }

  return { downloadedCount, events, totalFiles: files.length };
}

async function listFilesRecursively(token, path) {
  const entries = [];
  let response = await dropboxRpc(token, "files/list_folder", {
    path,
    recursive: true,
    include_deleted: false,
    include_non_downloadable_files: false,
  });

  entries.push(...(response.entries || []));

  while (response.has_more && response.cursor) {
    response = await dropboxRpc(token, "files/list_folder/continue", {
      cursor: response.cursor,
    });
    entries.push(...(response.entries || []));
  }

  return entries;
}

async function downloadFile(token, path, target) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Dropbox-API-Arg": JSON.stringify({ path }),
  };

  if (process.env.DROPBOX_SELECT_USER) {
    headers["Dropbox-API-Select-User"] = process.env.DROPBOX_SELECT_USER;
  }

  if (process.env.DROPBOX_PATH_ROOT_NAMESPACE_ID) {
    headers["Dropbox-API-Path-Root"] = JSON.stringify({
      ".tag": "namespace_id",
      namespace_id: process.env.DROPBOX_PATH_ROOT_NAMESPACE_ID,
    });
  }

  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox files/download failed for ${path}: ${text}`);
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

async function downloadText(token, path) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Dropbox-API-Arg": JSON.stringify({ path }),
  };

  if (process.env.DROPBOX_SELECT_USER) {
    headers["Dropbox-API-Select-User"] = process.env.DROPBOX_SELECT_USER;
  }

  if (process.env.DROPBOX_PATH_ROOT_NAMESPACE_ID) {
    headers["Dropbox-API-Path-Root"] = JSON.stringify({
      ".tag": "namespace_id",
      namespace_id: process.env.DROPBOX_PATH_ROOT_NAMESPACE_ID,
    });
  }

  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Dropbox files/download failed for ${path}: ${text}`);
  }

  return text;
}

async function printAdobeAutoProducts(token, targetDate, options) {
  const autoJsonPath = await resolveAutoJsonPath(token, options.path || process.env.DROPBOX_AUTO_JSON_PATH);
  const text = await downloadText(token, autoJsonPath);
  const data = JSON.parse(text);
  const markers = getDateMarkers(targetDate);
  const records = collectObjectRecords(data);
  const products = records
    .filter((record) => isAdobeAutoRecord(record, markers) || isAutoQueueRecord(record, markers))
    .map((record) => summarizeAutoRecord(record))
    .sort((a, b) => String(a.productId).localeCompare(String(b.productId)));

  console.log(`Adobe auto products for ${markers.iso}`);
  console.log(`Source: ${autoJsonPath}`);
  console.log("");

  if (products.length === 0) {
    console.log("No matching Adobe auto products found.");
    if (options.debug) {
      printAutoJsonDebug(records);
    }
    return;
  }

  for (const product of products) {
    console.log(`- ${product.productId || "(no id)"} | ${product.name || "(no name)"}`);
    if (product.path) console.log(`  Path: ${product.path}`);
    if (product.link) console.log(`  Link: ${product.link}`);
  }

  if (options.download) {
    const log = createStep1Log(targetDate, autoJsonPath, products, options);
    await downloadAutoProducts(token, products, targetDate, options, log);
    finishStep1Log(log);
    await writeStep1Log(log, options);
  }
}

async function resolveAutoJsonPath(token, explicitPath) {
  const candidates = explicitPath
    ? [explicitPath]
    : [`${PRODUCTS_ROOT.replace(/\/$/, "")}/auto.json`, "/Products/auto.json"];

  let lastError;
  for (const candidate of candidates) {
    try {
      await downloadText(token, candidate);
      return candidate;
    } catch (error) {
      lastError = error;
      if (!String(error.message).includes("not_found")) continue;
    }
  }

  throw lastError;
}

async function downloadAutoProducts(token, products, targetDate, options, log) {
  const batchFolderName = getBatchFolderName(targetDate);
  const destinationRoot = resolve(options.dest || process.env.DROPBOX_BATCH_ROOT || ".");
  const batchRoot = resolve(destinationRoot, batchFolderName);

  console.log("");
  console.log(`Batch folder: ${formatLocalPath(batchRoot)}`);

  for (const product of products) {
    if (!product.path) continue;
    const localRoot = join(batchRoot, safePathSegment(product.name || product.path.split("/").filter(Boolean).at(-1)));
    const productLog = log?.products.find((entry) => entry.dropboxPath === product.path);
    try {
      const result = await downloadDropboxFolder(token, product.path, localRoot, {
        ...options,
        label: product.name || product.path,
      });
      if (productLog) {
        productLog.localPath = formatLocalPath(localRoot);
        productLog.status = result.events.some((event) => event.action === "failed") ? "failed" : "synced";
        productLog.totalFiles = result.totalFiles;
        productLog.files = result.events;
        productLog.summary = summarizeEvents(result.events);
      }
    } catch (error) {
      if (productLog) {
        productLog.localPath = formatLocalPath(localRoot);
        productLog.status = "failed";
        productLog.error = error.message;
      }
      throw error;
    }
  }
}

async function writeStep1Log(log, options) {
  if (options.dryRun) {
    console.log("");
    console.log("Dry run: not writing Step 1 log.");
    return;
  }

  const logPath = resolve(options.log || STEP1_LOG_PATH);
  const root = readStep1Log(logPath);
  root.runs.push(log);
  root.summary = {
    totalRuns: root.runs.length,
    lastRunAt: log.finishedAt,
    lastRequestedDate: log.requestedDate,
    lastBatchFolder: log.batchFolder,
  };
  await writeFile(logPath, `${JSON.stringify(root, null, 2)}\n`);
  console.log("");
  console.log(`Step 1 log written: ${formatLocalPath(logPath)}`);
}

function createStep1Log(targetDate, autoJsonPath, products, options) {
  const batchFolderName = getBatchFolderName(targetDate);
  const now = new Date();
  return {
    schemaVersion: 1,
    step: "fetching",
    requestedDate: toIsoDate(targetDate),
    batchFolder: batchFolderName,
    dryRun: Boolean(options.dryRun),
    startedAt: now.toISOString(),
    finishedAt: null,
    source: {
      dropboxAutoJsonPath: autoJsonPath,
    },
    products: products.map((product) => ({
      name: product.name || "",
      productId: product.productId || "",
      dropboxPath: product.path || "",
      localPath: "",
      status: "pending",
      totalFiles: 0,
      summary: {
        downloaded: 0,
        wouldDownload: 0,
        skipped: 0,
        failed: 0,
      },
      files: [],
    })),
    summary: {
      productsFound: products.length,
      productsSynced: 0,
      productsFailed: 0,
      filesDownloaded: 0,
      filesWouldDownload: 0,
      filesSkipped: 0,
      filesFailed: 0,
    },
  };
}

function finishStep1Log(log) {
  log.finishedAt = new Date().toISOString();
  log.summary.productsSynced = log.products.filter((product) => product.status === "synced").length;
  log.summary.productsFailed = log.products.filter((product) => product.status === "failed").length;
  log.summary.filesDownloaded = sumProductSummary(log.products, "downloaded");
  log.summary.filesWouldDownload = sumProductSummary(log.products, "wouldDownload");
  log.summary.filesSkipped = sumProductSummary(log.products, "skipped");
  log.summary.filesFailed = sumProductSummary(log.products, "failed");
}

function summarizeEvents(events) {
  return {
    downloaded: events.filter((event) => event.action === "downloaded").length,
    wouldDownload: events.filter((event) => event.action === "would_download").length,
    skipped: events.filter((event) => event.action === "skipped").length,
    failed: events.filter((event) => event.action === "failed").length,
  };
}

function sumProductSummary(products, key) {
  return products.reduce((sum, product) => sum + Number(product.summary?.[key] || 0), 0);
}

function readStep1Log(path) {
  if (!existsSync(path)) {
    return {
      schemaVersion: 1,
      log: "pixelbuddha-adobe-stock-automation-step1",
      runs: [],
      summary: {
        totalRuns: 0,
        lastRunAt: null,
        lastRequestedDate: null,
        lastBatchFolder: null,
      },
    };
  }

  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed.runs)) {
    parsed.runs = [];
  }
  if (!parsed.summary) {
    parsed.summary = {};
  }
  return parsed;
}

async function getSharedLink(token, path) {
  const visibility = process.env.DROPBOX_SHARED_LINK_VISIBILITY;
  const createBody = { path };
  if (visibility) {
    createBody.settings = { requested_visibility: visibility };
  }

  try {
    const created = await dropboxRpc(token, "sharing/create_shared_link_with_settings", createBody);
    return created.url;
  } catch (error) {
    if (error.dropboxTag !== "shared_link_already_exists") {
      throw error;
    }
  }

  const existing = await dropboxRpc(token, "sharing/list_shared_links", {
    path,
    direct_only: true,
  });

  return existing.links?.[0]?.url || "";
}

async function dropboxRpc(token, endpoint, body) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (process.env.DROPBOX_SELECT_USER) {
    headers["Dropbox-API-Select-User"] = process.env.DROPBOX_SELECT_USER;
  }

  if (process.env.DROPBOX_PATH_ROOT_NAMESPACE_ID) {
    headers["Dropbox-API-Path-Root"] = JSON.stringify({
      ".tag": "namespace_id",
      namespace_id: process.env.DROPBOX_PATH_ROOT_NAMESPACE_ID,
    });
  }

  const response = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const data = parseDropboxResponse(text);

  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    const error = new Error(`Dropbox ${endpoint} failed: ${detail}`);
    error.dropboxTag = data?.error?.[".tag"];
    error.dropboxError = data;
    throw error;
  }

  return data;
}

function getDateCode(targetDate) {
  const day = String(targetDate.getDate()).padStart(2, "0");
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  return `${day}${month}`;
}

function getBatchFolderName(targetDate) {
  const day = String(targetDate.getDate()).padStart(2, "0");
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const year = String(targetDate.getFullYear()).slice(-2);
  return `Batch${day}${month}${year}`;
}

function printResults(dateCode, products, filterDescription) {
  console.log(`Dropbox products for ${dateCode}`);
  if (filterDescription) {
    console.log(`Filter: ${filterDescription}`);
  }
  console.log("");

  if (products.length === 0) {
    console.log("No matching products.");
    return;
  }

  for (const product of products) {
    console.log(`- ${product.productId} | ${product.folderName}`);
    console.log(`  Path: ${product.path}`);
    console.log(`  Link: ${product.link}`);
  }
}

function exitWithUsage(message) {
  console.error(message);
  console.error("");
  console.error("Usage:");
  console.error("  DROPBOX_ACCESS_TOKEN=... node scripts/dropbox-products.mjs today");
  console.error("  DROPBOX_ACCESS_TOKEN=... node scripts/dropbox-products.mjs yesterday");
  console.error("  DROPBOX_ACCESS_TOKEN=... node scripts/dropbox-products.mjs fetch today");
  console.error("  DROPBOX_ACCESS_TOKEN=... node scripts/dropbox-products.mjs fetch yesterday --subdir Adobe --dest dropbox-products");
  console.error("  DROPBOX_ACCESS_TOKEN=... node scripts/dropbox-products.mjs batch --dry-run");
  console.error("  DROPBOX_ACCESS_TOKEN=... node scripts/dropbox-products.mjs auto today");
  console.error("  DROPBOX_ACCESS_TOKEN=... node scripts/dropbox-products.mjs auto today --download");
  console.error("  node scripts/dropbox-products.mjs step1");
  console.error("  node scripts/dropbox-products.mjs step1 --date 2026-05-18");
  console.error("  node scripts/dropbox-products.mjs step1 --dry-run");
  console.error("  node scripts/dropbox-products.mjs auth-url");
  console.error("  node scripts/dropbox-products.mjs auth-code <dropbox-code>");
  console.error("");
  console.error("Optional env vars:");
  console.error("  DROPBOX_PRODUCTS_ROOT=/Pixelbuddha/Products");
  console.error("  DROPBOX_SELECT_USER=<team member id>");
  console.error("  DROPBOX_PATH_ROOT_NAMESPACE_ID=<team namespace id>");
  console.error("  DROPBOX_BATCH_ROOT=.");
  process.exit(2);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDropboxResponse(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseOptions(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--dry-run") {
      parsed.dryRun = true;
    } else if (value === "--subdir") {
      parsed.subdir = values[++index];
    } else if (value === "--dest") {
      parsed.dest = values[++index];
    } else if (value === "--limit") {
      parsed.limit = values[++index];
    } else if (value === "--path") {
      parsed.path = values[++index];
    } else if (value === "--debug") {
      parsed.debug = true;
    } else if (value === "--download") {
      parsed.download = true;
    } else if (value === "--date") {
      parsed.date = values[++index];
    } else if (value === "--log") {
      parsed.log = values[++index];
    } else {
      exitWithUsage(`Unknown option: ${value}`);
    }
  }
  return parsed;
}

function relativeDropboxPath(root, child) {
  const normalizedRoot = root.toLowerCase().replace(/\/$/, "");
  const normalizedChild = child.toLowerCase();
  if (!normalizedChild.startsWith(`${normalizedRoot}/`)) {
    return safePathSegment(child.split("/").pop() || "download");
  }
  return child.slice(root.replace(/\/$/, "").length + 1);
}

function safePathSegment(value) {
  return value.replace(/[/:]/g, "_").replace(/\s+/g, " ").trim();
}

function shouldSkipLargePsd(file, maxBytes) {
  const path = file.path_display || file.path_lower || "";
  return path.toLowerCase().endsWith(".psd") && Number(file.size || 0) > maxBytes;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatLocalPath(path) {
  const relativePath = relative(process.cwd(), path);
  if (!relativePath || relativePath === "") return ".";
  if (!relativePath.startsWith("..") && !relativePath.startsWith("/")) {
    return `./${relativePath}`;
  }
  return path;
}

async function updateDotEnv(key, value) {
  const path = resolve(".env");
  const lines = existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : [];
  let updated = false;
  const next = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      updated = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!updated) {
    next.push(`${key}=${value}`);
  }

  await writeFile(path, `${next.join("\n").replace(/\n*$/, "")}\n`);
}

function resolveTargetDate(offsetDays, options) {
  if (options.date) {
    return parseCliDate(options.date);
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
}

function parseCliDate(value) {
  const iso = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const dmy = String(value).trim().match(/^(\d{2})(\d{2})(\d{2}|\d{4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? Number(`20${dmy[3]}`) : Number(dmy[3]);
    return new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
  }

  exitWithUsage(`Invalid --date value: ${value}. Use YYYY-MM-DD or DDMMYY.`);
}

function getDateMarkers(targetDate) {
  const day = String(targetDate.getDate()).padStart(2, "0");
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const year = String(targetDate.getFullYear());
  const shortYear = year.slice(-2);

  return {
    iso: `${year}-${month}-${day}`,
    values: new Set([
      `${year}-${month}-${day}`,
      `${day}.${month}.${year}`,
      `${day}/${month}/${year}`,
      `${day}-${month}-${year}`,
      `${day}${month}${shortYear}`,
      `${day}${month}${year}`,
      `${day}${month}`,
    ]),
  };
}

function collectObjectRecords(value, path = "$") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectObjectRecords(item, `${path}[${index}]`));
  }

  if (!value || typeof value !== "object") return [];

  const nested = Object.entries(value).flatMap(([key, item]) => collectObjectRecords(item, `${path}.${key}`));
  return [{ path, value }, ...nested];
}

function isAdobeAutoRecord(record, markers) {
  const pairs = flattenRecord(record.value, record.path);
  const hasDate = pairs.some(({ key, value }) => {
    const text = `${key} ${value}`.toLowerCase();
    return [...markers.values].some((marker) => text.includes(marker.toLowerCase()));
  });

  const hasAdobeAuto = pairs.some(({ key, value }) => {
    const keyText = key.toLowerCase();
    const valueText = String(value).toLowerCase();
    const text = `${keyText} ${valueText}`;

    if (keyText.includes("adobe") && keyText.includes("auto") && truthyValue(value)) return true;
    if (keyText.includes("adobe") && valueText.includes("auto")) return true;
    if (keyText.includes("auto") && valueText.includes("adobe")) return true;
    if (text.includes("adobe auto") || text.includes("auto adobe")) return true;
    return false;
  });

  return hasDate && hasAdobeAuto && looksProductLike(record.value);
}

function isAutoQueueRecord(record, markers) {
  const value = record.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!("date" in value) || !("path" in value)) return false;

  return dateMatches(value.date, markers);
}

function flattenRecord(value, path = "$") {
  if (!value || typeof value !== "object") {
    return [{ key: path, value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenRecord(item, `${path}[${index}]`));
  }

  return Object.entries(value).flatMap(([key, item]) => flattenRecord(item, `${path}.${key}`));
}

function truthyValue(value) {
  if (value === true) return true;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["true", "yes", "1", "enabled", "on", "auto", "adobe"].includes(value.toLowerCase());
  }
  return Boolean(value);
}

function looksProductLike(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).map((key) => key.toLowerCase());
  return keys.some((key) => ["id", "productid", "product_id", "name", "title", "folder", "path"].includes(key));
}

function summarizeAutoRecord(record) {
  const path = pickField(record.value, ["path", "dropboxPath", "dropbox_path", "folderPath", "folder_path"]);
  const folderName = path ? path.split("/").filter(Boolean).at(-1) : "";
  const productIdFromFolder = folderName.match(/^\d+/)?.[0] || "";

  return {
    productId: pickField(record.value, ["productId", "product_id", "id", "number", "sku"]) || productIdFromFolder,
    name: pickField(record.value, ["folderName", "folder", "name", "title", "productName", "product_name"]) || folderName,
    path,
    link: pickField(record.value, ["link", "url", "sharedLink", "shared_link"]),
  };
}

function dateMatches(value, markers) {
  const normalized = normalizeDateValue(value);
  if (!normalized) return false;
  return markers.values.has(normalized) || normalized === markers.iso;
}

function normalizeDateValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") {
    const date = new Date(value > 100000000000 ? value : value * 1000);
    if (Number.isNaN(date.getTime())) return String(value);
    return toIsoDate(date);
  }

  const text = String(value).trim();
  const directDate = new Date(text);
  if (!Number.isNaN(directDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(text)) {
    return toIsoDate(directDate);
  }

  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }

  return text;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pickField(value, names) {
  if (!value || typeof value !== "object") return "";
  const entries = Object.entries(value);
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (match && match[1] !== undefined && match[1] !== null) return String(match[1]);
  }
  return "";
}

function printAutoJsonDebug(records) {
  console.log("");
  console.log("Debug: first object records");
  for (const record of records.slice(0, 8)) {
    if (!record.value || typeof record.value !== "object" || Array.isArray(record.value)) continue;
    console.log(`- ${record.path}: ${Object.keys(record.value).slice(0, 12).join(", ")}`);
  }
}

function loadDotEnv() {
  const path = resolve(".env");
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");

    if (!value) continue;

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
