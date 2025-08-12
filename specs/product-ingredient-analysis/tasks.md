# 实施计划

- [ ] 1. 创建云函数目录与依赖
  - 创建 `cloudfunctions/product_ingredient_analysis/`
  - 初始化 `package.json`，依赖 `@cloudbase/node-sdk`、`axios`、`parse-multipart`
  - _需求: 1_

- [ ] 2. 编写 OCR 与成分分析工具
  - `ocrUtils.js` 对齐 `AISkin_backend-main/utils/ocrUtils.js`
  - `ingredientAnalysisUtils.js` 对齐 `AISkin_backend-main/utils/ingredientAnalysisUtils.js`
  - _需求: 1_

- [ ] 3. 编写 `index.js` 入口
  - 解析 HTTP/SDK 入参（multipart/base64/json）
  - 上传存储并获取临时 URL
  - 串联 OCR→分析→入库
  - _需求: 1,2_

- [ ] 4. 创建数据库集合与索引
  - 集合：`product_ingredient_analysis`
  - 索引：`uid`、`createdAt`（可选）
  - _需求: 1_

- [ ] 5. 配置函数 HTTP 访问
  - 路径 `/product-ingredient-analysis`
  - CORS 头
  - _需求: 1_

- [ ] 6. 配置环境变量
  - `API_KEY`（通义千问密钥）
  - _需求: 非功能_

- [ ] 7. 测试与验收
  - base64/json 上传
  - multipart 上传
  - 失败分支（超时、类型/大小不合规、无 uid）
  - _需求: 3,4_ 