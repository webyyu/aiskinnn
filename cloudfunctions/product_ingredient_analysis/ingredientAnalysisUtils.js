const axios = require('axios');

const API_KEY = process.env.API_KEY;

/**
 * 使用通义千问 API 分析产品成分
 * @param {string} productName
 * @param {string[]} ingredients
 * @returns {Promise<{success:boolean, analysisResult?:any, error?:any}>}
 */
async function analyzeIngredients(productName, ingredients) {
  try {
    if (!API_KEY) {
      throw new Error('Missing API_KEY environment variable');
    }

    const prompt = `\n请作为专业的护肤品成分分析师，分析下面这款产品的成分并返回分析结果。\n\n产品名称：${productName || ''}\n产品成分列表：${Array.isArray(ingredients) ? ingredients.join('、') : ''}\n\n请分析以下内容并以JSON格式返回：\n1. 安全性指数(0-100)\n2. 功效评分(0-5.0)\n3. 活性成分数量\n4. 致痘风险(低/中/高，百分比)\n5. 刺激风险(低/中/高，百分比)\n6. 过敏风险(低/中/高，百分比)\n7. 功效分析(列出3条主要功效)\n8. 潜在风险(列出最多2条潜在风险)\n9. 使用建议(列出3条使用建议)\n10. AI综合评分(0-5.0，精确到一位小数)\n11. 产品总结评价(summary)：大概的产品描述，只需包含对产品主要功效、适用肤质和整体评价。\n\n请按照以下格式返回JSON:\n{\n  "safetyIndex": 数值,\n  "efficacyScore": 数值,\n  "activeIngredients": 数值,\n  "acneRisk": {"level": "低/中/高", "percentage": 数值},\n  "irritationRisk": {"level": "低/中/高", "percentage": 数值},\n  "allergyRisk": {"level": "低/中/高", "percentage": 数值},\n  "efficacyAnalysis": [三条分析],\n  "potentialRisks": [最多两条风险],\n  "recommendations": [三条建议],\n  "overallRating": 数值,\n  "summary": "大概的产品描述，只需包含对产品主要功效、适用肤质和整体评价"\n}`;

    const data = {
      model: 'qwen-turbo-latest',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    };

    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`
        },
        timeout: 10000
      }
    );

    const content = resp.data.choices?.[0]?.message?.content;
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (_) {
      const match = String(content).match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed) throw new Error('无法解析分析结果');
    if (!parsed.summary) {
      parsed.summary = `这是一款名为"${productName || '未知'}"的护肤产品。`;
    }

    return { success: true, analysisResult: parsed };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message };
  }
}

module.exports = { analyzeIngredients };