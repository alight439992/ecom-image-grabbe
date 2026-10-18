/**
 * content.js —— 注入悬浮按钮 + 提取页面所有商品图片
 * 仅在淘宝/京东/拼多多详情页运行
 */

(function () {
  'use strict';

  // 避免重复注入
  if (window.__imgGrabberInjected) return;
  window.__imgGrabberInjected = true;

  // ===== 1. 创建悬浮按钮 =====
  const btn = document.createElement('button');
  btn.id = 'img-grab-btn';
  btn.textContent = '获取图片';
  document.body.appendChild(btn);

  btn.addEventListener('click', async () => {
    btn.classList.add('loading');
    btn.textContent = '提取中...';

    try {
      const images = collectImages();
      if (images.length === 0) {
        alert('未在当前页面提取到商品图片，请滚动页面加载后再试');
        return;
      }

      // 把图片列表存到 storage，供 gallery 页面读取
      await chrome.storage.local.set({ __grabImages: images });

      // 通知 background 打开画廊新标签页（content script 不能直接调 tabs.create）
      await chrome.runtime.sendMessage({ type: 'OPEN_GALLERY' });
    } catch (err) {
      console.error('[图提取] 提取失败:', err);
      alert('提取失败：' + err.message);
    } finally {
      btn.classList.remove('loading');
      btn.textContent = '获取图片';
    }
  });

  // ===== 2. 图片提取核心逻辑 =====
  function collectImages() {
    const set = new Set(); // 去重

    // 2.1 遍历所有 <img> 标签
    document.querySelectorAll('img').forEach(img => {
      // 按优先级取真实图片地址（兼容懒加载）
      const candidates = [
        img.getAttribute('data-src'),
        img.getAttribute('data-lazy-src'),
        img.getAttribute('data-original'),
        img.getAttribute('data-ks-lazyload'),
        img.getAttribute('src')
      ];

      // 解析 srcset（可能包含多个 url）
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(item => {
          const url = item.trim().split(' ')[0];
          if (url) candidates.push(url);
        });
      }

      candidates.forEach(u => {
        if (u && isValidImageUrl(u)) set.add(normalizeUrl(u));
      });
    });

    // 2.2 遍历所有元素的 CSS background-image
    document.querySelectorAll('*').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') return;
      // 匹配 url("xxx") 或 url(xxx)
      const matches = bg.matchAll(/url\(["']?([^"')]+)["']?\)/g);
      for (const m of matches) {
        const u = m[1];
        if (u && isValidImageUrl(u)) set.add(normalizeUrl(u));
      }
    });

    // 2.3 过滤掉小图、图标、占位图
    const result = [];
    set.forEach(url => {
      if (isLikelyProductImage(url)) result.push(url);
    });

    return result;
  }

  // 判断是否为有效图片 URL（排除 data: 占位图、base64 图标等）
  function isValidImageUrl(u) {
    if (!u) return false;
    u = u.trim();
    if (u.startsWith('data:image/gif') || u.startsWith('data:image/svg')) return false;
    if (u.includes('blank.gif') || u.includes('placeholder')) return false;
    if (u.startsWith('data:image')) return false; // 跳过内联小图
    return true;
  }

  // 相对路径补全为绝对 URL
  function normalizeUrl(u) {
    try {
      return new URL(u, location.origin).href;
    } catch {
      return u;
    }
  }

  // 启发式判断是否为商品图（排除图标、logo、1x1 像素图等）
  function isLikelyProductImage(url) {
    const lower = url.toLowerCase();
    // 排除明显的图标/logo/头像
    const excludeKeywords = [
      'icon', 'logo', 'avatar', 'headico', 'loading',
      'spinner', 'blank', 'default', 'pixel', 'sprite'
    ];
    if (excludeKeywords.some(k => lower.includes(k))) return false;

    // 排除常见的 1x1 追踪像素
    if (lower.includes('1x1') || lower.includes('pixel')) return false;

    return true;
  }
})();
