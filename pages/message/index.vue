<template>
  <view class="msg-page">
    <loading-overlay :visible="loading" text="加载中..." />

    <!-- 自定义导航栏：标题 + 描述，避开右上角胶囊 -->
    <view class="msg-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="msg-navbar-inner" :style="{ marginRight: menuRight + 'px' }">
        <text class="msg-navbar-title">迅连消息</text>
        <text class="msg-navbar-desc">信息传递更人性，文件发送更安全</text>
      </view>
    </view>

    <!-- 顶部状态栏 -->
    <view class="msg-topbar">
      <view class="topbar-search-wrap">
        <text class="topbar-search-icon">🔍</text>
        <input class="topbar-search-input" v-model="searchKeyword" placeholder="搜索工程师名字 或 群名" @input="onSearchInput" confirm-type="search" />
        <text v-if="searchKeyword" class="topbar-search-clear" @tap="clearSearch">✕</text>
      </view>
      <view class="topbar-add-btn" @tap="toggleAddMenu">
        <text class="topbar-add-icon">+</text>
      </view>

      <!-- 加号下拉菜单 -->
      <view v-if="addMenuVisible" class="add-menu-mask" @tap="addMenuVisible = false">
        <view class="add-menu" @tap.stop="">
          <view class="add-menu-item" @tap="onAddMenuSearch">
            <text class="add-menu-icon">🔍</text>
            <text class="add-menu-text">找好友 / 群</text>
          </view>
          <view class="add-menu-item" @tap="onAddMenuOrgMember">
            <text class="add-menu-icon">🧑‍💻</text>
            <text class="add-menu-text">加组织成员</text>
          </view>
          <view class="add-menu-item" @tap="onAddMenuCreateGroup">
            <text class="add-menu-icon">👫</text>
            <text class="add-menu-text">创建群聊</text>
          </view>
        </view>
      </view>
    </view>


    <!-- 消息列表 -->
    <scroll-view class="msg-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <!-- 消息列表 -->
      <view v-if="filteredList.length" class="msg-list">
        <view
          class="msg-item"
          v-for="item in filteredList"
          :key="item.SessionCategoryID + '-' + item.SessionDataID"
          hover-class="msg-item-hover"
          :hover-stay-time="80"
          @tap="goDetail(item)"
          @longpress="onItemLongPress(item)"
        >
          <!-- 头像 -->
          <view class="msg-avatar-box">
            <image
              v-if="item.SessionCategoryID == 52"
              class="msg-avatar"
              src="https://prodimg.global-dsc.cn/24/3c15e1/a543d0/c6cedf/cdac30/8568ba"
              mode="aspectFill"
            />
            <image
              v-else-if="item.SessionCategoryID == 54"
              class="msg-avatar"
              src="https://img2cdn.global-dsc.cn/dgzz_img/2c4a54497e379b23b5f29fc400f03a5a.jpg"
              mode="aspectFill"
            />
            <image
              v-else
              class="msg-avatar"
              :src="getAvatarSrc(item)"
              mode="aspectFill"
              @error="onAvatarError(item)"
            />
            <!-- 未读角标 -->
            <view v-if="item.UnReadCount > 0" class="msg-badge">
              <text class="msg-badge-text">{{ item.UnReadCount > 99 ? '99+' : item.UnReadCount }}</text>
            </view>
          </view>

          <!-- 消息内容 -->
          <view class="msg-content">
            <view class="msg-row-top">
              <view class="msg-name-wrap">
                <text v-if="item.SessionCategoryID == 52" class="msg-group-tag">群聊</text>
                <text v-if="item.SessionCategoryID == 54" class="msg-notice-tag">通知</text>
                <text class="msg-name">{{ item.SessionName }} <text style="color: #3165ff; font-size: 26rpx;">{{ item.CompanyBrand }}</text></text>
              </view>
              <text class="msg-time">{{ formatTime(item.LastSendTime) }}</text>
            </view>
            <view v-if="parseMsgText(item.LastSendText)" class="msg-row-bottom">
              <text v-if="isInquiryMsg(item.LastSendText)" class="msg-preview"><text class="msg-preview-inquiry">【您有新的询价单待查看】</text>{{ parseMsgText(item.LastSendText).slice(12) }}</text>
              <text v-else-if="isQuoteMsg(item.LastSendText)" class="msg-preview"><text class="msg-preview-inquiry">【您有新的报价单待查看】</text>{{ parseMsgText(item.LastSendText).slice(12) }}</text>
              <text v-else class="msg-preview">{{ parseMsgText(item.LastSendText) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading" class="msg-empty">
        <image class="msg-empty-img" src="https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png" mode="aspectFit" />
        <text class="msg-empty-title">{{ searchKeyword ? '未找到相关会话' : '暂无消息' }}</text>
        <text class="msg-empty-hint">{{ searchKeyword ? '' : '快去联系感兴趣的工程师吧' }}</text>
      </view>
    </scroll-view>

    <!-- 创建群聊弹窗 -->
    <view v-if="groupCreateVisible" class="remark-mask" @tap="onGroupCreateCancel">
      <view class="group-create-dialog" @tap.stop="">
        <!-- 头部 -->
        <view class="group-create-header">
          <text class="group-create-header-title">创建群聊</text>
          <text class="group-create-header-close" @tap="onGroupCreateCancel">✕</text>
        </view>

        <!-- 群名输入 -->
        <view class="group-create-name-wrap" :class="{ 'group-create-name-focus': groupNameFocused }">
          <text class="group-create-name-label">群名称</text>
          <input
            class="group-create-name-input"
            v-model="groupName"
            placeholder="请输入群名称"
            placeholder-class="remark-input-placeholder"
            maxlength="30"
            focus
            @focus="groupNameFocused = true"
            @blur="groupNameFocused = false"
          />
          <text v-if="groupName" class="group-create-name-clear" @tap.stop="groupName = ''">✕</text>
        </view>

        <!-- 成员选择列表 -->
        <view class="group-create-list-header">
          <text class="group-create-list-title">选择群成员</text>
          <text class="group-create-list-count">{{ groupSelectedIds.length }}/{{ groupCandidateList.length }}</text>
        </view>
        <scroll-view class="group-create-scroll" scroll-y>
          <view
            class="group-create-item"
            v-for="item in groupCandidateList"
            :key="item.SessionDataID"
            @tap="onToggleGroupMember(item)"
          >
            <view class="group-create-check" :class="{ 'group-create-checked': groupSelectedIds.includes(item.SessionDataID) }">
              <text v-if="groupSelectedIds.includes(item.SessionDataID)" class="group-create-check-icon">✓</text>
            </view>
            <image
              class="group-create-avatar"
              :src="getAvatarSrc(item)"
              mode="aspectFill"
            />
            <view class="group-create-info">
              <text class="group-create-name">{{ item.SessionName }}</text>
              <text v-if="item.CompanyBrand" class="group-create-company">{{ item.CompanyBrand }}</text>
            </view>
          </view>
          <view v-if="groupCandidateList.length === 0" class="group-create-empty">
            <text class="group-create-empty-text">暂无可选联系人</text>
          </view>
        </scroll-view>

        <!-- 底部按钮 -->
        <view class="group-create-footer">
          <view class="group-create-btn-cancel" @tap="onGroupCreateCancel">取消</view>
          <view class="group-create-btn-ok" :class="{ 'group-create-btn-disabled': !groupName.trim() || groupSelectedIds.length === 0 }" @tap="onGroupCreateConfirm">创建群聊</view>
        </view>
      </view>
    </view>

    <!-- 修改备注弹窗 -->
    <view v-if="remarkVisible" class="remark-mask" @tap="onRemarkCancel">
      <view class="remark-dialog" @tap.stop="">
        <text class="remark-title">修改备注</text>
        <view class="remark-input-wrap" :class="{ 'remark-input-focus': remarkFocused }">
          <input
            class="remark-input"
            v-model="remarkValue"
            placeholder="请输入备注"
            placeholder-class="remark-input-placeholder"
            maxlength="50"
            focus
            @focus="remarkFocused = true"
            @blur="remarkFocused = false"
            @confirm="onRemarkConfirm"
          />
          <text v-if="remarkValue" class="remark-input-clear" @tap.stop="remarkValue = ''">✕</text>
        </view>
        <view class="remark-btns">
          <view class="remark-btn remark-btn-cancel" @tap="onRemarkCancel">取消</view>
          <view class="remark-btn remark-btn-ok" :class="{ 'remark-btn-disabled': !remarkValue.trim() }" @tap="onRemarkConfirm">确定</view>
        </view>
      </view>
    </view>

    <!-- 创建群聊输入群名弹窗 -->
    <view v-if="groupNameInputVisible" class="remark-mask" @tap="onGroupNameInputCancel">
      <view class="remark-dialog" @tap.stop="">
        <text class="remark-title">创建群聊</text>
        <view class="remark-input-wrap" :class="{ 'remark-input-focus': groupNameInputFocused }">
          <input
            class="remark-input"
            v-model="groupNameInputValue"
            placeholder="请输入群名称"
            placeholder-class="remark-input-placeholder"
            maxlength="30"
            focus
            @focus="groupNameInputFocused = true"
            @blur="groupNameInputFocused = false"
            @confirm="onGroupNameInputConfirm"
          />
          <text v-if="groupNameInputValue" class="remark-input-clear" @tap.stop="groupNameInputValue = ''">✕</text>
        </view>
        <view class="remark-btns">
          <view class="remark-btn remark-btn-cancel" @tap="onGroupNameInputCancel">取消</view>
          <view class="remark-btn remark-btn-ok" :class="{ 'remark-btn-disabled': !groupNameInputValue.trim() }" @tap="onGroupNameInputConfirm">创建</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getChatList, getSummary, blockUser, updateAddressBook, createGroup, startChat, removeChat } from '@/im-message/api/index.js'
import { IMService } from '@/im-message/services/im.js'
import { RecentService } from '@/im-message/services/recent.js'
import '@/im-message/services/message.js'  // 引入消息分发层，模块加载即向 IM SDK 注册接收回调，列表页才能实时收到新消息
import { getProductImageUrlChat, formatTime, parseMsgText } from '@/common/utils/index.js'

export default {
  data() {
    return {
      chatList: [], // 会话列表（完整数据）
      filteredList: [], // 搜索过滤后的列表
      searchKeyword: '', // 搜索关键词
      loading: false, // loading-overlay 显示状态
      refreshing: false, // 下拉刷新状态
      avatarErrorMap: {}, // 头像加载失败的 ID 映射
      summaryCache: {}, // 概要信息缓存 'type:id' -> { DataTitle }
      myUserId: '', // 当前用户ID
      remarkVisible: false, // 修改备注弹窗显示状态
      remarkValue: '', // 备注输入内容
      remarkFocused: false, // 备注输入框聚焦状态
      remarkTarget: null, // 当前修改备注的会话项
      groupNameInputVisible: false, // 创建群聊输入群名弹窗显示状态
      groupNameInputValue: '', // 群名输入内容
      groupNameInputFocused: false, // 群名输入框聚焦状态
      groupNameInputTarget: null, // 当前要组建群聊的对方会话项
      addMenuVisible: false, // 加号下拉菜单显示状态
      groupCreateVisible: false, // 创建群聊弹窗显示状态
      groupName: '', // 群名称输入
      groupNameFocused: false, // 群名输入框聚焦状态
      groupSelectedIds: [], // 已选群成员 ID 列表
      groupCreating: false, // 创建中状态（防重复提交）
      statusBarHeight: 20, // 状态栏高度（px），自定义导航栏顶部占位用
      menuRight: 95 // 右上角胶囊左侧预留宽度（px），标题避开胶囊用
    }
  },
  computed: {
    // ----------- 创建群聊候选列表（从会话列表中筛选出单聊会话）
    groupCandidateList() {
      return this.chatList.filter(item => item.SessionCategoryID == 20)
    },
    // ----------- 已选成员预览列表（用于顶部横向展示）
    groupSelectedPreview() {
      return this.groupCandidateList.filter(item => this.groupSelectedIds.includes(item.SessionDataID))
    }
  },
  onLoad() {
    // 自定义导航栏：算状态栏高度和右上角胶囊位置，标题避开胶囊
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 20  // 状态栏高度
    const screenWidth = sysInfo.windowWidth || sysInfo.screenWidth || 375  // 屏幕宽度
    const menuBtn = uni.getMenuButtonBoundingClientRect ? uni.getMenuButtonBoundingClientRect() : null  // 胶囊位置信息
    if (menuBtn) {
      this.menuRight = screenWidth - menuBtn.left + 8  // 胶囊左边缘到屏幕右边的距离 + 间距
    }
    const userInfo = uni.getStorageSync('userInfo') || {}
    this.myUserId = String(userInfo.UserID || '')
    // 登录 IM 并订阅会话列表变化（新消息置顶、未读数实时更新，失败有重连机制）
    IMService.login().catch(() => {})
    this._recentHandler = (list) => this.onRecentChange(list)  // 会话列表变化回调引用，取消订阅时用
    RecentService.subscribe(this._recentHandler)
    // 进入页面调一次接口校准 tab 未读角标（实时累加仍走本地 UnReadCount，这里只做初始化校准）
    RecentService.refreshBadge()
    this.getChatList()
  },
  onUnload() {
    // 取消会话列表订阅
    RecentService.unsubscribe(this._recentHandler)
  },
  onShow() {
    // 从聊天页/通知页返回时，重新同步会话列表和 tab 角标（后台页面的 setData 可能没生效）
    // 列表为空说明还没初始化过，跳过避免和 onLoad 的 getChatList 重复
    if (this.chatList.length) {
      RecentService.notify_change()
    }
    // 从聊天页返回时已读清零，调接口校准一次角标（实时累加走本地，这里只校准）
    RecentService.refreshBadge()
    // 华为等安卓机型后台会冻结/杀进程导致 WebSocket 断开，回到前台时主动检查并立即重连
    // 不等 SDK 内部的延迟重连，让老板这种场景能更快收到消息
    if (IMService.state !== 1) {
      console.log('[页面] onShow 检测到 IM 未连接，状态:', IMService.state, '主动触发重连')
      IMService.login(true).catch(() => {})
      // 不等 SDK 重连，先用 HTTP 接口主动拉一次最新会话列表（HTTP 不依赖 WebSocket，能立刻拿到服务端最新未读数）
      // 这样老板回到前台第一秒就能看到未读数，不用等 SDK 重连补推消息
      this.getChatList(true)
    }
  },
  methods: {
    // ----------- 获取会话列表
    async getChatList(silent = false) {
      if (!silent) this.loading = true
      try {
        await RecentService.init(true)
        // 过滤掉 LastSendText 为空的会话
        // this.chatList = RecentService.getList().filter(item => item.LastSendText)
        this.chatList = RecentService.getList()
        // 翻译团队通知的占位符
        this.translateNoticeList()
        // 更新过滤列表
        this.updateFilteredList()
      } finally {
        if (!silent) this.loading = false
      }
    },

    // ----------- 会话列表实时变化（新消息置顶、未读数更新）
    onRecentChange(list) {
      console.log('[页面] 会话列表变化，收到', list.length, '条')
      // 浅拷贝新数组，避免 Vue 检测到同一引用跳过更新（RecentList 是被 splice/unshift 原地修改的）
      this.chatList = [...list]
      // 翻译团队通知的占位符
      this.translateNoticeList()
      // 更新过滤列表
      this.updateFilteredList()
    },

    // ----------- 下拉刷新
    async onRefresh() {
      this.refreshing = true
      try {
        await RecentService.init(true)
        // 过滤掉 LastSendText 为空的会话
        this.chatList = RecentService.getList()
        // 翻译团队通知的占位符
        this.translateNoticeList()
        // 更新过滤列表
        this.updateFilteredList()
      } finally {
        this.refreshing = false
      }
    },

    // ----------- 搜索输入实时过滤
    onSearchInput() {
      this.updateFilteredList()
    },

    // ----------- 清空搜索
    clearSearch() {
      this.searchKeyword = ''
      this.updateFilteredList()
    },

    // ----------- 根据关键词过滤会话列表
    updateFilteredList() {
      const kw = this.searchKeyword.trim().toLowerCase()  // 搜索关键词转小写
      if (!kw) {
        // 浅拷贝成新数组，避免和 chatList 同引用时小程序 setData 的 diff 检测不到变化
        this.filteredList = [...this.chatList]
        return
      }
      this.filteredList = this.chatList.filter(item => {
        const name = (item.SessionName || '').toLowerCase()  // 会话名称
        const text = (item.LastSendText || '').toLowerCase()  // 最后消息
        const brand = (item.CompanyBrand || '').toLowerCase()  // 企业品牌
        return name.indexOf(kw) > -1 || text.indexOf(kw) > -1 || brand.indexOf(kw) > -1
      })
    },

    // ----------- 翻译团队通知列表中的占位符
    async translateNoticeList() {
      const noticeItems = this.chatList.filter(item => item.SessionCategoryID == 54)
      for (const item of noticeItems) {
        const translated = await this.translateNoticeText(item.LastSendText)
        item.LastSendText = translated
      }
    },

    // ----------- 翻译单条文本中的 {U:xxx} {G:xxx} 为用户名/群名
    async translateNoticeText(text) {
      if (!text) return text
      const regexp = /\{(U|G):(\d+)\}/gi
      const matches = text.match(regexp)
      if (!matches || !matches.length) return text
      // 收集需要查询的唯一 key
      const keys = [...new Set(matches.map(m => {
        const [, type, id] = m.match(/\{(U|G):(\d+)\}/i)
        return `${type}:${id}`
      }))]
      // 查询所有未缓存的概要信息
      const summaries = {}
      await Promise.all(keys.map(async (key) => {
        if (this.summaryCache[key]) {
          summaries[key] = this.summaryCache[key]
          return
        }
        const [type, id] = key.split(':')
        const categoryId = type === 'U' ? 20 : 52
        try {
          const res = await getSummary(categoryId, id)
          const info = res.Data || res
          const title = info.ViewName || info.UserName || info.IMGroupName || info.DataTitle || id
          this.summaryCache[key] = { DataTitle: title }
          summaries[key] = this.summaryCache[key]
        } catch (e) {
          summaries[key] = { DataTitle: id }
        }
      }))
      // 替换占位符
      let translated = text
      matches.forEach(m => {
        const [, type, id] = m.match(/\{(U|G):(\d+)\}/i)
        const key = `${type}:${id}`
        const summary = summaries[key] || { DataTitle: id }
        const display = type === 'U' && id === this.myUserId ? '您' : summary.DataTitle
        translated = translated.replace(m, display)
      })
      return translated
    },

    // ----------- 长按消息项，弹出操作菜单（通知54不支持）
    onItemLongPress(item) {
      // 通知(54)不支持任何操作
      if (item.SessionCategoryID == 54) return
      const isGroup = item.SessionCategoryID == 52  // 是否群聊
      // 群聊只有删除；单聊有修改备注、创建群聊、拉黑、删除
      const itemList = isGroup ? ['删除该聊天'] : ['修改备注', '创建群聊', '拉黑该用户', '删除该聊天']
      uni.showActionSheet({
        itemList,
        success: (res) => {
          if (isGroup) {
            // 群聊只有一项
            this.confirmDeleteChat(item)
            return
          }
          if (res.tapIndex === 0) {
            this.onEditRemark(item)
          } else if (res.tapIndex === 1) {
            this.confirmCreateGroupWith(item)
          } else if (res.tapIndex === 2) {
            this.confirmBlock(item)
          } else if (res.tapIndex === 3) {
            this.confirmDeleteChat(item)
          }
        }
      })
    },

    // ----------- 组建群聊：打开输入群名弹窗
    confirmCreateGroupWith(item) {
      this.groupNameInputTarget = item  // 记录对方会话项
      this.groupNameInputValue = ''  // 输入框留空，不预填
      this.groupNameInputVisible = true
    },

    // ----------- 取消输入群名
    onGroupNameInputCancel() {
      this.groupNameInputVisible = false
      this.groupNameInputTarget = null
      this.groupNameInputValue = ''
    },

    // ----------- 确认输入群名后直接创建
    onGroupNameInputConfirm() {
      const name = this.groupNameInputValue.trim()  // 去空格的群名
      if (!name) return  // 空群名不允许创建
      const item = this.groupNameInputTarget
      this.onGroupNameInputCancel()
      this.doCreateGroupWith(item, name)
    },

    // ----------- 和指定用户组建群聊
    async doCreateGroupWith(item, name) {
      if (this.groupCreating) return
      const userId = String(item.SessionDataID || '')  // 对方用户ID
      if (!userId) {
        uni.showToast({ title: '用户信息异常', icon: 'none' })
        return
      }
      this.groupCreating = true
      uni.showLoading({ title: '创建中...' })
      try {
        const teamId = await this.doCreateGroup(name, [userId])
        uni.showToast({ title: '创建成功', icon: 'success' })
        // 刷新会话列表
        this.getChatList(true)
        // 跳转到群聊详情页
        setTimeout(() => {
          uni.navigateTo({
            url: `/im-message/pages/chat/detail?key=${encodeURIComponent('52:' + teamId)}&name=${encodeURIComponent(name)}&logo=`
          })
        }, 500)
      } catch (err) {
        console.error('[创建群聊] 失败:', err)
        uni.showToast({ title: err.message || '创建失败', icon: 'none' })
      } finally {
        this.groupCreating = false
        uni.hideLoading()
      }
    },

    // ----------- 打开修改备注弹窗
    onEditRemark(item) {
      this.remarkTarget = item  // 记录当前操作的会话
      this.remarkValue = item.SessionName || ''  // 回显当前名称
      this.remarkVisible = true
    },

    // ----------- 取消修改备注
    onRemarkCancel() {
      this.remarkVisible = false
      this.remarkTarget = null
      this.remarkValue = ''
    },

    // ----------- 确认修改备注
    onRemarkConfirm() {
      const remark = this.remarkValue.trim()  // 去空格的备注内容
      if (!remark) return  // 空备注不允许保存
      const item = this.remarkTarget
      this.onRemarkCancel()
      this.doSaveRemark(item, remark)
    },

    // ----------- 调用修改备注接口
    async doSaveRemark(item, remark) {
      const addressId = String(item.SessionDataID || '')  // 对方用户ID
      if (!addressId) {
        uni.showToast({ title: '用户信息异常', icon: 'none' })
        return
      }
      try {
        await updateAddressBook({ addressId }, { UserRemark: remark })
        // 前端同步更新会话名称显示
        const target = this.chatList.find(it => it.ID === item.ID)
        if (target) target.SessionName = remark
        this.updateFilteredList()
        uni.showToast({ title: '已修改', icon: 'success' })
      } catch (e) {
        console.error('修改备注失败:', e)
        uni.showToast({ title: '修改失败', icon: 'none' })
      }
    },

    // ----------- 拉黑二次确认弹窗
    confirmBlock(item) {
      const name = item.SessionName || '该用户'  // 用户昵称
      uni.showModal({
        title: '确认拉黑',
        content: `拉黑后，${name}将无法给你发送消息，确定要拉黑吗？`,
        confirmText: '拉黑',
        confirmColor: '#fa5151',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.doBlock(item)
          }
        }
      })
    },

    // ----------- 调用拉黑接口
    async doBlock(item) {
      const blockUserId = String(item.SessionDataID || '')  // 被拉黑用户ID
      if (!blockUserId) {
        uni.showToast({ title: '用户信息异常', icon: 'none' })
        return
      }
      try {
        await blockUser({ blockUserId, status: 1 })
        // 前端直接从列表移除这条会话
        this.chatList = this.chatList.filter(it => it.ID !== item.ID)
        this.updateFilteredList()
        uni.showToast({ title: '已拉黑', icon: 'success' })
      } catch (e) {
        console.error('拉黑失败:', e)
        uni.showToast({ title: '拉黑失败', icon: 'none' })
      }
    },

    // ----------- 删除聊天二次确认弹窗
    confirmDeleteChat(item) {
      const name = item.SessionName || '该聊天'  // 会话名称
      uni.showModal({
        title: '删除聊天',
        content: `确定要删除与「${name}」的聊天吗？（不会删除聊天记录）`,
        confirmText: '删除',
        confirmColor: '#fa5151',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.doDeleteChat(item)
          }
        }
      })
    },

    // ----------- 调用删除会话接口
    async doDeleteChat(item) {
      const chatId = item.ID  // 服务端会话ID
      if (!chatId) {
        uni.showToast({ title: '会话信息异常', icon: 'none' })
        return
      }
      try {
        await removeChat({ chatId })
        // 前端直接从列表移除这条会话
        this.chatList = this.chatList.filter(it => it.ID !== item.ID)
        this.updateFilteredList()
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        console.error('删除聊天失败:', e)
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },

    // ----------- 点击消息项跳转聊天详情
    goDetail(record) {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.navigateTo({ url: '/pages/common/login/index' })
        return
      }

      // 团队通知跳转到通知页面
      if (record.SessionCategoryID == 54) {
        uni.navigateTo({ url: '/im-message/pages/notice/index' })
        return
      }

      // 拼接会话标识 "CategoryId:DataId"
      const key = `${record.SessionCategoryID}:${record.SessionDataID}`
      const name = encodeURIComponent(record.SessionName || '')
      const logo = encodeURIComponent(record.SessionLogo || '')

      uni.navigateTo({
        url: `/im-message/pages/chat/detail?key=${encodeURIComponent(key)}&name=${name}&logo=${logo}`
      })
    },

    // ----------- 获取头像地址，加载失败时兜底默认图
    getAvatarSrc(item) {
      if (this.avatarErrorMap[item.ID]) {
        return 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png'
      }
      return item.SessionLogo ? getProductImageUrlChat(item.SessionLogo) : 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png'
    },

    // ----------- 头像加载失败回调
    onAvatarError(item) {
      this.avatarErrorMap[item.ID] = true
    },

    // ----------- 切换加号下拉菜单
    toggleAddMenu() {
      this.addMenuVisible = !this.addMenuVisible
    },

    // ----------- 加号菜单：查找好友/团队
    onAddMenuSearch() {
      this.addMenuVisible = false
      uni.navigateTo({ url: '/im-message/pages/search/index' })
    },

    // ----------- 加号菜单：创建群聊
    onAddMenuCreateGroup() {
      this.addMenuVisible = false
      this.groupName = ''
      this.groupSelectedIds = []
      this.groupCreateVisible = true
    },

    // ----------- 加号菜单：加组织成员
    onAddMenuOrgMember() {
      this.addMenuVisible = false
      uni.navigateTo({ url: '/im-message/pages/org-list/index' })
    },

    // ----------- 切换群成员选中状态
    onToggleGroupMember(item) {
      const id = item.SessionDataID
      const idx = this.groupSelectedIds.indexOf(id)
      if (idx > -1) {
        this.groupSelectedIds.splice(idx, 1)
      } else {
        this.groupSelectedIds.push(id)
      }
    },

    // ----------- 取消创建群聊
    onGroupCreateCancel() {
      this.groupCreateVisible = false
    },

    // ----------- 执行创建群聊（SDK 建群 + 后端注册 + 同步会话），返回群ID
    async doCreateGroup(name, userIds) {
      // 1. 调网易云信 SDK 创建群组，拿到群 ID
      const teamId = await IMService.createTeam(name, userIds)
      if (!teamId) throw new Error('SDK 创建群组失败')
      // 2. 调后端注册群组
      await createGroup({
        ID: teamId,
        IMGroupName: name,
        GroupUserIds: userIds.map(String)
      })
      // 3. 同步会话到服务端，否则新群聊不会出现在会话列表
      await startChat({ chatCategoryId: 52, chatDataId: String(teamId) })
      return teamId  // 群ID
    },

    // ----------- 确认创建群聊
    async onGroupCreateConfirm() {
      if (this.groupCreating) return
      const name = this.groupName.trim()
      if (!name) {
        uni.showToast({ title: '请输入群名称', icon: 'none' })
        return
      }
      // 没选成员时提示选择群成员，选了成员但没填群名时提示输入群名称
      if (this.groupSelectedIds.length === 0) {
        uni.showToast({ title: '请选择群成员', icon: 'none' })
        return
      }
      this.groupCreating = true
      uni.showLoading({ title: '创建中...' })
      try {
        const teamId = await this.doCreateGroup(name, this.groupSelectedIds)
        uni.showToast({ title: '创建成功', icon: 'success' })
        this.groupCreateVisible = false
        // 刷新会话列表
        this.getChatList(true)
        // 跳转到群聊详情页
        setTimeout(() => {
          uni.navigateTo({
            url: `/im-message/pages/chat/detail?key=${encodeURIComponent('52:' + teamId)}&name=${encodeURIComponent(name)}&logo=`
          })
        }, 500)
      } catch (err) {
        console.error('[创建群聊] 失败:', err)
        uni.showToast({ title: err.message || '创建失败', icon: 'none' })
      } finally {
        this.groupCreating = false
        uni.hideLoading()
      }
    },

    // ----------- 跳转搜索页
    goSearch() {
      uni.navigateTo({ url: '/im-message/pages/search/index' })
    },

    // ----------- 判断消息是否以【您有新的询价单待查看】开头
    isInquiryMsg(text) {
      return String(text || '').indexOf('【您有新的询价单待查看】') === 0
    },

    // ----------- 判断消息是否以【您有新的报价单待查看】开头
    isQuoteMsg(text) {
      return String(text || '').indexOf('【您有新的报价单待查看】') === 0
    },

    getProductImageUrlChat,
    formatTime,
    parseMsgText
  }
}
</script>

