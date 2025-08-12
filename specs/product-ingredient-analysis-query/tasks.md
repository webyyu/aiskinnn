# 实施计划

- [ ] 1. 创建云函数目录与依赖
  - 新建 `cloudfunctions/get_product_ingredient_analyses_by_uid/`
  - 编写 `package.json`（依赖 `@cloudbase/node-sdk`）
  - _需求: 需求1_

- [ ] 2. 编写云函数代码
  - `index.js`：参数校验、分页/排序、查询与返回格式
  - 兜底字段：`productName`、`ingredients[]`、`analysis`、`imageUrl`
  - _需求: 需求1、需求2_

- [ ] 3. 前端服务封装
  - 在 `src/services/cloudbaseService.js` 增加 `getProductIngredientAnalysesByUid`
  - _需求: 需求1_

- [ ] 4. 部署与验证
  - 使用 `tcb fn deploy get_product_ingredient_analyses_by_uid -e <env-id>`
  - 本地/线上调用验证，确认分页与排序正确
  - _需求: 需求1_

- [ ] 5. 文档与示例
  - 更新 README/接口说明（可选）
  - 提供调用示例
  - _需求: 需求1_ 