/**
 * 会话列表层（对应 big 项目 services/recent.ts）
 * 维护最近会话列表：新消息置顶、未读数累加、最后一条消息更新、清空未读
 * 列表数据保持服务端返回结构（SessionCategoryID/SessionDataID/SessionName 等），页面可直接使用
 */
import { getChatList, getSummary, startChat, resetChat, getUnreadTotal } from '../api/index.js'
import { IMService, EnumStatus } from './im.js'
import { dateFormat, guid, getUser } from './util.js'

const RecentList = [] // 最近会话列表（服务端结构）
let InitPromise = null // 初始化 Promise 缓存
let initTimestamp = 0 // 上次初始化时间，用于重连补偿时的防抖
let currentChatKey = '' // 当前正在聊天的会话 key，不为它累加未读数
const Subscribers = [] // 列表变化订阅者
let refreshTimer = null // 服务端列表刷新防抖定时器（群系统通知短时间内可能来多条）
let refreshRetry = 0 // 当前重试次数，服务端生成新会话有延迟，拉不到要隔几秒再拉
let suppressUnread = false // 重连补偿期间不累加未读（未读数以服务端 getChatList 为准，避免补推消息在服务端未读基础上重复+1导致翻倍）

// ----------- 根据会话项生成唯一 key
function keyOf(item) {
  return `${item.SessionCategoryID}:${item.SessionDataID}`
}

// ----------- 刷新「消息」tab 的未读角标（tab 索引 2，与 pages.json 的 tabBar 顺序一致）
function updateTabBadge() {
  const total = RecentList.reduce((sum, item) => sum + (item.UnReadCount || 0), 0) // 所有会话未读数总和
  try {
    if (total > 0) {
      uni.setTabBarBadge({ index: 2, text: String(total > 99 ? '99+' : total), fail: () => {} }) // fail 静默，非 tab 页调用不报错
    } else {
      uni.removeTabBarBadge({ index: 2, fail: () => {} })
    }
  } catch (e) {}
}

// ----------- 通知所有订阅者列表已变化
function notify() {
  console.log('[Recent] notify 触发，订阅者数量:', Subscribers.length, '会话数:', RecentList.length)
  Subscribers.forEach((fn) => {
    try {
      fn(RecentList)
    } catch (e) {
      console.error('[Recent] 订阅回调执行失败:', e)
    }
  })
  updateTabBadge()
}

// ----------- 延迟拉取服务端会话列表并合并到本地
// 不能直接整体替换成服务端列表：刚被拉进的新群在服务端可能还没生成，或没有消息排序很靠后
function scheduleRefresh(delay) {
  refreshTimer = setTimeout(async () => {
    refreshTimer = null
    try {
      const res = await getChatList() // 服务端会话列表响应
      const serverList = res.Data || [] // 服务端会话列表
      const serverMap = {} // 按会话 key 索引服务端列表，便于查找和剔除
      serverList.forEach((serverItem) => {
        serverMap[keyOf(serverItem)] = serverItem
      })
      let pending = false // 是否还有本地新群没同步到服务端
      // 60 秒内本地插入、服务端还没有的新会话先挑出来（服务端已有的直接用服务端数据和排序）
      const localOnly = [] // 服务端还没有的本地新会话
      RecentList.forEach((item) => {
        if (item._localTop && Date.now() - item._localTop < 60000 && !serverMap[keyOf(item)]) {
          localOnly.push(item)
          pending = true
        }
      })
      RecentList.length = 0
      RecentList.push(...serverList)
      // 本地新会话按最后消息时间倒序插入到合适位置，不强制置顶（避免压住时间更新的会话）
      localOnly.forEach((item) => {
        const index = RecentList.findIndex((recent) => String(recent.LastSendTime || '') <= String(item.LastSendTime || '')) // 第一个时间不比它新的位置
        if (index === -1) {
          RecentList.push(item)
        } else {
          RecentList.splice(index, 0, item)
        }
      })
      notify()
      // 服务端还没生成新会话时，隔 4 秒再拉一次，最多重试 3 次
      if (pending && refreshRetry < 3) {
        refreshRetry++
        console.log('[Recent] 服务端还没有新群，第', refreshRetry, '次重试')
        scheduleRefresh(4000)
      } else {
        refreshRetry = 0
      }
    } catch (e) {
      refreshRetry = 0
      console.warn('[Recent] 刷新会话列表失败:', e)
    }
  }, delay)
}

export class RecentService {
  // ----------- 初始化会话列表（fresh 为 true 时强制重新拉取）
  static async init(fresh = false) {
    fresh && (InitPromise = null)
    initTimestamp = Date.now()
    await (InitPromise ||
      (InitPromise = getChatList().then((res) => {
        const list = res.Data || [] // 服务端会话列表
        RecentList.length = 0
        RecentList.push(...list)
        updateTabBadge() // 首次拉取后刷新角标（不走 notify，避免页面重复渲染）
        return RecentList
      }).catch((e) => {
        InitPromise = null
        throw e
      })))
    return RecentList
  }