<style scoped lang="scss">
.msg-page {
  width: 100%;
  height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

/* 自定义导航栏：标题 + 描述 */
.msg-navbar {
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;

  .msg-navbar-inner {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 12rpx 24rpx 18rpx;
    min-height: 88rpx;
    box-sizing: border-box;
  }

  .msg-navbar-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
  }

  .msg-navbar-desc {
    font-size: 24rpx;
    color: #8c8c8c;
    line-height: 1.2;
    margin-top: 6rpx;
  }
}

/* 顶部状态栏 */
.msg-topbar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
  gap: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.topbar-search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f0f2f5;
  border-radius: 32rpx;
  height: 64rpx;
  padding: 0 24rpx;
}

.topbar-search-icon {
  font-size: 26rpx;
  margin-right: 12rpx;
}

.topbar-search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.topbar-search-clear {
  font-size: 26rpx;
  color: #999;
  padding: 0 8rpx;
}

.topbar-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topbar-add-icon {
  font-size: 64rpx;
  color: #4588fc;
  line-height: 1;
  position: relative;
  top: -2rpx;
  margin-right: 4rpx;
}

.msg-scroll {
  flex: 1;
  overflow: hidden;
}

.msg-list {
  background: #fff;
}

.msg-item {
  display: flex;
  align-items: center;
  padding: 26rpx 32rpx 18rpx 32rpx;
  position: relative;
}
.msg-item::after {
  content: '';
  position: absolute;
  left: 132rpx;
  right: 0;
  bottom: 0;
  height: 1rpx;
  background: #f0f0f0;
  transform: scaleY(0.5);
}
.msg-item-hover {
  background: #f7f7f7;
}

