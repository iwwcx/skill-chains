// 获取名字
export const showName = (obj) => {
  return obj.expertName || obj.ExpertName || obj.userName || obj.UserName || obj.nickName || obj.NickName || '大工程师'
}

// 格式化头像地址
export const getProductImageUrl = (val) => {
  if(val.includes('prod') || 
    val.includes('series') || 
    val.includes('logo') || 
    val.includes('mx') || 
    val.includes('yb') || 
    val.includes('sw') || 
    val.includes('wx') || 
    val.includes('images')
  ) {
    // return "https://img2cdn.global-dsc.cn/" + val + "_165x165.jpg";
    return "https://img2cdn.global-dsc.cn/" + val + ".jpg";
  } else {
    // return "https://prodimg.global-dsc.cn/" + val + "?x-0ss-process=image/resize,_165";
    return "https://prodimg.global-dsc.cn/" + val + '.jpg';
  }
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