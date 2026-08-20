/**
 * IM SDK 适配层（对应 big 项目 services/im.ts）
 * 唯一和网易云信 SDK 打交道的地方，对外只暴露统一的事件和发送接口
 * 平台差异通过条件编译引入对应构建：小程序用 MINIAPP 版，App 用 UNIAPP 版，H5 用浏览器版
 */
// #ifdef MP
import NIM from 'nim-web-sdk-ng/dist/v2/NIM_MINIAPP_SDK'
// #endif
// #ifdef APP-PLUS
import NIM from 'nim-web-sdk-ng/dist/v2/NIM_UNIAPP_SDK'
// #endif
// #ifdef H5
import NIM from 'nim-web-sdk-ng'
// #endif
import { generateToken } from '../api/index.js'
import { getUser } from './util.js'

// NIM AppKey，与 big 项目 webpack.env 里的 NIM_APP_KEY 一致
const NIM_APP_KEY = '1cceec4b1cc4a4cf05e5fbda8d898ab2'

// 连接状态枚举，与 big 项目 EnumStatus 一致
export const EnumStatus = {
  Connecting: -1, // 登录中
  None: 0, // 未登录
  Connected: 1, // 登录成功
  Elsewhere: 2, // 帐号在别处登录
  DisConnect: 3 // 断开连接
}

// IM 全局状态（页面可订阅 state_change 监听变化）
export const IM = {
  state: EnumStatus.None, // 当前连接状态
  state_text: '未登录' // 状态描述文案
}

let nimInstance = null // NIM SDK 实例
let eventsBound = false // SDK 事件是否已绑定
let loginTimestamp = 0 // 本次登录成功的时间戳，用于过滤登录前的旧消息
let LoginPromise = null // 登录 Promise 缓存，防止并发重复登录（失败后保留，靠节流重试而不是立即重连）
let ReceiveMessage = null // 接收消息回调
let TeamChange = null // 群变化回调（被拉进群、被踢出、群解散等）
const StateChange = [] // 状态变化订阅者列表
let reconnectTimer = null // 重连定时器
let reconnectDelay = 2000 // 当前重连间隔，失败指数增长，成功后重置（首次 2 秒，华为后台回到前台时能更快重连）

// ----------- 设置连接状态并通知订阅者
function SetState(state, message) {
  const oldState = IM.state // 变化前的状态
  IM.state = state
  IM.state_text = ['登录中', '未登录', '登录成功', '帐号在别处登录', '断开连接'][state + 1] || '未登录'
  StateChange.forEach((fn) => {
    try {
      fn(state, oldState)
    } catch (e) {
      console.error('[IM] state_change 回调执行失败:', e)
    }
  })
  // 断开后延迟自动重连，间隔指数增长，避免失败时请求风暴
  if (state === EnumStatus.DisConnect) {
    scheduleReconnect()
  }
  // 连接成功后重置重连间隔
  if (state === EnumStatus.Connected) {
    reconnectDelay = 2000
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }
  if (state === EnumStatus.Elsewhere) {
    console.warn('[IM] 帐号在别处登录', message || '')
  }
}

// ----------- 计划一次延迟重连（同一时刻只有一个定时器）
function scheduleReconnect() {
  if (reconnectTimer) return
  const delay = reconnectDelay // 本次重连间隔
  reconnectDelay = Math.min(reconnectDelay * 2, 120000) // 下次间隔翻倍，最长 2 分钟
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    IMReconnect()
  }, delay)
}

// ----------- 断开重连
export function IMReconnect() {
  const user = getUser() // 当前登录用户
  if (user && IM.state === EnumStatus.DisConnect) {
    IMService.login(true).catch(() => {})
  }
}

// ----------- 清理小程序文件存储（微信小程序文件存储有 10MB 上限，满了会导致 SDK 写文件失败）
function clearFileStorage() {
  try {
    // #ifdef MP
    const fs = wx.getFileSystemManager()
    const dir = wx.env.USER_DATA_PATH
    let files = []
    try { files = fs.readdirSync(dir) } catch (e) {}
    // 递归删除文件（目录里的文件也清掉）
    function clearPath(path, name) {
      const filePath = `${path}/${name}`
      let stat
      try { stat = fs.statSync(filePath) } catch (e) { return }
      if (stat.isFile()) {
        try { fs.unlinkSync(filePath);  } catch (e) {}
      } else if (stat.isDirectory()) {
        // 递归清理目录内文件
        let subFiles = []
        try { subFiles = fs.readdirSync(filePath) } catch (e) {}
        subFiles.forEach(sub => clearPath(filePath, sub))
      }
    }
    files.forEach(file => clearPath(dir, file))
    // 打印 storage 使用情况
    try {
      const info = wx.getStorageInfoSync()
    } catch (e) {}
    // #endif
  } catch (e) {
  }
}