.msg-avatar-box {
  position: relative;
  width: 92rpx;
  height: 92rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}
.msg-avatar {
  width: 92rpx;
  height: 92rpx;
  border-radius: 16rpx;
}
.msg-badge {
  position: absolute;
  top: -14rpx;
  right: -12rpx;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 19rpx;
  background: #fa5151;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.msg-badge-text {
  font-size: 20rpx;
  color: #fff;
  line-height: 1;
}

.msg-content {
  flex: 1;
  min-width: 0;
  min-height: 92rpx; // 与头像同高，没有消息时名字也能和有消息的会话对齐
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.msg-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.msg-name-wrap {
  display: flex;
  align-items: center;
  overflow: hidden;
}
.msg-name {
  font-size: 32rpx;
  color: #000;
  max-width: 380rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.msg-group-tag {
  font-size: 22rpx;
  color: #fff;
  background: #fa9d3b;
  border-radius: 8rpx;
  padding: 6rpx 10rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
  line-height: 1.2;
}
.msg-notice-tag {
  font-size: 22rpx;
  color: #fff;
  background: #4cbc84;
  border-radius: 8rpx;
  padding: 6rpx 10rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
  line-height: 1.2;
}
.msg-time {
  font-size: 24rpx;
  color: #a0a0a0;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.msg-row-bottom {
  display: flex;
  align-items: center;
}
.msg-preview {
  flex: 1;
  font-size: 28rpx;
  color: #8c8c8c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 12rpx;

  /* 询价单消息开头高亮：仅【您有新的询价单待查看】这几个字红色 */
  .msg-preview-inquiry {
    color: red;
  }
}

.msg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 240rpx;
}
.msg-empty-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-bottom: 24rpx;
  opacity: 0.6;
}
.msg-empty-title {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 8rpx;
}
.msg-empty-hint {
  font-size: 24rpx;
  color: #ccc;
}

