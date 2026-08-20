// ----------- 产品图片CDN域名关键词列表
const CDN_KEYWORDS = ['prod', 'series', 'logo', 'mx', 'yb', 'sw', 'wx', 'images']

// ----------- 格式化产品图片
// path: 产品图片原始路径
// size: 图片尺寸，默认165
export function formatProductImage(value, size) {
  const path = String(value || '') // 产品图片原始路径
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const imgSize = size || 165 // 图片尺寸，默认165
  const isCdnPath = CDN_KEYWORDS.some(keyword => path.toLowerCase().indexOf(keyword) > -1) // 路径是否匹配img2cdn关键词
  const cleanPath = path.replace(/^\//, '') // 去除前导斜杠
  if (isCdnPath) {
    // mx和logo类型需要拼接尺寸后缀，路径已带尺寸则不重复拼
    if ((path.indexOf('mx') > -1 || path.indexOf('logo') > -1) && !/\d+x\d+/.test(path)) {
      const ext = path.indexOf('.') > -1 ? '' : '.jpg'
      return 'https://img2cdn.global-dsc.cn/' + cleanPath + '_' + imgSize + 'x' + imgSize + ext
    }
    return 'https://img2cdn.global-dsc.cn/' + cleanPath + (path.indexOf('.') > -1 ? '' : '.jpg')
  }
  // hash路径走prodimg，加OSS图片处理参数
  return 'https://prodimg.global-dsc.cn/' + cleanPath + '?x-oss-process=image/resize,w_' + imgSize
}
