/**
 * gallery.js —— 画廊页面：渲染图片、勾选、批量下载
 */

let images = [];        // 全部图片 URL
let selected = new Set(); // 选中的下标

const galleryEl = document.getElementById('gallery');
const totalEl = document.getElementById('totalCount');
const selectedEl = document.getElementById('selectedCount');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const downloadBtn = document.getElementById('downloadBtn');

// ===== 初始化：从 storage 读取图片列表 =====
init();

async function init() {
  const data = await chrome.storage.local.get('__grabImages');
  images = data.__grabImages || [];

  totalEl.textContent = images.length;

  if (images.length === 0) {
    galleryEl.innerHTML = '<div class="empty">未提取到图片，请回到商品详情页重新点击「获取图片」</div>';
    return;
  }

  renderGallery();
}

// ===== 渲染图片网格 =====
function renderGallery() {
  galleryEl.innerHTML = '';
  images.forEach((url, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.idx = idx;

    card.innerHTML = `
      <img src="${url}" alt="商品图${idx + 1}" loading="lazy" />
      <div class="meta">图片 ${idx + 1}</div>
      <div class="checkbox">✓</div>
    `;

    // 点击卡片切换选中
    card.addEventListener('click', () => toggleSelect(idx, card));

    galleryEl.appendChild(card);
  });
}

// ===== 勾选逻辑 =====
function toggleSelect(idx, cardEl) {
  if (selected.has(idx)) {
    selected.delete(idx);
    cardEl.classList.remove('checked');
  } else {
    selected.add(idx);
    cardEl.classList.add('checked');
  }
  updateCount();
}

function updateCount() {
  selectedEl.textContent = selected.size;
}

// ===== 全选 / 反选 =====
document.getElementById('selectAllBtn').addEventListener('click', () => {
  selected = new Set(images.map((_, i) => i));
  document.querySelectorAll('.card').forEach(c => c.classList.add('checked'));
  updateCount();
});

document.getElementById('invertBtn').addEventListener('click', () => {
  const newSel = new Set();
  document.querySelectorAll('.card').forEach(c => {
    const idx = Number(c.dataset.idx);
    if (selected.has(idx)) {
      c.classList.remove('checked');
    } else {
      newSel.add(idx);
      c.classList.add('checked');
    }
  });
  selected = newSel;
  updateCount();
});

// ===== 下载选中 =====
downloadBtn.addEventListener('click', async () => {
  if (selected.size === 0) {
    alert('请先勾选要下载的图片');
    return;
  }

  const urls = [...selected].sort((a, b) => a - b).map(i => images[i]);
  downloadBtn.disabled = true;
  progressBar.classList.remove('hidden');
  progressText.textContent = `开始下载 ${urls.length} 张图片...`;

  try {
    // 把下载任务交给 background service worker 处理
    const resp = await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_IMAGES',
      urls: urls
    });

    if (resp.ok) {
      const okCount = resp.results.filter(r => r.success).length;
      const failCount = resp.results.length - okCount;
      progressText.textContent = `下载完成：成功 ${okCount} 张` + (failCount ? `，失败 ${failCount} 张` : '');
      setTimeout(() => progressBar.classList.add('hidden'), 4000);
    } else {
      progressText.textContent = '下载出错：' + resp.error;
    }
  } catch (err) {
    progressText.textContent = '下载出错：' + err.message;
  } finally {
    downloadBtn.disabled = false;
  }
});