/* 修改备注弹窗 */
.remark-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  justify-content: center;
  animation: remarkFadeIn 0.2s ease;
}

.remark-dialog {
  width: 600rpx;
  margin-top: 400rpx;
  height: fit-content;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 40rpx 32rpx;
  box-sizing: border-box;
  animation: remarkZoomIn 0.22s ease;
}

@keyframes remarkFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes remarkZoomIn {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.remark-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 32rpx;
}

.remark-input-wrap {
  display: flex;
  align-items: center;
  height: 84rpx;
  background: #f5f6f8;
  border-radius: 16rpx;
  padding: 0 24rpx;
  border: 2rpx solid transparent;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease;

  &.remark-input-focus {
    border-color: #4588fc;
    background: #fff;
  }
}

.remark-input {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  color: #1a1a1a;
}

.remark-input-placeholder {
  color: #b0b4ba;
  font-size: 30rpx;
}

.remark-input-clear {
  font-size: 24rpx;
  color: #c0c4cc;
  padding: 8rpx 0 8rpx 16rpx;
  flex-shrink: 0;
}

.remark-btns {
  display: flex;
  gap: 46rpx;
  margin-top: 36rpx;
}

.remark-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  transition: opacity 0.15s ease;

  &:active {
    opacity: 0.75;
  }
}

