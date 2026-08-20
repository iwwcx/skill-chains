# im-message 实时消息模块完整文档

> 本文档详细说明本模块如何基于**网易云信 SDK（nim-web-sdk-ng）**实现消息的实时收发，
> 包括网易云信对接、实时刷新机制、消息协议标签、图片/文件/语音发送的完整流程、各页面功能等。

---

## 目录

- [一、背景：为什么要接网易云信 SDK](#一背景为什么要接网易云信-sdk)
- [二、整体架构](#二整体架构)
- [三、完整文件清单与职责](#三完整文件清单与职责)
- [四、网易云信 SDK 对接详解（services/im.js）](#四网易云信-sdk-对接详解servicesimjs)
- [五、消息分发层详解（services/message.js）](#五消息分发层详解servicesmessagejs)
- [六、会话列表层详解（services/recent.js）](#六会话列表层详解servicesrecentjs)
- [七、消息协议标签完整说明](#七消息协议标签完整说明)
- [八、发送图片的完整流程](#八发送图片的完整流程)
- [九、发送文件的完整流程](#九发送文件的完整流程)
- [十、发送语音消息的完整流程](#十发送语音消息的完整流程)
- [十一、发送产品链接的完整流程](#十一发送产品链接的完整流程)
- [十二、聊天详情页功能详解（pages/chat/detail.vue）](#十二聊天详情页功能详解pageschatdetailvue)
- [十三、会话列表页功能详解（pages/message/index.vue）](#十三会话列表页功能详解pagesmessageindexvue)
- [十四、群信息页（pages/group/info.vue）](#十四群信息页pagesgroupinfovue)
- [十五、团队通知页（pages/notice/index.vue）](#十五团队通知页pagesnoticeindexvue)
- [十六、产品选择页（pages/product/index.vue）](#十六产品选择页pagesproductindexvue)
- [十七、接口清单](#十七接口清单)
- [十八、工具函数（services/util.js）](#十八工具函数servicesutiljs)
- [十九、图片工具（libs/image.js）](#十九图片工具libsimagejs)
- [二十、实时刷新数据机制总结](#二十实时刷新数据机制总结)
- [二十一、完整时序图](#二十一完整时序图)
- [二十二、踩过的坑清单](#二十二踩过的坑清单)
- [二十三、迁移到其他 uniapp 项目](#二十三迁移到其他-uniapp-项目)
- [二十四、已知未实现的功能](#二十四已知未实现的功能)

---

## 一、背景：为什么要接网易云信 SDK

### 原来的链路（纯接口，无实时性）

```
发消息：页面 → 调接口 /im/SaveRecordByClient → 存数据库
看消息：页面 → 调接口 /im/GetRecordList → 从数据库拉历史记录
```

问题：数据库没有"推送"能力。A 发了消息，B 的页面上什么都不会发生，
除非 B 手动刷新或重新进入页面。

### 接入 SDK 后的链路（双通道）

```
              ┌─→ 网易云信 SDK（长连接）→ 实时推给对方客户端
发消息：页面 ─┤
              └─→ 接口 /im/SaveRecordByClient → 存数据库（历史记录用）

收消息：网易云信长连接 → 实时推下来 → 页面立即上屏，无需刷新
```

**核心结论：SDK 负责"实时送达"，接口负责"服务端存档"，两条通道都要走。**

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────┐
│  页面层                                              │
│  pages/chat/detail.vue       （聊天详情页）           │
│  pages/message/index.vue     （会话列表页，在项目根）  │
│  pages/group/info.vue        （群信息页）             │
│  pages/notice/index.vue      （团队通知页）           │
│  pages/product/index.vue     （产品选择页）           │
└──────────────┬──────────────────┬───────────────────┘
               │ subscribe        │ subscribe
┌──────────────▼──────────────────▼───────────────────┐
│  服务层 services/                                    │
│  message.js  消息分发层（协议解析/去重/分发）          │
│  recent.js   会话列表层（未读数/置顶/最后一条）        │
│  util.js     工具函数（guid/dateFormat/decodeHtml）   │
└──────────────┬──────────────────────────────────────┘
               │ receive_message / send
┌──────────────▼──────────────────────────────────────┐
│  适配层 services/im.js                               │
│  唯一和 SDK 打交道的地方：登录/保活/收发/断线重连      │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  网易云信 SDK  nim-web-sdk-ng（WebSocket 长连接）     │
└─────────────────────────────────────────────────────┘
```

**设计原则：只有 `im.js` 碰 SDK。** 上层拿到的都是处理好的普通 JS 对象，
以后如果要换 IM 厂商，只需要重写 `im.js` 一个文件。

---

## 三、完整文件清单与职责

| 文件                         | 职责                                                               |
| ---------------------------- | ------------------------------------------------------------------ |
| `services/im.js`             | SDK 适配层：创建实例、登录、断线重连、消息拍平、发送消息           |
| `services/message.js`        | 消息分发层：协议解析（撤回/已读/普通）、Domain 去重、分发          |
| `services/recent.js`         | 会话列表层：置顶、未读数累加/清空、新会话创建、重连补偿            |
| `services/util.js`           | 工具函数：guid、日期格式化、HTML 实体解码、获取当前用户/路由       |
| `api/index.js`               | 所有后端接口定义（IM + 产品 + OBS 上传）                           |
| `api/config.js`              | API 域名配置（api60/api80/accapi/profitapi）                       |
| `api/request.js`             | 请求封装：基于 uni.request，支持多域名、token 注入、错误拦截       |
| `libs/image.js`              | 产品图片 CDN 地址格式化                                            |
| `pages/chat/detail.vue`      | 聊天详情页：消息列表、发送文本/图片/语音/文件、撤回、引用、@群成员 |
| `pages/group/info.vue`       | 群信息页：群名称、群成员列表、角色标签                             |
| `pages/notice/index.vue`     | 团队通知页：通知列表、占位符翻译、分页加载                         |
| `pages/product/index.vue`    | 产品选择页：企业产品/收藏/足迹三个 Tab，批量发送产品链接           |
| `package.json`（项目根目录） | 声明 `nim-web-sdk-ng` 依赖                                         |

---

## 四、网易云信 SDK 对接详解（services/im.js）

### 4.1 平台适配（条件编译）

不同平台引入不同的 SDK 构建产物，编译时只保留当前平台的一份：

```js
// #ifdef MP
import NIM from 'nim-web-sdk-ng/dist/v2/NIM_MINIAPP_SDK'; // 小程序专用版
// #endif
// #ifdef APP-PLUS
import NIM from 'nim-web-sdk-ng/dist/v2/NIM_UNIAPP_SDK'; // App 专用版
// #endif
// #ifdef H5
import NIM from 'nim-web-sdk-ng'; // H5 浏览器版
// #endif
```

### 4.2 SDK 实例创建

```js
const NIM_APP_KEY = '1cceec4b1cc4a4cf05e5fbda8d898ab2';

nimInstance = NIM.getInstance(
  { appkey: NIM_APP_KEY, debugLevel: 'off', apiVersion: 'v2' },
  {
    V2NIMLoginServiceConfig: {
      lbsUrls: ['https://lbs.netease.im/lbs/webconf.jsp'], // LBS 负载均衡地址
      linkUrl: 'weblink.netease.im:443', // 长连接服务器
    },
  },
);
```

- `NIM_APP_KEY`：网易云信控制台分配的应用唯一标识，和 big 网页端/PC 端用同一个
- `apiVersion: 'v2'`：使用 V2 版 API
- 实例全局唯一，`ensureInstance()` 保证只创建一次

### 4.3 登录流程

```
1. 从 uni.getStorageSync('userInfo') 取 UserID 作为 IM 账号
2. 调 GET api80/im/generateToken 拿网易云信 token
3. NIM.getInstance() 创建 SDK 实例（全局单例）
4. nim.V2NIMLoginService.login(String(UserID), token) 建立长连接
5. 记录 loginTimestamp（用于过滤登录前的旧消息）
6. SetState(EnumStatus.Connected) 通知所有订阅者
```

**token 的坑**：`/im/generateToken` 返回 `{code:0, data:{token:"..."}}`，
token 藏在 `data.token` 里。`extractToken()` 做了递归提取，
兼容纯文本 / `{data: token}` / `{data:{token}}` / `{Data:{Token}}` 等多种结构。

**并发控制**：`LoginPromise` 缓存登录 Promise，多个页面同时调用只执行一次真实登录。
失败后保留缓存，必须 `login(true)` 强制重试。

### 4.4 连接状态机

```js
EnumStatus = {
  Connecting: -1, // 登录中
  None: 0, // 未登录
  Connected: 1, // 登录成功
  Elsewhere: 2, // 帐号在别处登录（被踢下线）
  DisConnect: 3, // 断开连接
};
```

SDK 事件 → 状态映射：

| SDK 事件          | 状态值  | 映射到                                     |
| ----------------- | ------- | ------------------------------------------ |
| `onLoginStatus`   | 0/1/2/3 | None/Connected/Connecting/DisConnect       |
| `onConnectStatus` | 0/1/2/3 | DisConnect/Connected/Connecting/Connecting |
| `onKickedOffline` | -       | Elsewhere（不自动重连）                    |

外部通过 `IMService.state_change(fn)` 订阅状态变化。

### 4.5 断线重连（指数退避）

```
断开 → 5s 后重连 → 再失败 10s → 20s → 40s → ... → 最长 120s
连接成功 → 重置回 5s
同一时刻只有一个重连定时器
```

- `reconnectDelay` 初始 5000ms，每次翻倍，上限 120000ms
- 被踢下线（Elsewhere）不触发重连

### 4.6 消息接收（拍平）

监听 `onReceiveMessages`，把 SDK 原始消息拍平成统一格式：

```js
{
  id:               messageServerId,       // 服务端消息ID
  domain:           attachment.raw,        // 客户端自定义标识（uuid）
  content:          message.text,          // 消息文本（协议格式）
  time:             createTime,            // 时间戳（毫秒）
  sender:           senderId,              // 发送者账号
  receiver:         receiverId,            // 接收者账号
  groupId:          群聊时是群ID否则空,     // conversationType == 2 或 3
  conversationType: 0/1/2/3                // 未知/单聊/群聊/超级群
}
```

早于 `loginTimestamp` 的消息直接丢弃（重连后 SDK 补推的旧消息）。

### 4.7 消息发送

```js
IMService.send(to, content, domain, isGroup);
```

1. 未连接先 `login()`
2. `createCustomMessage(content, domain)` 创建自定义消息（domain 塞进附件 raw）
3. `p2pConversationId(to)` / `teamConversationId(to)` 拼会话 ID
4. `sendMessage(message, conversationId)` 发出

**所有消息都是自定义消息**，内容是协议文本，对方按协议解析——这是和 big 端互通的前提。

---

## 五、消息分发层详解（services/message.js）

### 5.1 会话类型常量

```js
Category = { User: 20, IMGroup: 52, IMGroupNotice: 54 };
```

### 5.2 会话 key 规则

```
单聊：    '20:对方UserID'
群聊：    '52:群ID'
团队通知：'54:通知ID'
```

### 5.3 收到消息后的处理顺序

```
1. <m_read 开头？ → 已读回执，通知聊天页标记已读，结束
2. 群系统通知（无内容+群类型）→ 忽略，结束
3. 计算会话 key（单聊取对方ID，群聊取群ID）
4. 自己多端同步的消息 → 会话对象换成接收者，domain 取 raw
5. Domain 去重（每会话缓存最近 100 个）→ 重复丢弃
6. 自己发给自己 → 丢弃
7. <m_revoke,domain>？ → 撤回事件，通知聊天页+列表页，结束
8. 普通消息 → decodeHtml 解码 → 组装 → 分发
```

### 5.4 为什么必须 Domain 去重

多端登录时网易云信给每个端都推一遍，发送方也会收到自己发的。
Domain 是发送方生成的 uuid，全局唯一，天然做去重键。

### 5.5 分发的两个方向

- `notify(key, event)` → 聊天页订阅者
- `RecentService.new_message(key, message)` → 会话列表层

事件类型：`message` 新消息 / `revoke` 撤回 / `read` 已读回执。

### 5.6 模块加载即注册

文件最后一行 `IMService.receive_message(handleReceive)` 在模块加载时立即执行，
只要任何页面 import 了 `message.js`，消息接收链路就自动接通。

---

## 六、会话列表层详解（services/recent.js）

### 6.1 数据结构

`RecentList` 结构和服务端 `/im/GetChatList` 返回完全一致：

| 字段                | 说明                  |
| ------------------- | --------------------- |
| `ID`                | 服务端会话ID          |
| `SessionCategoryID` | 会话类型（20/52/54）  |
| `SessionDataID`     | 会话对象ID            |
| `SessionName`       | 会话名称              |
| `SessionLogo`       | 会话头像              |
| `LastSendText`      | 最后一条消息预览      |
| `LastSendTime`      | 最后一条消息时间      |
| `LastSendUserID`    | 最后一条消息发送者    |
| `LastDomain`        | 最后一条消息的 domain |
| `UnReadCount`       | 未读数                |

### 6.2 新消息进来（new_message）

```
找到会话 → 移到最前面（置顶）
没找到 → 本地创建占位项 → 异步补名称头像 → 异步同步服务端
更新 LastSendText/Time/UserID/Domain
非自己发的 && 不在当前聊天页 → UnReadCount +1
notify() 通知订阅者
```

### 6.3 进入聊天页（read）

```
UnReadCount 清零
单聊：发 <m_read,会话key> 已读回执给对方
调 /im/ResetChat 同步服务端
```

### 6.4 重连补偿

断线重连成功后自动重新拉 `/im/GetChatList`，补偿漏收的消息（5 秒防抖）。

---

## 七、消息协议标签完整说明

所有消息本质都是**文本协议**，双方客户端各自解析。这是和 big 网页端/PC 端互通的关键。

### 7.1 完整标签对照表

| 标签     | 格式                                                              | MsgType | 说明                              |
| -------- | ----------------------------------------------------------------- | ------- | --------------------------------- |
| 纯文本   | `直接文本`                                                        | 0       | 不以 `<m_` 开头                   |
| 图片     | `<m_img,url:图片URL>`                                             | 2       | URL 是 OBS 上传后的公开地址       |
| 语音     | `<m_audio,语音地址,时长秒>`                                       | 8       | 地址是 OBS 公开地址               |
| 文件     | `<m_file,110:ID:LifeVersion:CreateUser,大小,编码文件名,是否私有>` | 7       | ID 是资料库文档ID                 |
| 链接卡片 | `<m_link,URL,标题,图片URL,描述>`                                  | 21      | 各字段 URL 编码，用于产品分享     |
| 引用回复 | `<m_quote,作者,编码后的引用文本>回复内容</m_quote>`               | 22      | 作者名+被引用内容 URL 编码        |
| 撤回     | `<m_revoke,被撤回消息的domain>`                                   | 无      | 替换原消息为撤回提示              |
| 已读回执 | `<m_read,会话key>`                                                | 无      | 单聊进入聊天页时发给对方          |
| 表情     | `<m_ico,表情key>`                                                 | 0       | 预览显示 `[表情]`                 |
| 视频     | `<m_video,...>`                                                   | 0       | 预览显示 `[视频]`，当前未实现发送 |
| 分享数据 | `<m_data,...>`                                                    | 0       | 预览显示 `[分享]`，当前未实现发送 |
| 提示     | `<m_tip,...>`                                                     | 0       | 预览中不显示                      |
| 窗口抖动 | `<m_shake>`                                                       | 0       | 预览显示 `[窗口抖动]`             |

### 7.2 各标签详细说明

#### 图片 `<m_img,url:地址>`

- 发送时：先上传到 OBS，拿到公开 URL，再拼成标签
- 本地预览：发送中先用 `<m_img,local:临时路径>` 占位
- 接收解析：提取 URL，相对路径拼 `https://prodimg.global-dsc.cn` 前缀
- PC 端图片路径可能带 `big-engineer` 前缀，需去掉后拼 prodimg
- URL 自动加 `?x-oss-process=image/resize,w_400` 限制宽度 400px

#### 语音 `<m_audio,地址,时长>`

- 发送时：录音保存为 MP3，上传到 OBS
- 播放时：`uni.createInnerAudioContext()` 播放 OBS 公开地址
- 兼容旧格式：非 http 开头拼阿里云 OSS 前缀

#### 文件 `<m_file,110:ID:LifeVersion:CreateUser,大小,编码文件名,是否私有>`

- `110` = `Category.Document`（文档类型）
- `ID` = `saveDocumentLife` 返回的资料库文档ID
- `LifeVersion` = 文档版本号
- `CreateUser` = 创建者用户ID
- `大小` = 文件字节数
- `编码文件名` = `encodeURIComponent(文件名)`
- `是否私有`：1 私有，0 公开
- 下载时：先调 `getDocFileInfo(dataId)` 拿 `FileServerPath`，再拼 OBS 域名下载

#### 链接卡片 `<m_link,URL,标题,图片URL,描述>`

- 用于产品分享，所有字段 URL 编码
- 点击时：产品详情链接跳转小程序原生页，其他用 webview
- 产品 URL 格式转换：`/product/detail/数字?version=数字` → `/product-detail/?id=数字&version=数字`

#### 引用回复 `<m_quote,作者,编码后的引用文本>回复内容</m_quote>`

- 气泡内显示回复内容，气泡外显示引用的作者和原文
- 作者名：自己显示"我"，群聊取发送者昵称，单聊取对方名称

#### 撤回 `<m_revoke,被撤回消息的domain>`

- 限制：只能撤回自己发的、30 分钟以内的消息
- 流程：SDK 实时通知对方 → 接口存档 → 本地替换为撤回提示

#### 已读回执 `<m_read,会话key>`

- 只在单聊中使用
- 触发时机：进入聊天页时、收到对方消息时
- 对方收到后：把自己发的所有消息 IsRead 标记为 1
- 没有接口调用，纯靠 SDK 自定义消息传递

### 7.3 会话列表预览文本解析

```
<m_ico,...>   → [表情]
<m_img,...>   → [图片]
<m_file,...>  → [文件]
<m_audio,...> → [语音]
<m_video,...> → [视频]
<m_link,...>  → [链接]
<m_data,...>  → [分享]
<m_quote,...> → [引用消息]
<m_tip,...>   → （空）
<m_shake>     → [窗口抖动]
<m_revoke,...>→ [撤回了一条消息]
其他           → 原文显示
```

---

## 八、发送图片的完整流程

### 8.1 整体流程

```
用户点"相册"或"拍照"
  → uni.chooseImage() 选择图片
  → 本地先插入消息气泡（显示本地临时图片，状态：发送中）
  → 获取图片 ContentType（jpg/png/gif/bmp/webp）
  → 获取文件 MD5 作为 OBS 文件 key
  → 调 POST /obs/putUrlSignature 获取 OBS 上传凭证
  → 用 HMAC-SHA1 签名 + uni.uploadFile 上传到 OBS
  → 拼接图片公开访问 URL
  → 通过 IM SDK 发送 <m_img,url:图片URL> 给对方
  → 调 /im/SaveRecordByClient 存档到服务端
  → 更新本地消息状态为成功
```

### 8.2 涉及的接口

| 步骤         | 接口                                                                  | 说明                                            |
| ------------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| 获取上传凭证 | `POST profitapi/obs/putUrlSignature?category=50&key={md5}&priv=false` | 返回 OBS 桶名、文件路径、临时密钥、公开访问域名 |
| IM 实时发送  | `IMService.send(to, '<m_img,url:地址>', domain, isGroup)`             | 通过网易云信 SDK 实时送达                       |
| 服务端存档   | `POST api60/im/SaveRecordByClient`                                    | 存数据库供历史记录使用                          |

### 8.3 OBS 上传详细过程

1. **获取凭证**：调 `obsPutUrlSignature`，返回：
   - `options.bucket`：OBS 桶名
   - `options.key`：OBS 文件路径
   - `options.displayDomain`：图片公开访问域名
   - `credential.access`：临时 AccessKeyId
   - `credential.secret`：临时 Secret Access Key
   - `credential.securitytoken`：临时安全令牌

2. **构造上传表单**：
   - `policy`：JSON 格式的上传限制条件，Base64 编码
   - `signature`：用 HMAC-SHA1 算法对 policy 签名
   - `AccessKeyId`：临时访问密钥
   - `x-obs-security-token`：临时安全令牌
   - `key`：文件存储路径
   - `content-type`：文件类型

3. **上传**：`uni.uploadFile()` POST 表单到 `https://{bucket}.{domain}`

4. **拼接公开 URL**：`displayDomain + '/' + options.key`

### 8.4 图片 ContentType 对照

| 后缀     | ContentType        |
| -------- | ------------------ |
| jpg/jpeg | image/jpeg         |
| png      | image/png          |
| gif      | image/gif          |
| bmp      | image/bmp          |
| webp     | image/webp         |
| 其他     | image/jpeg（兜底） |

### 8.5 HMAC-SHA1 签名算法

小程序环境没有 Node.js 的 crypto 模块，代码内置了纯 JS 实现的 SHA1 和 HMAC-SHA1：

- `utf8ToBytes(value)`：字符串转 UTF-8 字节数组
- `bytesToBase64(bytes)`：字节数组转 Base64 字符串
- `sha1(bytes)`：计算 SHA1 摘要（80 轮运算）
- `hmacSha1(messageBytes, keyBytes)`：HMAC-SHA1 签名

这些函数在 `detail.vue` 的 methods 中直接定义，不依赖任何外部库。

---

## 九、发送文件的完整流程

### 9.1 整体流程

```
用户点"文件"
  → uni.chooseMessageFile({ count:1, type:'file' }) 选择文件
  → 本地先插入消息气泡（显示文件名和大小，状态：发送中）
  → 获取文件后缀对应的 ContentType
  → 获取文件 MD5 作为 OBS 文件 key
  → 调 POST /obs/putUrlSignature 获取 OBS 上传凭证
  → 上传文件到 OBS（复用图片上传方法）
  → 调 POST /data/110/savelife 保存文件元数据到资料库
     → 返回 { ID, LifeVersion, CreateUser }
  → 拼接文件消息：<m_file,110:ID:LifeVersion:CreateUser,大小,编码文件名,1>
  → 通过 IM SDK 发送给对方
  → 调 /im/SaveRecordByClient 存档到服务端
  → 更新本地消息状态为成功
```

### 9.2 涉及的接口

| 步骤         | 接口                                                                  | 说明                             |
| ------------ | --------------------------------------------------------------------- | -------------------------------- |
| 获取上传凭证 | `POST profitapi/obs/putUrlSignature?category=50&key={md5}&priv=false` | 同图片上传                       |
| 保存到资料库 | `POST api60/data/110/savelife`                                        | 保存文件元数据，返回文档ID和版本 |
| IM 实时发送  | `IMService.send(to, '<m_file,...>', domain, isGroup)`                 | 通过网易云信 SDK 实时送达        |
| 服务端存档   | `POST api60/im/SaveRecordByClient`                                    | 存数据库供历史记录使用           |

### 9.3 saveDocumentLife 请求体

```js
{
  Datas: [
    {
      DataId: 0, // 新建传 0
      LifeToken: null,
      Data: {
        DocName: fileName, // 文件名
        FileBucket: options.bucket, // OBS 桶名
        FileExt: '.ext', // 文件后缀（带点）
        FileHash: fileKey, // 文件 MD5
        FileModifyDate: 'yyyy-MM-dd HH:mm:ss',
        FileServerPath: options.key, // OBS 文件路径
        FileSize: fileSize, // 文件大小（字节）
      },
    },
  ];
}
```

### 9.4 文件下载流程

点击文件卡片时（`onFileTap`）：

```
1. 从 msg.FilePath 拆出文档ID（格式 110:ID:LifeVersion:CreateUser）
2. 调 GET /data/110/fileinfo?dataId={文档ID} 获取 FileServerPath
3. 获取 OBS 公开域名（优先用发送时保存的，没有则请求一次 OBS 签名）
4. 拼接下载 URL：obsDomain + '/' + fileServerPath
5. uni.downloadFile() 下载到临时目录
6. uni.openDocument() 打开预览
```

### 9.5 文件类型图标对照

| 后缀                                               | 图标样式类        |
| -------------------------------------------------- | ----------------- |
| doc/docx                                           | file-icon-word    |
| xls/xlsx                                           | file-icon-excel   |
| ppt/pptx                                           | file-icon-ppt     |
| pdf                                                | file-icon-pdf     |
| rar/zip/7z/gz/tar/arj/z                            | file-icon-zip     |
| jpg/jpeg/png/gif/bmp/webp/svg/ico/tif/tiff         | file-icon-image   |
| mp4/avi/mov/wmv/flv/mkv/webm/m4v/mpeg/mpg/3gp/rmvb | file-icon-video   |
| mp3/wav/flac/aac/ogg/m4a/wma                       | file-icon-audio   |
| 其他                                               | file-icon-default |

### 9.6 文件 ContentType 对照

| 后缀 | ContentType                                                               |
| ---- | ------------------------------------------------------------------------- |
| doc  | application/msword                                                        |
| docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document   |
| pdf  | application/pdf                                                           |
| xls  | application/vnd.ms-excel                                                  |
| xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet         |
| ppt  | application/vnd.ms-powerpoint                                             |
| pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |
| txt  | text/plain                                                                |
| zip  | application/zip                                                           |
| rar  | application/x-rar-compressed                                              |
| 其他 | application/octet-stream                                                  |

---

## 十、发送语音消息的完整流程

### 10.1 录音流程

```
用户切换到"按住说话"模式
  → 按下语音按钮（onVoiceTouchStart）
  → 申请麦克风权限（uni.authorize({ scope:'scope.record' })）
  → uni.getRecorderManager() 获取录音管理器
  → 开始录音：MP3 格式，16kHz 采样率，单声道，48kbps 码率，最长 60 秒
  → 显示录音浮层 + 秒数计时
  → 上滑超过 70px → 显示"松开手指，取消发送"
  → 松开：
     → 取消区域 → 不发送，丢弃录音
     → 正常区域 → 停止录音，进入上传发送流程
     → 录音不足 1 秒 → 提示"录音时间太短"，不发送
```

### 10.2 上传发送流程

```
1. 本地先插入语音气泡（显示本地临时路径和时长，状态：发送中）
2. 获取文件 MD5 作为 OBS key
3. 调 POST /obs/putUrlSignature 获取上传凭证
4. 上传到 OBS（ContentType: audio/mpeg）
5. 拼接语音公开 URL
6. 通过 IM SDK 发送 <m_audio,语音URL,时长秒> 给对方
7. 调 /im/SaveRecordByClient 存档到服务端
8. 更新本地消息状态为成功
```

### 10.3 语音播放

```
用户点击语音气泡
  → 正在播放 → 暂停
  → 同一条语音且已播放过 → 重置进度重新播放（不重复下载）
  → 切换到其他语音 → 销毁旧播放器，创建新的 InnerAudioContext
  → 设置 src 为 OBS 公开地址，autoplay 播放
  → 播放结束/暂停/异常 → 清除播放动画状态
```

兼容旧格式：如果 `AudioPath` 不是 http 开头，
拼 `https://big-engineer.oss-cn-hangzhou.aliyuncs.com/` 前缀。

### 10.4 录音参数

| 参数             | 值    | 说明            |
| ---------------- | ----- | --------------- |
| duration         | 60000 | 最长 60 秒      |
| sampleRate       | 16000 | 16kHz 采样率    |
| numberOfChannels | 1     | 单声道          |
| encodeBitRate    | 48000 | 48kbps 编码码率 |
| format           | mp3   | MP3 格式        |

---

## 十一、发送产品链接的完整流程

### 11.1 产品选择页功能

产品选择页（`pages/product/index.vue`）有三个 Tab：

| Tab      | 数据来源接口                         | 说明                               |
| -------- | ------------------------------------ | ---------------------------------- |
| 企业产品 | `GET api60/prod/GetSList`            | 当前企业的产品，支持目录筛选和搜索 |
| 我的收藏 | `GET api60/favorite/prod/list`       | 收藏的产品，支持目录筛选和搜索     |
| 我的足迹 | `GET api60/logs/ViewProdLogsForUser` | 浏览过的产品，无目录筛选           |

### 11.2 发送流程

```
1. 用户在产品页选择一个或多个产品
2. 点击"发送产品"按钮
3. 遍历选中产品，逐个发送：
   a. 拼接产品 URL：https://big-engineer.global-dsc.cn/product-detail/?id={ProdID}&version=1
   b. 拼接消息：<m_link,产品URL,产品名称-企业名称-大工程师,产品图片URL,>
   c. 通过 IM SDK 发送
   d. 调 /im/SaveRecordByClient 存档
   e. 同步会话列表最后一条消息
4. 全部发送成功 → 提示"发送成功" → 返回聊天页
```

### 11.3 产品消息格式

```
<m_link,
  https%3A%2F%2Fbig-engineer.global-dsc.cn%2Fproduct-detail%2F%3Fid%3D123%26version%3D1,
  产品名称-企业名称-大工程师,
  产品图片URL,
  （描述为空）
>
```

所有字段都经过 `encodeURIComponent` 编码。

---

## 十二、聊天详情页功能详解（pages/chat/detail.vue）

### 12.1 页面路由参数

```
/im-message/pages/chat/detail?key={CategoryId:DataId}&name={对方名称}&logo={对方头像}
```

- `key`：会话唯一标识，格式 `"CategoryId:DataId"`，如 `"20:12345"` 或 `"52:67890"`
- `name`：对方昵称或群名，用于导航栏标题
- `logo`：对方头像路径（未格式化），页面内用 `getProductImageUrlChat` 格式化

### 12.2 页面生命周期

**onLoad（进入页面）：**

1. 解析路由参数，获取 categoryId、dataId、对方名称头像
2. 获取当前用户ID和头像
3. 如果是群聊（categoryId === '52'），加载群成员列表
4. 加载聊天记录（`loadMessages`）
5. 登录 IM（`IMService.login()`）
6. 订阅本会话实时消息（`MessageService.subscribe`）
7. 标记当前聊天会话（`RecentService.setCurrentChat`）
8. 清空未读数 + 发已读回执（`RecentService.read`）
9. 监听键盘高度变化

**onShow（从子页面返回）：**

- 从发产品等子页面返回时，增量拉取最新消息（`loadNewMessages`）
- 首次进入时 onLoad 的加载还没完成，跳过

**onUnload（离开页面）：**

1. 取消实时消息订阅
2. 清除当前会话标记
3. 取消键盘高度监听
4. 清理录音计时器
5. 销毁语音播放器

### 12.3 消息列表加载

**首次加载（loadMessages）：**

- 调 `getRecordList({ categoryId, dataId, msgId:0, pageSize:35 })`
- 接口返回倒序（最新在前），反转为正序（最早在前）
- 处理每条消息：解码 HTML 实体、解析图片/语音/文件/链接/撤回/引用标签
- 滚动到底部，页面淡入显示

**加载更多历史（loadMore）：**

- 滚动到顶部触发
- 取当前最早消息的 MsgID 作为游标（取负值）
- 新消息插入列表头部
- 锚定回原来的消息位置，避免滚动跳变

**增量加载（loadNewMessages）：**

- 从子页面返回时触发
- 拉取最新一页消息，用 Domain 和 MsgID 去重
- 新消息追加到列表底部

### 12.4 消息处理（processMessages）

每条消息经过以下处理：

1. **IsRead 兜底**：自己发的消息如果 IsRead 为 null/undefined，统一设为 0
2. **HTML 实体解码**：`&lt;` → `<`，`&gt;` → `>`，`&amp;` → `&` 等
3. **图片解析**：匹配 `<m_img,url:地址>`，提取 URL，处理相对路径和 big-engineer 前缀
4. **语音解析**：匹配 `<m_audio,地址,时长>`，提取播放地址和时长
5. **文件解析**：匹配 `<m_file,路径,大小,文件名,私有>`，提取文件信息
6. **链接解析**：匹配 `<m_link,url,title,logo,desc>`，提取链接卡片信息
7. **撤回解析**：匹配 `<m_revoke,domain>`，标记为撤回提示
8. **引用解析**：匹配 `<m_quote,作者,引用文本>回复内容</m_quote>`，提取引用信息
9. **显示文本**：把标签转成可读文字（`[图片]`/`[语音]`/`[文件]` 等）
10. **@片段切分**：把文本按 `@名字` 切成片段，@部分渲染为橙色
11. **时间分割线**：首条消息或与上一条间隔超过 1 分钟时显示时间

### 12.5 发送文本消息（onSend）

```
1. 获取输入文本，trim 后为空则不发送
2. 如果有引用，拼接为 <m_quote,作者,编码后的引用文本>回复内容</m_quote>
3. 生成 domain（uuid）
4. 本地先插入消息气泡（状态：发送中，State:-1）
5. 同步会话列表（RecentService.new_message）
6. 清空输入框和引用
7. 滚动到底部
8. 通过 IM SDK 发送（sendToPeer）
9. 调 saveRecordByClient 存档
10. 成功：State = 1；失败：State = 0，提示"发送失败"
```

### 12.6 撤回消息（revokeMessage）

```
1. 检查时间：超过 30 分钟禁止撤回
2. 检查权限：只能撤回自己发的
3. 生成新的 domain
4. 拼接 <m_revoke,原消息domain>
5. 通过 IM SDK 发送给对方
6. 调 saveRecordByClient 存档
7. 本地把原消息替换为撤回提示
```

### 12.7 长按操作菜单

长按消息气泡弹出操作菜单：

| 操作 | 条件           | 功能                     |
| ---- | -------------- | ------------------------ |
| 复制 | 所有消息       | 复制显示文本到剪贴板     |
| 引用 | 所有消息       | 设置引用状态，输入框聚焦 |
| 撤回 | 仅自己发的消息 | 撤回消息（30 分钟内）    |

菜单位置自适应：默认在气泡上方，空间不足时翻转到下方。

### 12.8 @群成员功能（仅群聊）

- 输入 `@` 触发群成员选择面板
- 面板包含"全体成员"和按关键字过滤的群成员列表
- 选择后自动填入 `@名字 ` 到输入框
- 长按群成员头像也可触发 @
- 消息渲染时 `@名字` 部分高亮显示

### 12.9 已读/未读状态

- 仅单聊显示，群聊和通知不显示
- 只显示自己发的消息的已读/未读
- 撤回消息不显示
- `IsRead === 1` 显示"已读"（灰色），否则显示"未读"（红色）
- 收到对方 `<m_read>` 消息后，自己发的所有消息标记为已读

### 12.10 时间显示规则

| 时间差   | 显示格式    |
| -------- | ----------- |
| 当天     | HH:mm       |
| 昨天     | 昨天 HH:mm  |
| 本周内   | 星期X HH:mm |
| 超过一周 | MM-DD HH:mm |

### 12.11 表情面板

内置 108 个 emoji 表情，点击追加到输入框。

### 12.12 键盘处理

- 监听 `uni.onKeyboardHeightChange`，手动控制 footer 位置
- 键盘弹起时 footer 跟上，键盘收起时 footer 回到原位并滚动到底部
- 切换面板（更多/表情）时先收键盘再展示面板，避免跳动

---

## 十三、会话列表页功能详解（pages/message/index.vue）

> 注意：此文件在项目根目录 `pages/message/index.vue`，不在 `im-message/` 目录内

### 13.1 页面功能

- 展示所有最近会话（单聊、群聊、团队通知）
- 实时更新：新消息置顶、未读数累加、最后一条消息预览
- 下拉刷新
- 点击跳转聊天详情页或通知页

### 13.2 会话项展示

| 元素         | 说明                                                 |
| ------------ | ---------------------------------------------------- |
| 头像         | 群聊用固定群图标，通知用固定通知图标，单聊用对方头像 |
| 未读角标     | 红色圆角，超过 99 显示"99+"                          |
| 会话名称     | SessionName，旁边可显示 CompanyBrand                 |
| 会话类型标签 | 群聊显示橙色"群聊"标签，通知显示绿色"通知"标签       |
| 时间         | 最后一条消息时间，格式化显示                         |
| 消息预览     | 最后一条消息文本，标签转为可读文字                   |

### 13.3 团队通知占位符翻译

通知文本中可能包含 `{U:用户ID}` 和 `{G:群ID}` 占位符，需要调 `getSummary` 接口翻译：

- `{U:123}` → 调 `getSummary(20, 123)` → 取 `ViewName/UserName` → 如果是当前用户显示"您"
- `{G:456}` → 调 `getSummary(52, 456)` → 取 `IMGroupName`

翻译结果带高亮效果：普通文本灰色，人名/群名橙色。

### 13.4 点击跳转逻辑

```
SessionCategoryID == 54（通知）→ 跳转 /im-message/pages/notice/index
SessionCategoryID == 20（单聊）→ 跳转 /im-message/pages/chat/detail?key=20:对方ID&name=...&logo=...
SessionCategoryID == 52（群聊）→ 跳转 /im-message/pages/chat/detail?key=52:群ID&name=...&logo=...
未登录 → 跳转登录页
```

### 13.5 实时更新机制

```js
onLoad: IMService.login() + RecentService.subscribe(handler);
onUnload: RecentService.unsubscribe(handler);
```

任何会话收到新消息 → `RecentService` 内部处理好置顶/未读/最后一条 →
通知页面 → 页面整体替换列表重新渲染。

---

## 十四、群信息页（pages/group/info.vue）

### 14.1 页面路由

```
/im-message/pages/group/info?groupId={群ID}&name={群名}&logo={群头像}
```

### 14.2 功能

- 展示群名称、群头像、群成员总数
- 群成员列表，按角色排序：群主 > 管理员 > 普通成员
- 角色标签：群主（橙色）、管理员（绿色）
- 调 `getGroupUserList({ groupId })` 加载成员列表

### 14.3 成员数据结构

| 字段            | 说明                                    |
| --------------- | --------------------------------------- |
| UserID          | 用户ID                                  |
| UserName        | 用户名                                  |
| UserNameInGroup | 群昵称                                  |
| UserLogo        | 头像路径                                |
| RoleInGroup     | 角色（1=群主，2=管理员，其他=普通成员） |

---

## 十五、团队通知页（pages/notice/index.vue）

### 15.1 页面路由

```
/im-message/pages/notice/index
```

### 15.2 功能

- 展示团队通知列表，支持下拉刷新和上拉加载更多
- 每条通知显示标题、时间
- 通知标题中的 `{U:xxx}` `{G:xxx}` 占位符翻译成用户名/群名
- 翻译结果高亮显示：普通文本灰色，人名/群名橙色加粗
- 如果占位符是当前用户，显示"您"

### 15.3 分页机制

- 首次加载：`getGroupNoticeList({ noticeId:0, pageSize:20 })`
- 加载更多：`noticeId` 传最后一条通知ID的负值
- `HasMore` 字段判断是否还有更多

### 15.4 通知数据结构

| 字段       | 说明                     |
| ---------- | ------------------------ |
| ID         | 通知ID                   |
| Tittle     | 通知标题（可能含占位符） |
| NoticeDate | 通知时间                 |

---

## 十六、产品选择页（pages/product/index.vue）

### 16.1 页面路由

```
/im-message/pages/product/index?key={会话key}&name={对方名称}&logo={对方头像}
```

### 16.2 三个 Tab

| Tab      | 目录接口                                                 | 产品接口                                                              | 说明           |
| -------- | -------------------------------------------------------- | --------------------------------------------------------------------- | -------------- |
| 企业产品 | `getCompanyProductDirList({ dirId:0, layer:0, compId })` | `getCompanyProductList({ q, sort:1, compId, dirId, page, pageSize })` | 当前企业的产品 |
| 我的收藏 | `getCollectProductDirList({ dirId:0 })`                  | `getCollectProductList({ q, dirId, page, pageSize })`                 | 收藏的产品     |
| 我的足迹 | 无目录                                                   | `getBrowseProductList({ page, pageSize })`                            | 浏览过的产品   |

### 16.3 功能

- 左侧目录侧栏，右侧产品网格
- 搜索产品名称
- 多选产品（点击切换选中/取消）
- 底部显示已选产品缩略图和数量
- 批量发送：遍历选中产品，逐个发送 `<m_link>` 消息

### 16.4 发送产品消息格式

```js
'<m_link,' +
  encodeURIComponent(
    'https://big-engineer.global-dsc.cn/product-detail/?id=' +
      ProdID +
      '&version=1',
  ) +
  ',' +
  encodeURIComponent(产品名称 + '-' + 企业名称 + '-大工程师') +
  ',' +
  encodeURIComponent(产品图片URL) +
  ',' +
  '>';
```

---

## 十七、接口清单

### 17.1 IM 相关接口

| 接口                        | 方法 | 域名      | 参数                                                 | 用途                   |
| --------------------------- | ---- | --------- | ---------------------------------------------------- | ---------------------- |
| `/im/generateToken`         | GET  | api80     | 无                                                   | 获取网易云信登录 token |
| `/im/GetChatList`           | GET  | profitapi | 无                                                   | 获取会话列表           |
| `/im/GetRecordList`         | GET  | api60     | `{ categoryId, dataId, msgId, pageSize }`            | 获取聊天记录           |
| `/im/SaveRecordByClient`    | POST | api60     | `{ RecvDataID, SessionCategoryID, MsgText, Domain }` | 发送消息存档           |
| `/im/StartChat`             | POST | api60     | `{ chatCategoryId, chatDataId }`                     | 新会话同步到服务端     |
| `/im/ResetChat`             | POST | api60     | `{ chatId, sendUserId? }`                            | 清空会话未读数         |
| `/im/GroupUserList`         | GET  | profitapi | `{ groupId }`                                        | 获取群成员列表         |
| `/im/group/GroupNoticeList` | GET  | api60     | `{ noticeId, pageSize }`                             | 获取团队通知列表       |
| `/im/getIsUserBlock`        | GET  | profitapi | `{ blockUserId }`                                    | 黑名单检查             |
| `/data/{categoryId}/info`   | GET  | api60     | `{ DataId }`                                         | 获取用户或群组概要信息 |

### 17.2 OBS 上传相关接口

| 接口                   | 方法 | 域名      | 参数                                          | 用途                       |
| ---------------------- | ---- | --------- | --------------------------------------------- | -------------------------- |
| `/obs/putUrlSignature` | POST | profitapi | `{ category, key, priv }` + `{ ContentType }` | 获取 OBS 上传签名凭证      |
| `/data/110/savelife`   | POST | api60     | `{ Datas: [{ Data: {...} }] }`                | 保存文件元数据到资料库     |
| `/data/110/fileinfo`   | GET  | api60     | `{ dataId }`                                  | 获取文档文件信息（下载用） |

### 17.3 产品相关接口

| 接口                        | 方法 | 域名  | 参数                                         | 用途             |
| --------------------------- | ---- | ----- | -------------------------------------------- | ---------------- |
| `/prod/GetSList`            | GET  | api60 | `{ q, sort, compId, dirId, page, pageSize }` | 获取企业产品列表 |
| `/site/comp/proddir/list`   | GET  | api60 | `{ dirId, layer, compId }`                   | 获取企业产品目录 |
| `/dir/2205/list`            | GET  | api60 | `{ dirId }`                                  | 获取收藏产品目录 |
| `/favorite/prod/list`       | GET  | api60 | `{ q, dirId, page, pageSize }`               | 获取收藏产品列表 |
| `/logs/ViewProdLogsForUser` | GET  | api60 | `{ page, pageSize }`                         | 获取产品浏览足迹 |

### 17.4 域名配置

| key       | 域名                              | 用途                                   |
| --------- | --------------------------------- | -------------------------------------- |
| api60     | `https://api60.global-dsc.cn`     | 通用业务接口（聊天记录、会话、产品等） |
| api80     | `https://api80.global-dsc.cn`     | IM token 接口                          |
| accapi    | `https://accapi.global-dsc.cn`    | 账号相关接口                           |
| profitapi | `https://profitapi.global-dsc.cn` | 会话列表、群成员、OBS 上传等           |

### 17.5 请求封装特点（api/request.js）

- 基于 `uni.request`，兼容小程序/App/H5 环境
- `getUni()` 函数兼容获取 uni 对象（冷启动时可能未定义）
- 自动注入 `Authorization: Bearer {token}` 请求头
- 非 JSON 响应（如纯文本 token）直接 resolve，不走业务 code 校验
- 401/403 自动清除登录态并提示
- `State` 字段特殊处理：0 表示失败并提示，1 表示成功
- 超时时间 150 秒

---

## 十八、工具函数（services/util.js）

| 函数                    | 参数                                 | 返回值      | 说明                                             |
| ----------------------- | ------------------------------------ | ----------- | ------------------------------------------------ |
| `guid()`                | 无                                   | string      | 生成 UUID v4 格式字符串，用作消息 Domain         |
| `dateFormat(time, fmt)` | time: 时间戳或 Date，fmt: 格式字符串 | string      | 格式化时间，默认 `yyyy-MM-dd HH:mm:ss`           |
| `decodeHtml(text)`      | text: 文本                           | string      | 解码 HTML 实体（`&lt;`→`<` 等）                  |
| `getUser()`             | 无                                   | object/null | 从 `uni.getStorageSync('userInfo')` 获取当前用户 |
| `getCurrentRoute()`     | 无                                   | string      | 获取当前页面路由路径（不带参数）                 |

---

## 十九、图片工具（libs/image.js）

### `formatProductImage(value, size)`

把产品图片相对路径格式化为完整 CDN URL：

| 路径特征                                            | 拼接结果                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `https://` 开头                                     | 直接返回原 URL                                                             |
| 路径含 `prod/series/logo/mx/yb/sw/wx/images` 关键词 | `https://img2cdn.global-dsc.cn/{path}`                                     |
| `mx` 或 `logo` 类型且无尺寸后缀                     | `https://img2cdn.global-dsc.cn/{path}_{size}x{size}.jpg`                   |
| 其他（hash 路径）                                   | `https://prodimg.global-dsc.cn/{path}?x-oss-process=image/resize,w_{size}` |

默认 size = 165。

---

## 二十、实时刷新数据机制总结

### 20.1 消息实时刷新

```
对方发消息
  → 网易云信服务端通过 WebSocket 长连接推下来
  → im.js: onReceiveMessages 事件触发
  → 拍平成统一格式，过滤登录前的旧消息
  → message.js: handleReceive 处理
    → 协议解析（已读回执/撤回/普通消息）
    → Domain 去重
    → 分两路分发：
        a. 聊天页订阅者：正在聊天 → 直接上屏 + 滚到底部
        b. recent.js: 会话置顶、未读+1、更新最后一条 → 列表页实时刷新
```

### 20.2 会话列表实时刷新

```
新消息进入 recent.js 的 new_message()
  → 会话置顶（移到列表最前面）
  → 更新 LastSendText / LastSendTime
  → 非当前聊天会话：UnReadCount +1
  → notify() 通知所有订阅者
  → 会话列表页 onRecentChange 回调触发
  → 页面整体替换 chatList 重新渲染
```

### 20.3 已读状态实时刷新

```
进入聊天页
  → RecentService.read(key)
  → 给对方发 <m_read,会话key>
  → 对方收到后：message.js 识别为已读回执
  → 通知聊天页：把自己发的所有消息 IsRead = 1
  → 聊天页"未读"变"已读"
```

### 20.4 撤回实时刷新

```
撤回方：
  → 发送 <m_revoke,原消息domain>
  → 本地替换为撤回提示

被撤回方：
  → 收到 <m_revoke,domain>
  → message.js 识别为撤回事件
  → 通知聊天页：按 domain 找到原消息 → 替换为"xx撤回了一条消息"
  → 通知 recent.js：如果撤回的是最后一条，更新列表预览
```

### 20.5 断线重连补偿

```
网络断开
  → im.js: SetState(DisConnect) → 5秒后指数退避重连
  → 重连成功：SetState(Connected)
  → recent.js 监听到状态变化
  → 重新拉取 /im/GetChatList 补偿漏收的消息
  → 聊天页 onShow 时也会增量拉取最新消息
```

### 20.6 多端同步

```
用户在 PC 端发消息
  → 网易云信推给所有端（包括小程序）
  → 小程序收到后：sender = 自己
  → message.js: 会话对象换成接收者
  → Domain 去重（防止多端重复）
  → 聊天页和会话列表都更新
```

---

## 二十一、完整时序图

### 发一条文本消息

```
用户点发送
  → 本地气泡先上屏（State: -1 发送中）
  → IMService.send(to, msgText, domain, isGroup)
    → IM SDK sendMessage（对方客户端秒收）
  → saveRecordByClient({ RecvDataID, SessionCategoryID, MsgText, Domain })
    → 存数据库（供历史记录/会话列表使用）
  → 都成功：State = 1
  → 任一失败：State = 0，提示"发送失败"
  → RecentService.new_message() 同步会话列表
```

### 发一条图片消息

```
用户选图片
  → 本地气泡先上屏（显示本地临时图片，State: -1）
  → 获取图片 ContentType
  → 获取文件 MD5 作为 OBS key
  → POST /obs/putUrlSignature 获取上传凭证
  → HMAC-SHA1 签名 + uni.uploadFile 上传到 OBS
  → 拼接图片公开 URL
  → IMService.send(to, '<m_img,url:URL>', domain)
  → saveRecordByClient 存档
  → 更新本地消息：MsgText 替换为线上 URL，State = 1
  → RecentService.new_message() 同步会话列表
```

### 收一条消息

```
对方（任意端）发出消息
  → 网易云信服务端通过长连接推下来
  → im.js: onReceiveMessages → 拍平成统一格式
  → message.js: handleReceive
    → 协议解析（撤回？已读？普通？）
    → Domain 去重
    → 分两路：
        聊天页订阅者：正在聊天 → 解析展示字段 → push 到列表 → 滚到底部
        recent.js：会话置顶、未读+1、更新最后一条 → 列表页实时刷新
    → 单聊收到对方消息时自动回发已读回执
```

---

## 二十二、踩过的坑清单

1. **token 结构**：`generateToken` 返回 `{code:0, data:{token}}`，
   直接取 `data` 会得到对象 → `invalid token`。必须取 `data.token`。
   `extractToken()` 做了递归提取兼容多种结构。

2. **重连风暴**：登录失败不能立即重试。修复前一分钟刷几百次请求；
   修复后指数退避（5s→10s→20s→…→2min 封顶）。

3. **消息重复**：多端登录每个端都推一遍，发送方也会收到自己发的。
   必须靠 Domain 去重，每个会话缓存最近 100 个 domain。

4. **SDK 版本**：不同平台要用不同构建产物（MINIAPP/UNIAPP/BROWSER），
   用条件编译引入，直接引浏览器版在小程序里会报错（依赖 window）。

5. **撤回/已读是消息协议不是接口**：靠 `<m_revoke>` `<m_read>` 自定义消息传递，
   两端客户端各自解析。

6. **小程序包体积**：`NIM_MINIAPP_SDK.js` 约 1MB，主包超 2MB 限制的话
   需要把 im-message 相关页面放进分包。

---

## 二十三、迁移到其他 uniapp 项目

```
1. 整个 im-message/ 目录复制过去
2. npm i nim-web-sdk-ng
3. 确认项目本地缓存的用户信息键是 'userInfo' 且含 UserID 字段
   （不是的话改 services/util.js 的 getUser）
4. 确认 api/config.js 里有 api80 / api60 / profitapi 三个域名配置
5. 会话列表页参考 pages/message/index.vue 订阅 RecentService 即可
6. AppKey 写死在 services/im.js 顶部 NIM_APP_KEY，换项目注意改
```

---

## 二十四、已知未实现的功能

- 群聊收到陌生成员消息时，发送者头像/昵称用兜底图（big 里是 `SetUserInfo` 实时拉取）
- 断线期间的单条消息补偿（目前靠重连后整体拉会话列表补偿）
- 消息免打扰、会话置顶、删除会话
- 视频消息发送（`<m_video>` 标签已定义但发送功能未实现）
- 分享数据消息发送（`<m_data>` 标签已定义但发送功能未实现）
