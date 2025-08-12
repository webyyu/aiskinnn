# product_ingredient_analysis

上传产品图片到 CloudBase 存储（路径前缀 `productpicture/`），调用通义千问完成 OCR 与成分分析，并将结果与用户 `uid` 绑定后写入数据库集合 `product_ingredient_analysis`。

## 运行时与依赖
- Node.js 18.15
- `@cloudbase/node-sdk`, `axios`, `parse-multipart`

## 环境变量
- `API_KEY`: 通义千问 DashScope 兼容模式 API Key

## 部署
1. 在项目根目录执行（首次）：
   - 安装 CloudBase CLI（如未安装）：`npm i -g @cloudbase/cli`
   - 登录：`tcb login`
2. 在项目根目录：
   - `tcb fn deploy product_ingredient_analysis -e <env-id>`

或使用控制台 / 本助手的云函数创建工具进行部署。

## HTTP 访问
- 创建 HTTP 访问路径（示例）：`/product-ingredient-analysis`
- 发起 `POST` 请求，支持：
  - `multipart/form-data` 字段名：`productImage`（兼容 `file`, `image`）
  - `application/json`：`{ imageBase64: string, fileExtension?: 'jpg'|'jpeg'|'png' }`
  - 可选：`{ imageUrl: string }`

## 返回
```json
{
  "success": true,
  "data": {
    "recordId": "xxx",
    "fileId": "cloud://...",
    "imageTempUrl": "https://... (临时)",
    "productName": "...",
    "ingredients": ["..."],
    "analysis": { "summary": "...", "safetyIndex": 90, "...": "..." }
  }
}
```

## 注意
- 仅支持 `jpg/jpeg/png`，大小 ≤ 5MB。
- 需确保调用方已通过 CloudBase 身份认证；函数内将使用 `app.auth().getUserInfo()` 获取 `uid`。
- 模型提示词与字段对齐 `AISkin_backend-main` 的实现，聚焦“产品成分分析”。 