.remark-btn-cancel {
  background: #f5f6f8;
  color: #666;
}

.remark-btn-ok {
  background: #4588fc;
  color: #fff;

  &.remark-btn-disabled {
    background: #b9d0f7;
  }
}

/* 加号下拉菜单 */
.add-menu-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
}

.add-menu {
  position: absolute;
  top: 280rpx;
  right: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: addMenuIn 0.18s ease;
}

@keyframes addMenuIn {
  from { opacity: 0; transform: translateY(-10rpx) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.add-menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx 22rpx;

  &:active {
    background: #f5f6f8;
  }
}


.add-menu-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.add-menu-text {
  font-size: 28rpx;
  color: #333;
}

/* 创建群聊弹窗 */
.group-create-dialog {
  width: 640rpx;
  margin-top: 200rpx;
  max-height: 82vh;
  background: #fff;
  border-radius: 24rpx;
  box-sizing: border-box;
  animation: remarkZoomIn 0.22s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.group-create-header {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx 22rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.group-create-header-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #d2e3ff, #c5ddff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.group-create-header-emoji {
  font-size: 30rpx;
  line-height: 1;
}

.group-create-header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
}

.group-create-header-close {
  font-size: 32rpx;
  color: #bbb;
  padding: 8rpx;
  line-height: 1;

  &:active {
    color: #999;
  }
}

/* 群名输入 */
.group-create-name-wrap {
  display: flex;
  align-items: center;
  margin: 22rpx 30rpx 0;
  height: 80rpx;
  background: #f5f6f8;
  border-radius: 16rpx;
  padding: 0 22rpx;
  border: 2rpx solid transparent;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.group-create-name-focus {
  border-color: #4588fc;
  background: #fff;
}

.group-create-name-label {
  font-size: 28rpx;
  color: #888;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.group-create-name-input {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #1a1a1a;
}

.group-create-name-clear {
  font-size: 24rpx;
  color: #c0c4cc;
  padding: 8rpx 0 8rpx 16rpx;
  flex-shrink: 0;
}

/* 成员列表标题 */
.group-create-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx 10rpx;
  margin-top: 20rpx;
}

.group-create-list-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.group-create-list-count {
  font-size: 26rpx;
  color: #4588fc;
  font-weight: 600;
}

/* 成员列表 */
.group-create-scroll {
  flex: 1;
  overflow: hidden;
  padding: 0 30rpx;
}

.group-create-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:active {
    background: #fafafa;
  }
}

