/**
 * background.js —— Service Worker
 * 负责接收 gallery 页面发来的下载请求，完成图片转 PNG 并调用 chrome.downloads
 */

// 监听来自 content script / gallery 页面的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // content script 请求打开画廊新标签页
  if (msg.type === 'OPEN_GALLERY') {
    const url = chrome.runtime.getURL('gallery.html');
    chrome.tabs.create({ url });
    sendResponse({ ok: true });
    return false;
  }

  // gallery 页面请求批量下载图片
  if (msg.type === 'DOWNLOAD_IMAGES') {
    handleDownloads(msg.urls)
      .then(results => sendResponse({ ok: true, results }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // 异步响应
  }
});

/**
 * 批量下载：逐个 fetch 图片 -> canvas 转 PNG -> chrome.downloads
 */
async function handleDownloads(urls) {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const pngBlob = await convertToPng(url);
      const objectUrl = URL.createObjectURL(pngBlob);
      const filename = `商品图_${String(i + 1).padStart(3, '0')}.png`;

      await chrome.downloads.download({
        url: objectUrl,
        filename: filename,
        saveAs: false
      });

      // 延迟释放 objectURL，避免下载未完成就被回收
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      results.push({ url, success: true });
    } catch (err) {
      console.error('[图提取] 下载失败:', url, err);
      results.push({ url, success: false, error: err.message });
    }
  }
  return results;
}

/**
 * fetch 远程图片 -> 用 OffscreenCanvas 重绘为 PNG
 * MV3 service worker 支持 createImageBitmap + OffscreenCanvas
 */
async function convertToPng(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();

  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);

  return await canvas.convertToBlob({ type: 'image/png' });
}
