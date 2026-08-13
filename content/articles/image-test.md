---
title: "图片测试"
date: "2026-08-13"
tags:
  - 测试
  - 图片
category: "随笔"
summary: "测试在 Markdown 文章中插入 public 目录图片的完整流程。"
cover: "/images/logo2.png"
draft: false
---

## 图片插入测试

这是一篇专门用来测试图片插入的文章。

下面的图片存放在项目的 `public/images/` 目录中，通过相对网站根路径的方式引用：

![图片测试：Griver Logo](/images/logo2.png)

## 说明

- 图片文件：`public/images/logo2.png`
- 引用路径：`/images/logo2.png`
- `public` 目录下的资源会在构建后自动映射到网站根目录

如果图片能正常显示，说明图片存储与引用流程都已跑通。