.group-create-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d0d4dc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  margin-left: 6rpx;
  flex-shrink: 0;
  transition: all 0.18s ease;
}

.group-create-checked {
  background: #4588fc;
  border-color: #4588fc;
  transform: scale(1.08);
}

.group-create-check-icon {
  font-size: 22rpx;
  color: #fff;
  line-height: 1;
}

.group-create-avatar {
  width: 68rpx;
  height: 68rpx;
  border-radius: 14rpx;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.group-create-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.group-create-name {
  font-size: 29rpx;
  color: #222;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.group-create-company {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 空状态 */
.group-create-empty {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-create-empty-text {
  font-size: 26rpx;
  color: #ccc;
}

/* 底部按钮 */
.group-create-footer {
  display: flex;
  gap: 20rpx;
  padding: 22rpx 30rpx 28rpx;
  border-top: 1rpx solid #f0f0f0;
}

.group-create-btn-cancel {
  flex: 1;
  height: 78rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  background: #f5f6f8;
  color: #666;

  &:active {
    opacity: 0.75;
  }
}

.group-create-btn-ok {
  flex: 1.5;
  height: 78rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  background: linear-gradient(135deg, #4588fc, #66a6ff);
  color: #fff;
  transition: opacity 0.15s ease;

  &:active {
    opacity: 0.85;
  }
}

.group-create-btn-disabled {
  background: #d3e0f5;
  color: #fff;
}
</style>