// ----------- 创建 SDK 实例并绑定事件（只执行一次）
function ensureInstance() {
  if (nimInstance) return nimInstance
  clearFileStorage()  // 初始化前清理文件存储，防止存储满了导致 SDK 写文件失败
  nimInstance = NIM.getInstance(
    { appkey: NIM_APP_KEY, debugLevel: 'off', apiVersion: 'v2' },
    {
      V2NIMLoginServiceConfig: {
        lbsUrls: ['https://lbs.netease.im/lbs/webconf.jsp'], // LBS 地址，与 big 项目一致
        linkUrl: 'weblink.netease.im:443' // 长连接地址，与 big 项目一致
      }
    }
  )
  if (!eventsBound) {
    eventsBound = true
    bindEvents()
  }
  return nimInstance
}

// ----------- 绑定 SDK 登录状态和消息接收事件
function bindEvents() {
  const nim = nimInstance // SDK 实例
  // 登录状态变化：0 未登录 1 已登录 2 登录中 3 断线重连等待中
  nim.V2NIMLoginService.on('onLoginStatus', (status) => {
    const map = { 0: EnumStatus.None, 1: EnumStatus.Connected, 2: EnumStatus.Connecting, 3: EnumStatus.DisConnect } // 状态映射
    SetState(map[status] !== undefined ? map[status] : EnumStatus.None)
  })
  // 连接状态变化：0 已断开 1 已连接 2 连接中 3 重连中
  nim.V2NIMLoginService.on('onConnectStatus', (status) => {
    const map = { 0: EnumStatus.DisConnect, 1: EnumStatus.Connected, 2: EnumStatus.Connecting, 3: EnumStatus.Connecting } // 状态映射
    SetState(map[status] !== undefined ? map[status] : EnumStatus.DisConnect)
  })
  // 被踢下线
  nim.V2NIMLoginService.on('onKickedOffline', () => {
    SetState(EnumStatus.Elsewhere)
  })
  // 群相关事件：被拉进群、被踢出群、群解散，都通知业务层刷新会话列表
  const onTeamEvent = (name) => (team) => {
    TeamChange && TeamChange(name, team)
  }
  nim.V2NIMTeamService.on('onTeamJoined', onTeamEvent('onTeamJoined'))
  nim.V2NIMTeamService.on('onTeamLeft', onTeamEvent('onTeamLeft'))
  nim.V2NIMTeamService.on('onTeamDismissed', onTeamEvent('onTeamDismissed'))
  // 收到新消息，拍平成统一格式后分发给业务层
  nim.V2NIMMessageService.on('onReceiveMessages', (messages) => {
    ;(messages || []).forEach((message) => {
      // 消息时间早于本次登录时间的不处理（重连后 SDK 补推的旧消息）
      if (loginTimestamp > parseInt(message.createTime)) {
        return
      }
      ReceiveMessage &&
        ReceiveMessage({
          id: message.messageServerId, // 服务端消息ID
          domain: (message.attachment && message.attachment.raw) || message.messageServerId, // 客户端自定义标识，用于去重和撤回定位；没带标识的消息（如客户端发的）用服务端消息ID兜底，保证能去重
          content: message.text, // 消息文本内容
          time: parseInt(message.createTime), // 消息时间戳
          sender: message.senderId, // 发送者账号
          receiver: message.receiverId, // 接收者账号
          groupId: message.conversationType == 2 || message.conversationType == 3 ? message.receiverId : '', // 群聊/超级群聊的群ID
          conversationType: message.conversationType // 0 未知 1 单聊 2 群聊 3 超级群聊
        })
    })
  })
}

// ----------- 从 generateToken 响应中提取 token，兼容多种返回结构
// 纯文本 token / { data: token } / { Data: { Token: token } } 等嵌套结构
function extractToken(res) {
  if (!res) return ''
  if (typeof res === 'string') return res
  const data = res.data || res.Data || res // 剥掉外层包装
  if (typeof data === 'string') return data
  return data.token || data.Token || data.nimToken || data.NIMToken || ''
}

// ----------- 执行登录：初始化实例 -> 取 token -> SDK 登录
async function Login() {
  const user = getUser() // 当前登录用户
  if (!user || !user.UserID) {
    return
  }
  if (IM.state === EnumStatus.Connected) {
    return
  }
  SetState(EnumStatus.Connecting)
  try {
    const nim = ensureInstance() // SDK 实例
    const res = await generateToken() // 网易云信 token 响应
    const token = extractToken(res) // 登录 token
    if (!token) {
      throw new Error('获取 IM token 失败: ' + JSON.stringify(res))
    }
    // 登录时间戳必须在调 SDK 登录前记录：SDK 建立连接过程中就会补推离线消息，onReceiveMessages 可能早于 login 的 Promise 返回
    // 如果登录成功后才赋值，补推的旧消息会穿过登录前消息过滤，在服务端未读数基础上重复 +1，导致未读数翻倍
    loginTimestamp = Date.now()
    const result = await nim.V2NIMLoginService.login(String(user.UserID), String(token))
    SetState(EnumStatus.Connected)
    return result
  } catch (error) {
    console.error('[IM] 登录失败:', error)
    SetState(EnumStatus.DisConnect)
    throw error
  }
}

