/**
 * IM 模块通用工具函数
 * 对应 big 项目 libs 里的 UtilService 部分能力，独立在 im-message 内方便整体迁移
 */

// ----------- 生成全局唯一标识（消息 Domain 用）
export function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0 // 随机数
    const v = c === 'x' ? r : (r & 0x3) | 0x8 // 按 uuid v4 规则修正
    return v.toString(16)
  })
}

// ----------- 格式化时间为字符串，默认 "yyyy-MM-dd HH:mm:ss"
export function dateFormat(time, fmt = 'yyyy-MM-dd HH:mm:ss') {
  const d = time instanceof Date ? time : new Date(Number(time)) // 支持时间戳和 Date
  if (isNaN(d.getTime())) return ''
  const pad = (n) => (n < 10 ? '0' + n : '' + n) // 补零
  return fmt
    .replace('yyyy', d.getFullYear())
    .replace('MM', pad(d.getMonth() + 1))
    .replace('dd', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()))
}

// ----------- 解码 HTML 实体（服务端历史消息会转义尖括号）
export function decodeHtml(text) {
  if (!text) return text
  return String(text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// ----------- 字段归一化：getUserInfo 返回小写 userId/userName/userLogo/nickname，IM 模块用大写 UserID/UserName/UserLogo/NickName，补一份大写别名
export function normalizeUser(user) {
  if (!user) return user
  ;[['UserID', 'userId'], ['UserName', 'userName'], ['UserLogo', 'userLogo'], ['NickName', 'nickname']].forEach(([big, small]) => {
    if (user[big] === undefined && user[small] !== undefined) user[big] = user[small]
  })
  return user
}

// ----------- 获取当前登录用户信息（已做字段归一化，保证大写字段存在）
export function getUser() {
  try {
    return normalizeUser(uni.getStorageSync('userInfo') || null) // 本地缓存的用户信息
  } catch (e) {
    return null
  }
}

// ----------- 获取当前页面路由路径（不带参数），用于判断聊天页是否正在前台
export function getCurrentRoute() {
  try {
    const pages = getCurrentPages() // 当前页面栈
    const current = pages[pages.length - 1] // 栈顶页面
    return current ? '/' + current.route : ''
  } catch (e) {
    return ''
  }
}
