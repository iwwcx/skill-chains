<template>
  <view class="notice-page">
    <scroll-view class="notice-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
      <!-- 骨架屏：首次加载时展示，接口返回后再延迟1秒消失，避免内容突然弹出 -->
      <view v-if="skeletonVisible" class="skeleton-wrap">
        <view class="skeleton-group" v-for="g in 6" :key="g">
          <!-- 骨架日期节点：圆点 + 标签胶囊 -->
          <view class="skeleton-date-node">
            <view class="skeleton-date-dot"></view>
            <view class="skeleton-date-label"></view>
          </view>
          <!-- 骨架通知项：时间轴圆点 + 竖线 + 卡片内容 -->
          <view class="skeleton-item" v-for="i in 3" :key="i" :class="{ 'skeleton-item-last': i === 3 }">
            <view class="skeleton-axis">
              <view class="skeleton-node"></view>
              <view v-if="i !== 3" class="skeleton-line"></view>
            </view>
            <view class="skeleton-card">
              <view class="skeleton-row">
                <view class="skeleton-bar skeleton-bar-name"></view>
                <view class="skeleton-bar skeleton-bar-text"></view>
              </view>
              <view class="skeleton-row">
                <view class="skeleton-bar skeleton-bar-text2"></view>
              </view>
              <view class="skeleton-bar skeleton-bar-time"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 通知列表（时间线布局，按日期分组） -->
      <view v-else-if="noticeGroups.length" class="timeline-list">
        <view class="timeline-group" v-for="(group, gIndex) in noticeGroups" :key="group.key">
          <!-- 日期分组标签（时间线上的时间节点） -->
          <view class="timeline-date-node">
            <view class="timeline-date-dot"></view>
            <text class="timeline-date-label">{{ group.label }}</text>
          </view>
          <!-- 分组下的通知项（每条都是时间线上的一个节点） -->
          <view class="timeline-item" v-for="(item, index) in group.list" :key="item.ID" :class="{ 'timeline-item-last': index === group.list.length - 1, 'timeline-item-active': gIndex === noticeGroups.length - 1 && index === group.list.length - 1 }">
            <!-- 左侧时间线轴：圆点 + 竖线 -->
            <view class="timeline-axis">
              <view class="timeline-node"></view>
              <view v-if="!(gIndex === noticeGroups.length - 1 && index === group.list.length - 1)" class="timeline-line"></view>
            </view>
            <!-- 右侧内容卡片 -->
            <view class="timeline-content">
              <view class="timeline-title">
                <text v-for="(part, pIndex) in (item.TranslatedParts || [{ text: item.Tittle }])" :key="pIndex" :class="part.highlight ? 'timeline-name-highlight' : 'timeline-text-normal'">{{ part.text }}</text>
              </view>
              <text class="timeline-time">{{ formatNoticeTime(item.NoticeDate) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="!skeletonVisible && loading" class="notice-loading">
        <text>加载中...</text>
      </view>
      <view v-else-if="!skeletonVisible && !hasMore && noticeList.length" class="notice-loading">
        <text>没有更多了</text>
      </view>

      <!-- 空状态 -->
      <view v-if="!skeletonVisible && !loading && !noticeList.length" class="notice-empty">
        <image class="notice-empty-img" src="https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png" mode="aspectFit" />
        <text class="notice-empty-text">暂无团队通知</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getGroupNoticeList, getSummary, resetChat } from '../../api/index.js'
import { RecentService } from '../../services/recent.js'

export default {
  data() {
    return {
      noticeList: [],  // 通知列表
      loading: false,  // 加载中状态
      refreshing: false,  // 下拉刷新状态
      hasMore: true,  // 是否有更多数据
      lastNoticeId: 0,  // 最后一条通知ID，用于分页
      summaryCache: {},  // 概要信息缓存 'categoryId:dataId' -> { DataTitle, DataLogo }
      myUserId: '',  // 当前用户ID
      skeletonVisible: true  // 骨架屏是否显示，接口返回后延迟1秒再隐藏
    }
  },
  computed: {
    // ----------- 按日期分组的通知列表
    noticeGroups() {
      const groups = []  // 分组结果，每个元素 { key, label, list }
      this.noticeList.forEach(item => {
        const key = this.getDateKey(item.NoticeDate)  // 当前通知的日期key
        let group = groups.find(g => g.key === key)
        if (!group) {
          group = { key, label: this.getGroupLabel(item.NoticeDate), list: [] }
          groups.push(group)
        }
        group.list.push(item)
      })
      return groups
    }
  },
  onLoad() {
    const userInfo = uni.getStorageSync('userInfo') || {}
    this.myUserId = String(userInfo.UserID || '')
    this.loadNoticeList(true)
    this.markNoticeRead()
  },
  methods: {
    // ----------- 标记通知会话为已读（清未读数）
    async markNoticeRead() {
      try {
        await RecentService.init()
        // 通知会话类型是54，从会话列表里找到它
        const chatItem = RecentService.getList().find(item => item.SessionCategoryID == 54)
        if (chatItem && chatItem.ID) {
          const params = { chatId: chatItem.ID }  // 清未读参数
          // 通知会话有 sendUserId 时一起带上
          if (chatItem.LastSendUserID) params.sendUserId = chatItem.LastSendUserID
          await resetChat(params)
          // 本地清零未读数并通知订阅者，返回消息页后红点和 tab 角标才会实时消失
          if (chatItem.UnReadCount > 0) {
            chatItem.UnReadCount = 0
            RecentService.notify_change()
          }
        }
      } catch (e) {
        console.warn('标记通知已读失败:', e)
      }
    },
    // ----------- 加载通知列表
    async loadNoticeList(isRefresh = false) {
      if (this.loading) return
      if (!isRefresh && !this.hasMore) return
      this.loading = true
      try {
        const noticeId = isRefresh ? 0 : this.lastNoticeId
        const res = await getGroupNoticeList({ noticeId: '-' + noticeId, pageSize: 20 })
        const resData = res.Data || res
        const list = resData.List || []
        if (isRefresh) {
          this.noticeList = list
        } else {
          this.noticeList = this.noticeList.concat(list)
        }
        this.hasMore = resData.HasMore !== undefined ? resData.HasMore : (list.length >= 20)
        if (list.length) {
          this.lastNoticeId = list[list.length - 1].ID
        }
        // 翻译每条通知中的 {U:xxx} 和 {G:xxx}
        this.translateAllNotice()
      } catch (e) {
        console.error('加载团队通知失败:', e)
      } finally {
        this.loading = false
        // 接口调用完成后，延迟1秒再隐藏骨架屏，让加载过程更平滑
        if (this.skeletonVisible) {
          setTimeout(() => {
            this.skeletonVisible = false
          }, 1000)
        }
      }
    },

    // ----------- 下拉刷新
    async onRefresh() {
      this.refreshing = true
      this.hasMore = true
      this.lastNoticeId = 0
      await this.loadNoticeList(true)
      this.refreshing = false
    },

    // ----------- 上拉加载更多
    loadMore() {
      if (!this.hasMore || this.loading) return
      this.loadNoticeList(false)
    },

    // ----------- 格式化通知时间（只显示时分，日期已体现在分组标签上）
    formatNoticeTime(time) {
      if (!time) return ''
      const date = new Date(time)
      if (isNaN(date.getTime())) return time
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`
    },

    // ----------- 获取通知的日期key（用于分组，格式 yyyy-MM-dd）
    getDateKey(time) {
      const date = new Date(time)
      if (isNaN(date.getTime())) return 'unknown'
      const pad = (n) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    },

    // ----------- 获取分组标签文案（今天 08/11、昨天 08/10、08/09、2025/12/30）
    getGroupLabel(time) {
      const date = new Date(time)
      if (isNaN(date.getTime())) return '其他'
      const now = new Date()
      const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()  // 取当天零点时间戳
      const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)  // 与今天相差的天数
      const pad = (n) => String(n).padStart(2, '0')
      const md = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`  // 月/日部分
      if (diffDays === 0) return `今天 ${md}`
      if (diffDays === 1) return `昨天 ${md}`
      if (date.getFullYear() === now.getFullYear()) return md
      return `${date.getFullYear()}/${md}`
    },

    // ----------- 翻译所有通知中的占位符
    async translateAllNotice() {
      for (let i = 0; i < this.noticeList.length; i++) {
        await this.translateNotice(this.noticeList[i], i)
      }
    },

    // ----------- 翻译单条通知中的 {U:xxx} {G:xxx} 为用户名/群名
    async translateNotice(item, index) {
      const content = item.Tittle || ''
      const regexp = /\{(U|G):(\d+)\}/gi
      const matches = content.match(regexp)
      if (!matches || !matches.length) return
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
          const logo = info.UserLogo || info.IMGroupLogo || info.DataLogo || ''
          this.summaryCache[key] = { DataTitle: title, DataLogo: logo }
          summaries[key] = this.summaryCache[key]
        } catch (e) {
          summaries[key] = { DataTitle: id, DataLogo: '' }
        }
      }))
      // 替换占位符，拆分为文本片段数组
      const parts = []
      let lastIndex = 0
      const regGlobal = /\{(U|G):(\d+)\}/gi
      let match
      while ((match = regGlobal.exec(content)) !== null) {
        // 普通文本段
        if (match.index > lastIndex) {
          parts.push({ text: content.substring(lastIndex, match.index), highlight: false })
        }
        const [, type, id] = match
        const key = `${type}:${id}`
        const summary = summaries[key] || { DataTitle: id }
        // 如果是当前用户，显示"您"
        const display = type === 'U' && id === this.myUserId ? '您' : summary.DataTitle
        parts.push({ text: ' ' + display + ' ', highlight: true })
        lastIndex = match.index + match[0].length
      }
      // 剩余普通文本
      if (lastIndex < content.length) {
        parts.push({ text: content.substring(lastIndex), highlight: false })
      }
      this.$set(this.noticeList, index, { ...item, TranslatedParts: parts })
    }
  }
}
</script>

