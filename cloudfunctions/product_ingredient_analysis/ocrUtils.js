const axios = require('axios');

const API_KEY = process.env.API_KEY;

/**
 * 从图片中提取产品名称与成分
 * @param {string} imageUrl 临时可访问的图片 URL
 * @returns {Promise<{success:boolean, productName:string, ingredients:string[], rawContent:string, error?:any}>}
 */
async function extractProductInfo(imageUrl) {
  try {
    if (!API_KEY) {
      throw new Error('Missing API_KEY environment variable');
    }

    const resultSchema = `{
      "产品名称": "产品名称字符串",
      "产品成分": []
    }`;

    const prompt = `请从图片中提取产品名称和成分信息，并按照下面的格式返回。\n务必识别产品的名称（通常在包装正面或顶部较显眼的位置）\n同时识别产品成分列表部分（通常以“成分”或“配方”开头）。\n如果找不到相关信息，对应字段返回空内容。\n输出格式: ${resultSchema}`;

    const data = {
      model: 'qwen-vl-ocr-2025-04-13',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
              min_pixels: 28 * 28 * 4,
              max_pixels: 28 * 28 * 8192
            }
          ]
        }
      ]
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

    const content = resp.data.choices?.[0]?.message?.content || '';

    let productName = '';
    let ingredients = [];
    let parsed = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      parsed = null;
    }

    if (parsed) {
      productName = parsed.产品名称 || '';
      ingredients = Array.isArray(parsed.产品成分) ? parsed.产品成分 : [];
    }

    if (!productName || !Array.isArray(ingredients)) {
      const lines = String(content).split('\n');
      for (let i = 0; i < Math.min(6, lines.length); i++) {
        if (lines[i].includes('产品名称') || lines[i].includes('名称')) {
          productName = lines[i].replace(/产品名称[：:]/, '').trim();
          break;
        }
      }
      const collected = [];
      let inSection = false;
      for (const line of lines) {
        if (line.includes('成分') || line.includes('配方')) { inSection = true; continue; }
        if (inSection && line.trim()) {
          // 清除数字与标点（使用 Unicode 属性，避免复杂转义）
          const ing = line.replace(/[\p{N}\p{P}]/gu, '').trim();
          if (ing) collected.push(ing);
        }
      }
      if (collected.length) ingredients = collected;
    }

    return { success: true, productName, ingredients, rawContent: content };
  } catch (error) {
    return { success: false, productName: '', ingredients: [], rawContent: '', error: error.response?.data || error.message };
  }
}

module.exports = { extractProductInfo }; 