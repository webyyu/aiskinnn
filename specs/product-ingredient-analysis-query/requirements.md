# 需求文档

## 介绍

实现一个 CloudBase 云函数，使前端/客户端可以按用户 `uid` 查询 `product_ingredient_analysis` 集合中的分析记录，并支持分页与排序（可选：时间范围过滤、产品名关键词）。

## 需求

### 需求 1 - 查询指定用户的产品成分分析记录

**用户故事：** 作为一名已登录用户，我希望能够查询我自己的产品成分分析历史记录，以便回顾过往的识别与分析结果。

#### 验收标准

1. When 调用方提供 `uid` 时, the 云函数 shall 查询集合 `product_ingredient_analysis` 中 `uid` 等于该值的记录。
2. While 未提供 `limit`, when 查询数据时, the 云函数 shall 采用默认 `limit=20`，并且限制 1≤limit≤100。
3. While 未提供 `offset`, when 查询数据时, the 云函数 shall 采用默认 `offset=0`，并且保证 `offset≥0`。
4. While 未提供 `order`, when 查询数据时, the 云函数 shall 按 `createdAt` 字段降序（`desc`）返回；当 `order=asc` 时 shall 按升序返回。
5. While 可选提供 `startTime` 和/或 `endTime`, when 查询数据时, the 云函数 shall 以 `createdAt` 为基准进行时间范围过滤（闭区间）。
6. When 查询成功, the 云函数 shall 返回形如：`{ code: 0, message: 'OK', data: { items: [], total?: number, limit, offset, order } }` 的结构；`items` 为记录数组，`total` 若计数失败可省略。
7. When 入参缺失或不合法（例如缺少 `uid`）, the 云函数 shall 返回 `{ code: -1, message: 'Missing uid' }`。
8. When 发生异常, the 云函数 shall 返回 `{ code: -1, message: 'query failed' | 具体错误信息 }`。

### 需求 2 - 最小可用返回字段

**用户故事：** 作为前端开发者，我希望接口返回稳定且精简的字段，方便前端列表渲染。

#### 验收标准

1. When 返回 `items` 时, the 云函数 shall 至少包含每条记录的 `_id`, `uid`, `productName`, `ingredients`（数组或空数组）, `analysis`/`analysisJson`（原始分析对象或摘要）, `imageUrl`（如存在）, `createdAt`。
2. While 某些历史数据字段缺失, when 返回数据时, the 云函数 shall 以空值/空数组兜底，避免前端崩溃。

### 需求 3 - 权限与安全（约定）

**用户故事：** 作为产品与安全负责人，我希望该查询函数仅能读取指定用户自己的数据。

#### 验收标准

1. While 采用前端传入 `uid` 的方式, when 上线部署时, the 云函数 shall 在安全规则/鉴权网关层面确保仅允许用户查询自己的 `uid`（本需求文档仅约束函数行为；具体鉴权由 CloudBase 环境配置/Http 触发器网关/前端登录态附带凭证等方式保证）。
