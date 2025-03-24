const API_KEY = 'sk-gowhmjbmkwfobzyquraesgombbymmhooewnezivblereevvz';
const VISION_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const EMBEDDING_URL = 'https://api.siliconflow.cn/v1/embeddings';
const FILE_URL = 'https://api.siliconflow.cn/v1/v1/files';

// 通用请求函数
const makeRequest = (url, data, retryCount = 3) => {
  return new Promise((resolve, reject) => {
    const makeRequestAttempt = (attempt = 0) => {
      console.log('发起请求:', {
        url,
        data,
        attempt,
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      wx.request({
        url,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        data,
        success: (res) => {
          console.log('请求响应:', res);
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            const errorMsg = `请求失败: ${res.statusCode} - ${JSON.stringify(res.data)}`;
            console.error(errorMsg);
            if (attempt < retryCount) {
              console.log(`第${attempt + 1}次重试...`);
              setTimeout(() => makeRequestAttempt(attempt + 1), 1000 * (attempt + 1));
            } else {
              reject(new Error(errorMsg));
            }
          }
        },
        fail: (err) => {
          console.error('请求失败:', err);
          if (attempt < retryCount) {
            console.log(`第${attempt + 1}次重试...`);
            setTimeout(() => makeRequestAttempt(attempt + 1), 1000 * (attempt + 1));
          } else {
            reject(new Error(`网络请求失败: ${err.errMsg}`));
          }
        }
      });
    };
    makeRequestAttempt();
  });
};

// 图片转base64
const imageToBase64 = (filePath) => {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => {
        resolve(res.data);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// 分析图片
const analyzeImage = async (imageBase64, prompt = '') => {
  const requestData = {
    model: "Qwen/Qwen2.5-VL-72B-Instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "请分析图片内容。如果是食物，请按以下格式返回：\n食物名称：XX\n蛋白质含量：XX克\n脂肪含量：XX克\n碳水化合物含量：XX克\n热量：XX千卡\n\n如果是植物，请按以下格式返回：\n植物名称：XX\n特征：XX\n分布地区：XX\n\n如果是动物，请按以下格式返回：\n动物名称：XX\n特征：XX"
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "auto"
            }
          }
        ]
      }
    ],
    temperature: 0.7,
    top_p: 0.7,
    top_k: 50
  };

  return makeRequest(VISION_URL, requestData);
};

// 测试API连接
const testAPIConnection = (inputText = "你好，这是一个测试消息") => {
  console.log('开始测试API连接');
  return makeRequest(VISION_URL, {
    model: "Qwen/QwQ-32B",
    stream: false,
    max_tokens: 512,
    temperature: 0.7,
    top_p: 0.7,
    top_k: 50,
    frequency_penalty: 0.5,
    n: 1,
    stop: [],
    messages: [
      {
        role: "system",
        content: "请用中文回复所有问题。"
      },
      {
        role: "user",
        content: inputText
      }
    ]
  });
};

// 获取文本嵌入
const getTextEmbedding = (text) => {
  return makeRequest(EMBEDDING_URL, {
    model: "Pro/BAAI/bge-m3",
    input: text,
    encoding_format: "base64"
  });
};

module.exports = {
  testAPIConnection,
  getTextEmbedding,
  analyzeImage,
  imageToBase64
};