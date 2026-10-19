# 图提取 - 电商图片批量下载 Chrome 插件

一键提取淘宝 / 京东 / 拼多多商品详情页所有图片，勾选后批量下载为 PNG。

## 安装步骤

1. 打开 Chrome，地址栏输入 `chrome://extensions` 回车
2. 右上角打开「开发者模式」开关
3. 点击左上角「加载已解压的扩展程序」
4. 选择本文件夹（包含 manifest.json 的那一层）
5. 打开任意淘宝 / 京东 / 拼多多商品详情页，右下角会出现「获取图片」按钮

## 使用方法

1. 在商品详情页滚动浏览（让懒加载图片加载出来）
2. 点击右下角「获取图片」按钮
3. 自动打开新标签页，网格展示所有提取到的图片
4. 点击卡片勾选 / 取消勾选，或用「全选」「反选」
5. 点击「下载选中」，图片自动转 PNG 保存到浏览器默认下载目录

## 文件结构

```
ecom-image-grabber/
├── manifest.json    # 插件配置（Manifest V3）
├── content.js       # 注入按钮 + 提取页面图片
├── content.css     # 悬浮按钮样式
├── background.js   # Service Worker：图片转 PNG + 下载
├── gallery.html     # 画廊页面
├── gallery.css      # 画廊样式
└── gallery.js       # 画廊交互逻辑
```
