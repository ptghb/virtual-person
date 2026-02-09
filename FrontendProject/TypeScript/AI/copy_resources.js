/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

"use strict";
const fs = require('fs');
const path = require('path');

// 检查是否在 Docker 环境中
const isDocker = fs.existsSync('/.dockerenv') || process.env.NODE_ENV === 'docker';

// Docker 环境中使用挂载的路径，本地环境使用相对路径
const publicResources = isDocker ? [
  {src: '/app/Core', dst: './public/Core'}, // Docker 环境中的 Core 目录
  {src: '/app/Resources', dst: './public/Resources'}, // Docker 环境中的 Resources 目录
] : [
  {src: '../../../Core', dst: './public/Core'}, // 本地环境的 Core 目录
  {src: '../../Resources', dst: './public/Resources'}, // 本地环境的 Resources 目录
];

publicResources.forEach((e)=>{
  if (fs.existsSync(e.src)) {
    if (fs.existsSync(e.dst)) fs.rmSync(e.dst, { recursive: true });
    fs.cpSync(e.src, e.dst, {recursive: true});
    console.log(`Copied ${e.src} to ${e.dst}`);
  } else {
    console.warn(`Warning: Source path ${e.src} does not exist, skipping...`);
  }
});
