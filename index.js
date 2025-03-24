import { testAPIConnection, analyzeImage, imageToBase64 } from '../../utils/api.js';
import { API_KEY } from '../../utils/api.js';

Page({
  data: {
    messages: [],
    isConnected: false,
    networkType: '',
    imagePath: '',
    isAnalyzing: false,
    showCamera: false,
    analysisResult: null,
    inputValue: '',
    displayImage: '', // 用于显示的图片
    result: {}, // 分析结果
    apiKey: ''  // 存储 API_KEY
  },

  onLoad: function() {
    // 检查网络状态
    this.checkNetworkStatus();
    // 自动连接API
    this.connectAPI();
  },

  // 检查网络状态
  checkNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        console.log('当前网络状态:', res.networkType);
        this.setData({ networkType: res.networkType });
        if (res.networkType === 'none') {
          wx.showToast({
            title: '请检查网络连接',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取网络状态失败:', err);
      }
    });

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      console.log('网络状态变化:', res.networkType);
      this.setData({ networkType: res.networkType });
      if (res.networkType === 'none') {
        wx.showToast({
          title: '网络连接已断开',
          icon: 'none'
        });
      }
    });
  },

  // 选择图片
  chooseImage() {
    if (!this.data.isConnected) {
      wx.showToast({
        title: '请先连接API',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('选择图片成功:', tempFilePath);
        
        this.setData({ 
          displayImage: tempFilePath 
        });

        this.addMessage({
          role: 'user',
          type: 'image',
          content: tempFilePath
        });
      }
    });
  },

  // 打开相机
  openCamera() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        this.setData({ showCamera: true });
      },
      fail: () => {
        wx.showModal({
          title: '提示',
          content: '需要相机权限才能使用拍照功能',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  // 取消拍照
  cancelCamera() {
    this.setData({ showCamera: false });
  },

  // 拍照
  takePhoto() {
    if (!this.data.showCamera) {
      return;
    }

    const cameraContext = wx.createCameraContext();
    cameraContext.takePhoto({
      quality: 'high',
      success: (res) => {
        console.log('拍照成功:', res.tempImagePath);
        this.setData({
          displayImage: res.tempImagePath,
          showCamera: false
        });
        
        this.addMessage({
          role: 'user',
          type: 'image',
          content: res.tempImagePath
        });
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },

  // 相机错误处理
  error(e) {
    console.error('相机错误:', e);
    wx.showToast({
      title: '相机启动失败',
      icon: 'none'
    });
    this.setData({ showCamera: false });
  },

  // 移除图片
  removeImage() {
    this.setData({ imagePath: '' });
  },

  // 连接API
  connectAPI() {
    if (this.data.isConnected) {
      this.setData({ 
        isConnected: false 
      });
      wx.showToast({
        title: 'API已断开',
        icon: 'none'
      });
    } else {
      wx.showLoading({ title: '连接中...' });
      
      wx.request({
        url: 'https://api.siliconflow.cn/v1/chat/completions',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-gowhmjbmkwfobzyquraesgombbymmhooewnezivblereevvz'
        },
        data: {
          model: "Qwen/Qwen2.5-VL-72B-Instruct",
          messages: [{ role: "system", content: "测试连接" }]
        },
        success: (res) => {
          if (res.statusCode === 200) {
            this.setData({ isConnected: true });
            wx.showToast({
              title: 'API已连接',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '连接失败',
              icon: 'error'
            });
          }
        },
        fail: (err) => {
          console.error('API连接失败:', err);
          wx.showToast({
            title: '连接失败',
            icon: 'error'
          });
        },
        complete: () => {
          wx.hideLoading();
        }
      });
    }
  },

  // 发送消息
  async onTestSubmit() {
    // 检查网络状态
    if (this.data.networkType === 'none') {
      wx.showToast({ title: '请检查网络连接', icon: 'none' });
      return;
    }

    // 检查是否有图片
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择或拍摄图片', icon: 'none' });
      return;
    }

    this.setData({ isAnalyzing: true });
    wx.showLoading({ title: '分析中...' });

    try {
      // 添加用户消息
      this.addMessage({
        role: 'user',
        content: '发送了一张图片',
        content: this.data.inputValue || '发送了一张图片',
        time: this.getCurrentTime()
      });

      let response;
      // 如果有图片，使用图片分析API
      if (this.data.imagePath) {
        const imageBase64 = await imageToBase64(this.data.imagePath);
        response = await analyzeImage(imageBase64, this.data.inputValue || '请分析这张图片');
      } else {
        // 纯文字消息，使用对话API
        response = await testAPIConnection(this.data.inputValue);
      }

      // 显示AI回复
      if (this.data.imagePath) {
        // 图片分析结果
        this.addMessage({
          role: 'AI',
          content: response.choices[0].message.content,
          time: this.getCurrentTime()
        });
      } else {
        // 对话结果
        const aiMessage = response.choices[0].message;
        this.addMessage({
          role: 'AI',
          content: aiMessage.content || aiMessage.reasoning_content || '抱歉，我没有得到有效的回复',
          time: this.getCurrentTime()
        });
      }

      // 清空输入和图片
      this.setData({
        inputValue: '',
        imagePath: ''
      });

    } catch (error) {
      console.error('处理失败:', error);
      this.addMessage({
        role: 'AI',
        content: `处理失败: ${error.message || '未知错误'}`,
        time: this.getCurrentTime()
      });
      wx.showToast({
        title: error.message || '处理失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isAnalyzing: false });
      wx.hideLoading();
    }
  },

  // 获取当前时间
  getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 添加消息到列表
  addMessage(message) {
    // 如果是图片消息，设置特殊类型
    if (message.content.startsWith('data:image') || message.content.startsWith('http')) {
      message.type = 'image';
    }
    
    const messages = [...this.data.messages, message];
    this.setData({ messages });
    
    // 滚动到底部
    wx.pageScrollTo({
      scrollTop: 99999,
      duration: 300
    });
  },

  // 关闭分析结果
  closeAnalysis() {
    this.setData({
      analysisResult: null
    });
  },

  // 预览图片
  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({
      current: src,
      urls: [src]
    });
  },

  // 分析图片
  async analyzeImage() {
    if (!this.data.displayImage) {
      wx.showToast({
        title: '请先选择或拍摄图片',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ isAnalyzing: true });

      // 检查网络连接
      const networkType = await new Promise((resolve) => {
        wx.getNetworkType({
          success: (res) => resolve(res.networkType)
        });
      });

      if (networkType === 'none') {
        wx.showToast({
          title: '网络连接失败，请检查网络',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 将图片转换为base64
      const imageBase64 = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: this.data.displayImage,
          encoding: 'base64',
          success: res => resolve(res.data),
          fail: err => reject(err)
        });
      });

      // 调用API分析图片
      const result = await analyzeImage(imageBase64);
      
      // 处理返回的数据
      if (result.choices && result.choices[0]) {
        const content = result.choices[0].message.content;
        // 解析返回的文本内容
        const parsedResult = this.parseAnalysisResult(content);
        
        if (!parsedResult || Object.keys(parsedResult).length === 0) {
          this.setData({ 
            result: {
              type: 'error',
              message: '无法解析返回的数据'
            }
          });
        } else {
          this.setData({ result: parsedResult });
        }
      } else {
        this.setData({ 
          result: {
            type: 'error',
            message: '分析结果为空'
          }
        });
      }

    } catch (error) {
      console.error('图片分析失败:', error);
      this.setData({ 
        result: {
          type: 'error',
          message: '连接API失败，请稍后重试'
        }
      });
    } finally {
      this.setData({ isAnalyzing: false });
    }
  },

  // 解析分析结果
  parseAnalysisResult(content) {
    console.log('解析返回内容:', content);
    const result = {};
    const lines = content.split('\n');
    
    // 判断内容类型
    if (content.includes('食物名称')) {
      result.type = 'food';
      for (const line of lines) {
        if (line.includes('食物名称：')) {
          result.name = line.split('：')[1]?.trim();
        } else if (line.includes('蛋白质含量：')) {
          result.protein = line.split('：')[1]?.trim();
        } else if (line.includes('脂肪含量：')) {
          result.fat = line.split('：')[1]?.trim();
        } else if (line.includes('碳水化合物含量：')) {
          result.carbs = line.split('：')[1]?.trim();
        } else if (line.includes('热量：')) {
          result.calories = line.split('：')[1]?.trim();
        }
      }
    } else if (content.includes('植物名称')) {
      result.type = 'plant';
      for (const line of lines) {
        if (line.includes('植物名称：')) {
          result.name = line.split('：')[1]?.trim();
        } else if (line.includes('特征：')) {
          result.features = line.split('：')[1]?.trim();
        } else if (line.includes('分布地区：')) {
          result.distribution = line.split('：')[1]?.trim();
        }
      }
    } else if (content.includes('动物名称')) {
      result.type = 'animal';
      for (const line of lines) {
        if (line.includes('动物名称：')) {
          result.name = line.split('：')[1]?.trim();
        } else if (line.includes('特征：')) {
          result.features = line.split('：')[1]?.trim();
        }
      }
    }
    
    return result;
  }
});