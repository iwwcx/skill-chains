// 获取名字
export const showName = (obj) => {
  return obj.expertName || obj.ExpertName || obj.userName || obj.UserName || obj.nickName || obj.NickName || '大工程师'
}

// 默认头像（与 sale-customer-map 保持一致）
const default_avatar_male = 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png' // 男默认头像
const default_avatar_female = 'https://img2cdn.global-dsc.cn/dgzz_img/6842d00b7f7db24082ed4f59f2bba02a.png' // 女默认头像

// ----------- 获取用户头像地址（参考 sale-customer-map）
// logo：用户头像字段值（userLogo / UserLogo）
// sex：性别字段值（userSex / UserSex），2 为女生，否则男生
export const getAvatarUrl = (logo, sex) => {
  // 有真实头像：http 开头直接用，否则按 sale 的 getProductImageUrlChat 逻辑拼接
  if (logo) {
    if (/http/.test(logo)) return logo
    // api60hwobsimg 走 img2cdn 不加后缀，其他走 api60 加 .jpg
    if (logo.includes('api60hwobsimg')) {
      return 'https://img2cdn.global-dsc.cn/' + logo
    }
    return 'https://api60.global-dsc.cn/' + logo + '.jpg'
  }
  // 无头像：按性别回退默认头像（userSex/UserSex == 2 为女生，否则男生）
  return Number(sex) === 2 ? default_avatar_female : default_avatar_male
}

// ----------- 团队列表字段对齐（PascalCase 转 camelCase，与 skill-chain 的 UtilLibs.handleDataKey 保持一致）
export const handleDataKey = (data) => {
  if (!data || data.length < 1) return data
  const changeKeys = { // 字段映射表
    UserID: 'userId',
    UserName: 'userName',
    Mdt: 'userMdt',
    EMail: 'email',
    IsCreated: 'isAdmin',
    IsManager: 'isManager',
    OrgID: 'orgId',
    OrgName: 'orgName',
    Phone: 'phone',
    UserLogo: 'userLogo',
    VipLevel: 'userVipLevel',
    UserSex: 'sex',
    WorkState: 'state'
  }
  const newData = JSON.parse(JSON.stringify(data)) // 深拷贝，避免改到原数据
  newData.forEach(ele => {
    Object.keys(changeKeys).forEach(key => {
      ele[changeKeys[key]] = ele[key]
    })
  })
  return newData
}

// 格式化产品图地址（与 skill-chain 的 filterProdImage 保持一致）
// prod/series 开头走 img2cdn 缩略图，其他走 prodimg OSS 缩放
export const getProductImageUrl = (val, size = 100) => {
  if (!val) return ''
  if (/http/.test(val)) return val
  const isOssImage = !(val.startsWith('prod') || val.startsWith('series'))
  return isOssImage
    ? `https://prodimg.global-dsc.cn/${val}?x-oss-process=image/resize,w_${size},h_${size}`
    : `https://img2cdn.global-dsc.cn/${val}_${size}x${size}.jpg`
}

// 聊天头像格式化
export const getProductImageUrlChat = (val) => {
  if(val.includes('api60hwobsimg')) {
    return "https://img2cdn.global-dsc.cn/" + val;
  } else {
    return "https://api60.global-dsc.cn/" + val + '.jpg';
  }
}

// 格式化消息时间：今天显示时分，昨天显示"昨天"，本周内显示星期几，更早的显示月日
export const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const msgDate = new Date(timeStr)
  const now = new Date()
  // 获取当前日期的零时刻
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // 获取消息日期的零时刻
  const msgZero = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate())
  // 计算相差天数
  const diffDay = Math.floor((nowZero - msgZero) / (1000 * 60 * 60 * 24))

  const pad = n => (n < 10 ? '0' + n : n)

  if (diffDay === 0) {
    // 今天 → HH:mm
    return pad(msgDate.getHours()) + ':' + pad(msgDate.getMinutes())
  }
  if (diffDay === 1) {
    return '昨天'
  }
  // 本周一距今的天数（周一为一周起点，周日 getDay 为 0 需特殊处理）
  const daysSinceMonday = (now.getDay() + 6) % 7
  if (diffDay > 1 && diffDay <= daysSinceMonday) {
    const weekArr = ['日', '一', '二', '三', '四', '五', '六']
    return '星期' + weekArr[msgDate.getDay()]
  }
  // 上周及更早 → MM-DD
  return pad(msgDate.getMonth() + 1) + '-' + pad(msgDate.getDate())
}

// 解析消息文本，将自定义标签替换为中文描述
export const parseMsgText = (text) => {
  if (!text) return ''
  // 引用消息：提取回复内容
  const quoteMatch = text.match(/^<m_quote,[^>]*>([\s\S]*)<\/m_quote>$/i)
  if (quoteMatch) return (quoteMatch[1] || '').replace(/[\r\n]+/g, ' ') // 换行替换为空格，保证列表预览只显示一行
  return text
    .replace(/<m_ico,[^>]*>/g, '[表情]')
    .replace(/<m_img,[^>]*>/g, '[图片]')
    .replace(/<m_file,[^>]*>/g, '[文件]')
    .replace(/<m_audio,[^>]*>/g, '[语音]')
    .replace(/<m_video,[^>]*>/g, '[视频]')
    .replace(/<m_link,[^>]*>/g, '[链接]')
    .replace(/<m_data,[^>]*>/g, '[分享]')
    .replace(/<m_shake>/g, '发送了一个窗口抖动')
    .replace(/<m_revoke,[^>]*>/g, '[撤回了一条消息]')
    .replace(/[\r\n]+/g, ' ') // 换行替换为空格，保证列表预览只显示一行
}