  // ----------- 获取当前会话列表
  static getList() {
    return RecentList
  }

  // ----------- 订阅列表变化
  static subscribe(fn) {
    if (Subscribers.indexOf(fn) === -1) {
      Subscribers.push(fn)
    }
  }

  // ----------- 取消订阅
  static unsubscribe(fn) {
    const index = Subscribers.indexOf(fn)
    if (index !== -1) {
      Subscribers.splice(index, 1)
    }
  }

  // ----------- 延迟从服务端拉取会话列表并合并通知页面（群系统通知等场景用）
  // 服务端生成新会话有延迟，所以延迟 2 秒再拉；拉不到新群就隔 4 秒重试，最多 3 次
  static refresh() {
    refreshRetry = 0
    if (refreshTimer) return
    scheduleRefresh(2000)
  }

  // ----------- 被拉进群：本地先插入群会话（服务端会话可能还没生成，光靠刷新拉不到）
  static async add_group(team) {
    const teamId = String(team.teamId) // 群ID
    const key = `52:${teamId}` // 群会话 key（52 = IMGroup）
    await RecentService.init()
    if (RecentList.find((recent) => keyOf(recent) === key)) return // 已存在不重复插入
    // 用事件里的群信息本地创建会话，再异步补充名称头像并同步服务端
    const item = {
      ID: 0, // 服务端会话ID，startChat 后回填
      SessionCategoryID: 52, // 会话类型：群聊
      SessionDataID: teamId, // 会话对象ID
      SessionName: team.name || '', // 群名称
      SessionLogo: team.avatar || '', // 群头像
      UnReadCount: 0, // 未读数
      LastSendText: '', // 最后一条消息
      LastSendTime: dateFormat(Date.now()), // 最后消息时间用当前时间，合并服务端列表时按时间插入到正确位置
      _localTop: Date.now() // 本地新会话标记，refresh 合并服务端列表时识别它（60 秒内有效）
    }
    RecentList.unshift(item)
    RecentService.fillSummary(item)
    RecentService.refreshFromServer(item)
    notify()
  }

  // ----------- 被踢出群/群解散：从列表移除该群会话
  static remove_group(team) {
    const key = `52:${String(team.teamId)}` // 群会话 key
    const index = RecentList.findIndex((recent) => keyOf(recent) === key) // 会话下标
    if (index === -1) return
    RecentList.splice(index, 1)
    notify()
  }

  // ----------- 手动触发列表变化通知（页面本地改了会话数据后调用，刷新列表和 tab 角标）
  static notify_change() {
    notify()
  }

  // ----------- 调接口校准 tab 角标（页面进入时用，用服务端总未读数覆盖本地累加值，避免本地和服务端数据不一致）
  // 收到新消息的实时累加仍走 updateTabBadge（本地 UnReadCount +1 立即刷新），不依赖此接口
  static refreshBadge() {
    getUnreadTotal().then((res) => {
      const total = Number((res && res.Data && res.Data.unreadTotal) || 0) // 服务端返回的总未读数
      // 用接口总数回写到本地列表，保证后续本地累加基于准确基数
      // （不逐条回写，直接设角标即可；本地累加会在当前角标基础上继续 +1，实时性不受影响）
      try {
        if (total > 0) {
          uni.setTabBarBadge({ index: 2, text: String(total > 99 ? '99+' : total), fail: () => {} })
        } else {
          uni.removeTabBarBadge({ index: 2, fail: () => {} })
        }
      } catch (e) {}
    }).catch(() => {})
  }

  // ----------- 设置当前正在聊天的会话（该会话新消息不累加未读数）
  static setCurrentChat(key) {
    currentChatKey = key
  }

  // ----------- 清除当前聊天会话标记
  static clearCurrentChat() {
    currentChatKey = ''
  }

  // ----------- 收到新消息：置顶会话、更新最后消息、累加未读
  static async new_message(key, message) {
    console.log('[Recent] new_message 收到 key:', key, '消息:', message.MsgText)
    const [CategoryId, DataId] = key.split(':') // 会话类型和对象ID
    await RecentService.init()
    console.log('[Recent] init 完成，列表长度:', RecentList.length)
    let item = RecentList.find((recent) => keyOf(recent) === key) // 已有会话项
    if (item) {
      console.log('[Recent] 找到已有会话:', item.SessionName)
      // 已存在的会话移到最前面
      const index = RecentList.indexOf(item)
      RecentList.splice(index, 1)
      RecentList.unshift(item)
    } else {
      console.log('[Recent] 新会话，本地创建')
      // 新会话先本地创建，再异步补充名称头像并同步服务端
      item = {
        ID: 0, // 服务端会话ID，startChat 后回填
        SessionCategoryID: Number(CategoryId), // 会话类型
        SessionDataID: DataId, // 会话对象ID
        SessionName: '', // 会话名称
        SessionLogo: '', // 会话头像
        UnReadCount: 0 // 未读数
      }
      RecentList.unshift(item)
      RecentService.fillSummary(item)
      RecentService.refreshFromServer(item)
    }
    // 更新最后一条消息信息
    item.LastSendText = message.MsgText
    item.LastSendTime = message.MsgTime
    item.LastSendUserID = message.SendUserID
    item.LastDomain = message.Domain
    // 不是自己发的、且不在当前聊天页时累加未读
    if (!message.IsMe && key !== currentChatKey) {
      if (suppressUnread) {
        // 重连补偿期间不累加未读：此时 SDK 补推的离线消息服务端已计入未读数，getChatList 会拉到，再+1就翻倍了
        console.log('[Recent] 重连补偿期间，跳过未读累加（以服务端为准），key:', key)
      } else {
        item.UnReadCount = (item.UnReadCount || 0) + 1
      }
    }
    notify()
    return item
  }