export class IMService {
  // ----------- 登录（幂等，并发调用共享同一个 Promise，失败后需 force 才会重试）
  static async login(force = false) {
    force && (LoginPromise = null)
    return LoginPromise || (LoginPromise = Login())
  }

  // ----------- 退出登录
  static async logout() {
    LoginPromise = null
    loginTimestamp = 0
    if (nimInstance) {
      try {
        await nimInstance.V2NIMLoginService.logout()
      } catch (e) {
        console.error('[IM] 退出登录失败:', e)
      }
    }
    SetState(EnumStatus.None)
  }

  // ----------- 注册接收消息回调（只有业务层 message.js 使用）
  static receive_message(fn) {
    ReceiveMessage = fn
  }

  // ----------- 注册群变化回调（被拉进群、被踢出、群解散时触发）
  static team_change(fn) {
    TeamChange = fn
  }

  // ----------- 订阅连接状态变化
  static state_change(fn) {
    if (StateChange.indexOf(fn) === -1) {
      StateChange.push(fn)
    }
  }

  // ----------- 当前连接状态
  static get state() {
    return IM.state
  }

  // ----------- 发送消息（未连接会先登录）
  // content 消息文本（协议格式 <m_img,..> 等），domain 客户端唯一标识，isGroup 是否群聊
  static async send(to, content, domain, isGroup) {
    if (IM.state !== EnumStatus.Connected) {
      await IMService.login()
    }
    // 登录仍未成功（getUser 无 UserID 或 generateToken 失败），抛错避免 SDK 报 illegal state
    if (IM.state !== EnumStatus.Connected) {
      throw new Error('IM 未连接，无法发送消息')
    }
    const nim = ensureInstance() // SDK 实例
    const message = nim.V2NIMMessageCreator.createCustomMessage(content, domain || '') // 自定义消息，domain 放在附件 raw 里
    const conversationId = isGroup
      ? nim.V2NIMConversationIdUtil.teamConversationId(String(to)) // 群聊会话ID
      : nim.V2NIMConversationIdUtil.p2pConversationId(String(to)) // 单聊会话ID
    return await nim.V2NIMMessageService.sendMessage(message, conversationId)
  }

  // ----------- 创建群组（网易云信 SDK），返回群组 ID
  // name 群名称，memberIds 成员用户ID数组（不含自己，SDK 会自动加入创建者）
  static async createTeam(name, memberIds) {
    if (IM.state !== EnumStatus.Connected) {
      await IMService.login()
    }
    if (IM.state !== EnumStatus.Connected) {
      throw new Error('IM 未连接，无法创建群组')
    }
    const nim = ensureInstance() // SDK 实例
    // 网易云信 V2 创建群组：name 群名，teamType 1 高级群，agreeMode 1 被邀请人无需同意直接入群（与 supply-chain-im 一致）
    // 注意：成员数组必须作为第二个参数传入，塞进第一个参数对象里 SDK 不识别
    const teamInfo = await nim.V2NIMTeamService.createTeam(
      {
        name: name,
        teamType: 1,
        agreeMode: 1
      },
      memberIds.map(String)
    )
    // 返回群组 ID
    return teamInfo && teamInfo.team && teamInfo.team.teamId ? teamInfo.team.teamId : (teamInfo && teamInfo.teamId || '')
  }

  // ----------- 邀请成员加入群组（对应 supply-chain-im 的 GroupMIMCService.invite）
  // teamId 群组ID，memberIds 被邀请的用户ID数组
  static async inviteTeamMembers(teamId, memberIds) {
    if (IM.state !== EnumStatus.Connected) {
      await IMService.login()
    }
    const nim = ensureInstance() // SDK 实例
    // 网易云信 V2 邀请入群：teamId 群ID，teamType 1 高级群（和 createTeam 一致），inviteeAccountIds 被邀请人账号数组
    return await nim.V2NIMTeamService.inviteMember(String(teamId), 1, memberIds.map(String))
  }

  // ----------- 将成员移出群组（对应 supply-chain-im 的 GroupMIMCService.remove）
  // teamId 群组ID，memberIds 被移出的用户ID数组
  static async kickTeamMembers(teamId, memberIds) {
    if (IM.state !== EnumStatus.Connected) {
      await IMService.login()
    }
    const nim = ensureInstance() // SDK 实例
    // 网易云信 V2 踢人：memberAccountIds 被踢出的成员账号数组
    return await nim.V2NIMTeamService.kickMember(String(teamId), 1, memberIds.map(String))
  }

  // ----------- 解散群组（对应 supply-chain-im 的 GroupMIMCService.dismiss）
  // teamId 群组ID，SDK 解散后会自动给所有群成员推送 onTeamDismissed 事件，群成员端实时从列表移除该群
  static async dismissTeam(teamId) {
    if (IM.state !== EnumStatus.Connected) {
      await IMService.login()
    }
    const nim = ensureInstance() // SDK 实例
    // 网易云信 V2 解散群组：teamId 群ID，teamType 1 高级群（和 createTeam 一致）
    return await nim.V2NIMTeamService.dismissTeam(String(teamId), 1)
  }
}