<style scoped lang="scss">
.notice-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f6f7f9;

  .notice-scroll {
    flex: 1;
    overflow: hidden;
    padding: 24rpx;
    box-sizing: border-box;
  }

  /* 时间线列表 */
  .timeline-list {
    padding: 8rpx 0 8rpx 8rpx;
  }

  /* 时间线分组 */
  .timeline-group {
    margin-bottom: 24rpx;
  }

  /* 日期节点（时间线上的日期标记，带圆点） */
  .timeline-date-node {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    position: relative;


    .timeline-date-label {
      font-size: 26rpx;
      color: #f68f21;
      background: rgba(246, 143, 33, 0.1);
      padding: 6rpx 20rpx;
      border-radius: 20rpx;
      margin: 8rpx 0;
    }
  }

  /* 时间线单条通知项 */
  .timeline-item {
    display: flex;
    align-items: stretch;
    padding-left: 4rpx;

    /* 左侧时间轴：圆点 + 竖线 */
    .timeline-axis {
      flex-shrink: 0;
      width: 32rpx;
      display: flex;
      flex-direction: column;
      align-items: center;

      .timeline-node {
        width: 16rpx;
        height: 16rpx;
        border-radius: 50%;
        background: #fff;
        border: 4rpx solid #f68f21;
        margin-top: 22rpx;
        flex-shrink: 0;
      }

      .timeline-line {
        width: 2rpx;
        flex: 1;
        background: #f0e2d0;
        margin-top: 4rpx;
      }
    }

    /* 右侧内容卡片 */
    .timeline-content {
      flex: 1;
      min-width: 0;
      background: #fff;
      border-radius: 16rpx;
      padding: 24rpx 28rpx;
      margin-left: 16rpx;
      margin-bottom: 20rpx;
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

      .timeline-title {
        font-size: 29rpx;
        line-height: 48rpx;
        margin-bottom: 10rpx;
      }

      .timeline-text-normal {
        color: #333;
      }
      .timeline-name-highlight {
        color: #333;
      }
      .timeline-name-highlight:last-child {
        color: #f68f21;
      }

      .timeline-time {
        font-size: 24rpx;
        color: #b5b5b5;
      }
    }
  }

  /* 最后一条通知不显示竖线，且内容卡片不跟下个分组贴太近 */
  .timeline-item-last {
    .timeline-content {
      margin-bottom: 8rpx;
    }
  }

  /* 加载更多 / 没有更多 */
  .notice-loading {
    text-align: center;
    padding: 30rpx;
    font-size: 24rpx;
    color: #c0c0c0;
  }

  /* 空状态 */
  .notice-empty {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 200rpx 0;

    .notice-empty-img {
      width: 160rpx;
      height: 160rpx;
      margin-bottom: 24rpx;
      opacity: 0.4;
    }

    .notice-empty-text {
      font-size: 28rpx;
      color: #c0c0c0;
    }
  }

  /* 骨架屏 */
  .skeleton-wrap {
    padding: 8rpx 0 8rpx 8rpx;

    .skeleton-group {
      margin-bottom: 24rpx;
    }

    /* 骨架日期节点：圆点 + 标签 */
    .skeleton-date-node {
      display: flex;
      align-items: center;
      margin-bottom: 20rpx;

      .skeleton-date-dot {
        width: 16rpx;
        height: 16rpx;
        border-radius: 50%;
        margin-right: 16rpx;
        flex-shrink: 0;
      }

      .skeleton-date-label {
        width: 180rpx;
        height: 40rpx;
        border-radius: 20rpx;
      }
    }

    /* 骨架通知项 */
    .skeleton-item {
      display: flex;
      align-items: stretch;
      padding-left: 4rpx;
      margin-bottom: 20rpx;
    }

    /* 骨架时间轴：圆点 + 竖线 */
    .skeleton-axis {
      flex-shrink: 0;
      width: 32rpx;
      display: flex;
      flex-direction: column;
      align-items: center;

      .skeleton-node {
        width: 16rpx;
        height: 16rpx;
        border-radius: 50%;
        margin-top: 22rpx;
        flex-shrink: 0;
      }

      .skeleton-line {
        width: 2rpx;
        flex: 1;
        margin-top: 4rpx;
      }
    }

    /* 骨架内容卡片 */
    .skeleton-card {
      flex: 1;
      background: #fff;
      border-radius: 16rpx;
      padding: 24rpx 28rpx;
      margin-left: 16rpx;
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

      .skeleton-row {
        display: flex;
        align-items: center;
        margin-bottom: 16rpx;
      }

      .skeleton-bar {
        height: 26rpx;
        border-radius: 8rpx;
      }

      /* 人名占位（短） */
      .skeleton-bar-name {
        width: 120rpx;
        margin-right: 16rpx;
      }

      /* 正文占位（长） */
      .skeleton-bar-text {
        flex: 1;
      }

      /* 第二行正文占位（稍短） */
      .skeleton-bar-text2 {
        width: 60%;
      }

      /* 时间占位（小短条） */
      .skeleton-bar-time {
        width: 100rpx;
        height: 22rpx;
        margin-top: 4rpx;
      }
    }
  }
}

/* 骨架屏闪烁动画（背景色渐变扫过，模拟加载中） */
@keyframes skeleton-blink {
  0% { background-position: -150% 0; }
  100% { background-position: 250% 0; }
}

.skeleton-date-dot,
.skeleton-date-label,
.skeleton-node,
.skeleton-line,
.skeleton-bar {
  background-image: linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%);
  background-size: 400% 100%;
  animation: skeleton-blink 1.4s ease infinite;
}
</style>