  // ----------- 撤回消息：如果撤回的是最后一条，更新列表预览
  static revoke_message(key, domain) {
    const item = RecentList.find((recent) => keyOf(recent) === key) // 会话项
    if (!item) return
    if (item.LastDomain === domain) {
      item.LastSendText = `<m_revoke,${domain}>`
      notify()
    }
  }

  // ----------- 清空会话未读数（进入聊天页时调用）
  static async read(key) {
    const item = RecentList.find((recent) => keyOf(recent) === key) // 会话项
    if (!item) return
    const changed = item.UnReadCount > 0 // 未读数是否有变化
    item.UnReadCount = 0
    const [CategoryId, DataId] = key.split(':') // 会话类型和对象ID
    // 单聊给对方发已读回执
    if (Number(CategoryId) === 20) {
      IMService.send(String(DataId), `<m_read,${key}>`, guid(), false).catch((e) => {
        console.warn('[Recent] 发送已读回执失败:', e)
      })
    }
    // 同步服务端清空未读
    if (item.ID) {
      const params = { chatId: item.ID } // 清未读参数
      if (Number(CategoryId) === 20) {
        params.sendUserId = DataId
      }
      await resetChat(params).catch((e) => {
        console.warn('[Recent] 清空未读失败:', e)
      })
      // resetChat 完成后重新校准 tab 角标：聊天页退出时本地未读已是0（聊天期间不累加），
      // 但服务端未读要等 resetChat 才清，列表页 onShow 的 refreshBadge 可能在它之前跑，拿到旧总数导致角标残留
      RecentService.refreshBadge()
    }
    changed && notify()
  }

  // ----------- 异步补充新会话的名称和头像
  static async fillSummary(item) {
    try {
      const res = await getSummary(item.SessionCategoryID, item.SessionDataID) // 概要信息响应
      const info = res.Data || res // 概要信息
      item.SessionName = info.ViewName || info.UserName || info.IMGroupName || info.DataTitle || String(item.SessionDataID)
      item.SessionLogo = info.DataLogo || info.UserLogo || info.IMGroupLogo || ''
      notify()
    } catch (e) {
      console.warn('[Recent] 获取会话概要失败:', e)
      item.SessionName = item.SessionName || String(item.SessionDataID)
    }
  }

  // ----------- 新会话同步到服务端并回填会话ID
  static async refreshFromServer(item) {
    try {
      const res = await startChat({ chatCategoryId: item.SessionCategoryID, chatDataId: item.SessionDataID }) // 服务端会话信息
      const recent = res.Data || res // 服务端返回的会话
      if (recent && recent.ID) {
        item.ID = recent.ID
      }
    } catch (e) {
      console.warn('[Recent] 同步会话失败:', e)
    }
  }
}

// 订阅群变化：被拉进群本地插入会话，被踢出/群解散移除会话，再刷新服务端列表兜底
IMService.team_change((name, team) => {
  if (!team || !team.teamId) return
  if (name === 'onTeamJoined') {
    RecentService.add_group(team)
  } else {
    RecentService.remove_group(team)
  }
  RecentService.refresh()
})

// 订阅连接状态：断线重连成功后重新拉取会话列表补偿漏收的消息
IMService.state_change((state, oldState) => {
  if (Date.now() - initTimestamp <= 5000) {
    // 刚初始化过（5秒内）不重复拉取
    return
  }
  if (state === EnumStatus.Connected && oldState !== EnumStatus.Connected) {
    // 重连补偿期间设标志：SDK 补推的离线消息不累加未读（服务端 getChatList 已计入未读数，再+1会翻倍）
    // init 完成后再保持 2 秒，确保所有补推消息都处理完才恢复正常累加
    suppressUnread = true
    InitPromise = null
    RecentService.init().then(() => {
      notify()
      setTimeout(() => {
        suppressUnread = false
        console.log('[Recent] 重连补偿结束，恢复正常未读累加')
      }, 2000)
    }).catch(() => {
      suppressUnread = false
    })
  }
})
