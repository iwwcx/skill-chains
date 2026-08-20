/**
 * 消息分发层（对应 big 项目 services/message.ts 的接收消息部分）
 * 订阅 IM SDK 拍平后的消息，做过滤/去重/协议解析，再分发给：
 * 1. 聊天页订阅者（subscribe 注册）
 * 2. 会话列表 RecentService（未读数、最后一条消息）
 */
import { IMService } from './im.js'
import { RecentService } from './recent.js'
import { dateFormat, decodeHtml, getUser } from './util.js'

// 会话类型，与服务端一致
export const Category = {
  User: 20, // 单聊
  IMGroup: 52, // 群聊
  IMGroupNotice: 54 // 团队通知
}

const Subscribers = {} // 会话消息订阅者 { 'CategoryId:DataId': [fn] }
const DomainCache = {} // 已接收消息的 domain 缓存，用于去重 { key: [domain] }

// ----------- 记录并判断消息是否重复（同一 domain 只处理一次）
function isDuplicate(key, domain) {
  if (!domain) return false
  const list = DomainCache[key] || (DomainCache[key] = []) // 当前会话的 domain 列表
  if (list.indexOf(domain) !== -1) {
    return true
  }
  list.push(domain)
  // 最多保留最近 100 条，避免无限增长
  if (list.length > 100) {
    list.splice(0, list.length - 100)
  }
  return false
}

// ----------- 通知某个会话的所有订阅者
function notify(key, event) {
  const list = Subscribers[key] || [] // 当前会话的订阅者列表
  list.forEach((fn) => {
    try {
      fn(event)
    } catch (e) {
      console.error('[Message] 订阅回调执行失败:', e)
    }
  })
}

// ----------- 处理收到的实时消息
function handleReceive(imMessage) {
  try {
    const content = imMessage.content // 消息文本
    const UserID = String((getUser() || {}).UserID || '') // 当前用户ID

    // 已读回执消息，不需要解析内容，只通知聊天页更新已读状态
    if (content && content.indexOf('<m_read') > -1) {
      if (imMessage.sender !== UserID) {
        notify(`${Category.User}:${imMessage.sender}`, { type: 'read' })
      }
      return
    }

    // 群系统通知（如被拉进群）也会触发消息回调，没有文本内容
    // 不能分发成普通消息，但要刷新会话列表，让新群实时出现在列表里
    if (!content && imMessage.conversationType === 2) {
      RecentService.refresh()
      return
    }

    // 计算会话 key：单聊是对方ID，群聊是群ID
    const CategoryId = imMessage.groupId ? Category.IMGroup : Category.User // 会话类型
    let DataId = CategoryId === Category.User ? imMessage.sender : imMessage.groupId // 会话对象ID
    if (UserID === DataId) {
      // 自己多端同步发出的消息，会话对象换成接收者
      DataId = imMessage.receiver
      // 批量转发的消息 domain 是 json 字符串，格式 {"raw":"xxx"}，取 raw
      if (imMessage.domain && imMessage.domain.indexOf('{') > -1) {
        try {
          imMessage.domain = JSON.parse(imMessage.domain).raw
        } catch (e) {}
      }
    }
    const key = `${CategoryId}:${DataId}` // 会话唯一标识

    // 去重，多端登录可能重复收到
    if (isDuplicate(key, imMessage.domain)) {
      return
    }
    // 自己发给自己的消息不处理
    if (UserID === imMessage.sender && UserID === imMessage.receiver) {
      return
    }

    // 撤回消息：<m_revoke,被撤回消息的domain>
    const revokeMatch = /^<m_revoke,([^>]+)>\s*$/.exec(content || '') // 撤回消息匹配
    if (revokeMatch) {
      notify(key, { type: 'revoke', domain: revokeMatch[1], sender: imMessage.sender })
      RecentService.revoke_message(key, revokeMatch[1])
      return
    }

    // 普通消息，组装成聊天页使用的结构
    const decodedContent = decodeHtml(content) // 解码 HTML 实体
    const message = {
      MsgID: imMessage.domain || imMessage.id, // 消息ID，优先用客户端标识
      Domain: imMessage.domain, // 客户端唯一标识
      MsgText: decodedContent, // 消息文本
      MsgTime: dateFormat(imMessage.time), // 消息时间
      SendUserID: imMessage.sender, // 发送者ID
      IsMe: UserID === imMessage.sender, // 是否自己发的
      IsRead: 0 // 已读状态
    }
    notify(key, { type: 'message', message })
    RecentService.new_message(key, message).then(() => {
    }).catch((e) => {
      console.error('[Message] new_message 失败:', e)
    })
  } catch (e) {
    console.error('[Message] 处理实时消息失败:', e, JSON.stringify(imMessage))
  }
}

export class MessageService {
  // ----------- 订阅某个会话的实时消息事件
  // 事件类型：message 新消息 / revoke 撤回 / read 已读回执
  static subscribe(key, fn) {
    const list = Subscribers[key] || (Subscribers[key] = []) // 当前会话的订阅者列表
    if (list.indexOf(fn) === -1) {
      list.push(fn)
    }
  }

  // ----------- 取消订阅
  static unsubscribe(key, fn) {
    const list = Subscribers[key] // 当前会话的订阅者列表
    if (!list) return
    const index = list.indexOf(fn)
    if (index !== -1) {
      list.splice(index, 1)
    }
  }
}

// 注册到 IM SDK 适配层，模块加载即生效
IMService.receive_message(handleReceive)
