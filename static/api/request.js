import { baseUrl } from './config';

const getUni = () => {
  
  // 优先尝试 uni (uni-app 环境)
  if (typeof uni !== 'undefined') {
    return uni;
  }
  
  // 尝试全局 globalThis
  if (typeof globalThis !== 'undefined' && globalThis.uni) {
    return globalThis.uni;
  }
  
  // 尝试 window.wx (微信小程序浏览器环境)
  if (typeof window !== 'undefined' && window.wx) {
    return window.wx;
  }
  
  // 尝试 wx (微信小程序环境)
  if (typeof wx !== 'undefined') {
    return wx;
  }
  
  // 尝试 self (Web Worker环境)
  if (typeof self !== 'undefined' && self.uni) {
    return self.uni;
  }
  
  // 尝试从 require 获取（小程序编译环境）
  try {
    if (typeof require !== 'undefined') {
      const wxModule = require('weapp-adapter') || require('@dcloudio/uni-mp-weixin') || require('uni');
      if (wxModule) {
        return wxModule;
      }
    }
  } catch (e) {
    // ignore
  }
  
  // 如果都找不到，抛出错误
  console.error('[getUni] 当前环境检查失败:', {
    hasUni: typeof uni !== 'undefined',
    hasGlobalUni: typeof globalThis !== 'undefined' && globalThis.uni,
    hasWindowWx: typeof window !== 'undefined' && window.wx,
    hasWx: typeof wx !== 'undefined',
    hasSelfUni: typeof self !== 'undefined' && self.uni,
    hasRequire: typeof require !== 'undefined'
  });
  
  throw new Error('uni 对象未定义，请在 uni-app 环境中运行');
};

// ----------- 获取本地存储的 token
const getToken = () => {
  // return "UUthGRdYR5IJer7WaWTPy3amPIEtSmXME2wNGToNL4aln73ti9R2uaCS7yDJyVWuEJtNw95IwiRbrklipi+U6Gcz+3DAE/h/tFS1ofobwizCOttS+I7GUP4SK6gdyUUyVz03HZpqCXqXNX+QLg3U9nGjirjoCTBPvdfKQNJ/JdA="
  const $uni = getUni(); // 通过兼容函数拿 uni，避免冷启动时 uni 未定义
  if ($uni.getStorageSync('token')) {
    return $uni.getStorageSync('token');
  }
  return null;
};

/**
 * 封装 uni.request，兼容小程序环境
 * @param {string} apiKey - API 域名的 key，默认 'api60'
 * @returns {Function}
 */
const createRequest = (apiKey = 'api60') => {
  return (options) => {
    const {
      url,
      method = 'GET',
      data,
      params,
      headers = {},
      skipCodeCheck = false,
      skipErrorToast = false, // 静默处理错误，不弹 toast（如 getMemberInfo 后台调用）
      tokenType = '' // 自定义请求头 tokenType，部分接口需要传 'jrzz'
    } = options;

    // 构建 URL
    let fullUrl = baseUrl[apiKey] + url;
    
    // 处理 GET 请求参数
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }

    // 获取 token
    const token = getToken();

    // 构建 uni.request 配置
    const config = {
      url: fullUrl,
      method: method.toUpperCase(),
      data: data || params,
      header: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 150000
    };

    // 添加 token
    if (token) {
      config.header['Authorization'] = `Bearer ${token}`;
    }

    // 添加自定义 tokenType 请求头
    if (tokenType) {
      config.header['tokenType'] = tokenType;
    }

    return new Promise((resolve, reject) => {
      getUni().request({
        ...config,
        success: (response) => {
          const res = response.data; // 接口业务返回体
          const $uni = getUni();
          // 拦截业务 code（HTTP 200 但 body 里 code 表示鉴权失败的情况）
          // 同时也拦截 HTTP 状态码（部分网关会用 statusCode 标识 4xx/5xx）
          const bizCode = res && (res.code || res.Code);
          const httpStatus = response.statusCode;
          const finalCode = bizCode || httpStatus;
          if (!skipCodeCheck && (finalCode === 401 || finalCode === 403)) {
            // 未登录或未授权：清除登录态 + 提示弹窗
            $uni.removeStorageSync('token');
            $uni.removeStorageSync('userInfo');
            $uni.removeStorageSync('accountList');
            if (!skipErrorToast) {
              $uni.showToast({
                title: "请先登录哦",
                icon: 'none',
                duration: 2000
              });
            }
            // $uni.showModal({
            //   title: '此功能需登录才能操作',
            //   content: '未登录操作此功能数据不准确',
            //   showCancel: true,
            //   cancelText: '取消',
            //   confirmText: '去登录',
            //   success: (modalRes) => {
            //     if (modalRes.confirm) {
            //       $uni.navigateTo({ url: '/pages/common/login/index' });
            //     }
            //   }
            // });
            reject(res || { code: finalCode });
            return;
          }
          
          // ----------- 错误处理
          if(res.State === 1 || res.State === 0) {
            // 特殊返回格式，需额外处理
            if(res.State === 0) {
              $uni.showToast({
                title: res.Message,
                icon: 'none',
                duration: 2000
              });
              reject(res.massage);
              return
            }
          } else if(res.code !== 0) {
            $uni.showToast({
              title: res.massage,
              icon: 'none',
              duration: 2000
            });
            reject(res.massage);
            return
          }
          resolve(res);
        },
        fail: (error) => {
          let message = '网络错误，请稍后重试';
          const $uni = getUni();
          $uni.showToast({
            title: message,
            icon: 'none',
            duration: 2000
          });
          reject(error);
        }
      });
    });
  };
};

/**
 * 通用请求方法
 * @param {Object} options - 请求配置
 * @param {string} options.url - 请求路径
 * @param {string} options.method - 请求方法
 * @param {Object} options.data - 请求数据（POST/PUT）
 * @param {Object} options.params - 请求参数（GET）
 * @param {string} options.apiKey - API 域名 key，默认 'api60'
 * @param {Object} options.headers - 自定义请求头
 * @returns {Promise}
 */
const request = (options) => {
  const {
    url,
    method = 'get',
    data,
    params,
    apiKey = 'api60',
    headers = {},
    skipCodeCheck = false,
    skipErrorToast = false,
    tokenType = ''
  } = options;

  const requestFunc = createRequest(apiKey);

  return requestFunc({
    url,
    method,
    data,
    params,
    headers,
    skipCodeCheck,
    skipErrorToast,
    tokenType
  });
};

export default request;
