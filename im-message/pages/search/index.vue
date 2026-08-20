<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input class="search-input" v-model="keyword" :placeholder="placeholderText" confirm-type="search" @confirm="onSearch" />
        <text v-if="keyword" class="search-clear" @tap="clearKeyword">✕</text>
      </view>
      <text class="search-btn" @tap="onSearch">查找</text>
    </view>

    <!-- Tab 切换 -->
    <view class="search-tabs">
      <view class="tab-item" :class="{ active: activeTab === 'user' }" @tap="switchTab('user')">
        <text>找好友</text>
      </view>
      <view class="tab-item" :class="{ active: activeTab === 'group' }" @tap="switchTab('group')">
        <text>找群</text>
      </view>
    </view>

    <!-- 搜索结果 -->
    <scroll-view class="search-result" scroll-y @scrolltolower="loadMore">
      <!-- 加载中 -->
      <view v-if="loading && page === 1" class="loading-wrap">
        <text>加载中...</text>
      </view>

      <!-- 用户列表 -->
      <template v-else-if="activeTab === 'user'">
        <view v-for="(item, idx) in userList" :key="item.userId || idx" class="result-card">
          <image class="avatar avatar-round" :src="getUserAvatar(item)" mode="aspectFill" />
          <view class="info">
            <text class="name">{{ item.showUserName || item.userName || item.nickName || '未知用户' }}</text>
            <text v-if="item.userMdt" class="sub">账号：{{ item.userMdt }}</text>
            <text v-if="item.compName" class="sub">🏢 {{ item.compName }}</text>
          </view>
          <view class="actions">
            <text v-if="!isMyself(item) && !isFriend(item)" class="action-btn add-btn" @tap.stop="onAddFriend(item)">添加好友</text>
            <text v-if="!isMyself(item)" class="action-btn chat-btn" @tap.stop="onStartChat(item, 'user')">立即沟通</text>
          </view>
        </view>
      </template>

      <!-- 群组列表 -->
      <template v-else-if="activeTab === 'group'">
        <view v-for="(item, idx) in groupList" :key="item.ID || idx" class="result-card">
          <image class="avatar avatar-square" :src="getGroupAvatar(item)" mode="aspectFill" />
          <view class="info">
            <text class="name">{{ item.IMGroupName || '未知团队' }}</text>
            <text class="sub">🧑‍💻 {{ item.IMGroupUCount || 0 }}人 · ID {{ item.ID }}</text>
            <text v-if="item.CreateDate" class="sub">创建于 {{ formatDate(item.CreateDate) }}</text>
          </view>
          <view class="actions">
            <text class="action-btn add-btn" @tap.stop="onJoinGroup(item)">加入团队</text>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-if="!loading && ((activeTab === 'user' && !userList.length) || (activeTab === 'group' && !groupList.length))" class="empty-wrap">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无搜索结果</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading && page > 1" class="loading-more">
        <text>加载中...</text>
      </view>

      <!-- 没有更多了 -->
      <view v-if="noMore && (userList.length || groupList.length)" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { searchUsers, searchGroups, addFriend, getFriendDirList, addFriendDir, joinGroup, startChat } from '../../api/index.js'
import { getProductImageUrlChat } from '@/common/utils/index.js'
import { RecentService } from '../../services/recent.js'

export default {
  data() {
    return {
      keyword: '',  // 搜索关键词
      activeTab: 'user',  // 当前 tab: user / group
      userList: [],  // 用户搜索结果
      groupList: [],  // 群组搜索结果
      page: 1,  // 当前页码
      pageSize: 21,  // 每页条数
      loading: false,  // 加载状态
      noMore: false,  // 是否没有更多数据
      myUserId: '',  // 当前用户ID
      defaultAvatar: 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png'  // 默认头像
    }
  },
  computed: {
    // 搜索框占位文字
    placeholderText() {
      return this.activeTab === 'user' ? '请输入好友账号或者电话' : '请输入团队名称'
    }
  },
  onLoad(options) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    this.myUserId = String(userInfo.UserID || '')
    // 如果带了关键词参数，直接搜索
    if (options.keyword) {
      this.keyword = decodeURIComponent(options.keyword)
      this.onSearch()
    }
  },
  methods: {
    // ----------- 搜索
    async onSearch() {
      if (!this.keyword.trim()) return
      this.page = 1
      this.noMore = false
      if (this.activeTab === 'user') {
        this.userList = []
      } else {
        this.groupList = []
      }
      await this.loadSearchData()
    },

    // ----------- 加载搜索数据
    async loadSearchData() {
      if (this.loading || this.noMore) return
      this.loading = true
      try {
        if (this.activeTab === 'user') {
          // 搜索用户，返回 { code, data: { list: [...] } }
          const res = await searchUsers({ q: this.keyword, page: this.page, pageSize: this.pageSize })
          const list = res.data.list || []  // 用户列表
          if (this.page === 1) {
            this.userList = list
          } else {
            this.userList = this.userList.concat(list)
          }
          if (list.length < this.pageSize) this.noMore = true
        } else {
          // 搜索群组，返回 { State, Data: { List: [...], TotalCount, HasMore } }
          const res = await searchGroups({ q: this.keyword, page: this.page, pageSize: this.pageSize })
          const list = res.Data.List || []  // 群组列表
          if (this.page === 1) {
            this.groupList = list
          } else {
            this.groupList = this.groupList.concat(list)
          }
          if (list.length < this.pageSize) this.noMore = true
        }
      } catch (e) {
        console.error('搜索失败:', e)
      } finally {
        this.loading = false
      }
    },

    // ----------- 加载更多
    loadMore() {
      if (this.loading || this.noMore) return
      this.page++
      this.loadSearchData()
    },

    // ----------- 切换 tab
    switchTab(tab) {
      if (this.activeTab === tab) return
      this.activeTab = tab
      this.page = 1
      this.noMore = false
      // 如果有关键词则重新搜索
      if (this.keyword.trim()) {
        this.onSearch()
      } else {
        this.userList = []
        this.groupList = []
      }
    },

    // ----------- 清空关键词
    clearKeyword() {
      this.keyword = ''
      this.userList = []
      this.groupList = []
      this.page = 1
      this.noMore = false
    },

    // ----------- 判断是否是自己
    isMyself(item) {
      const id = String(item.userId || item.UserID || '')  // 用户ID
      return id === this.myUserId
    },

    // ----------- 判断是否已是好友
    isFriend(item) {
      return item.isFriend === true || (item.FriendID && item.FriendID > 0)
    },

    // ----------- 获取用户头像
    getUserAvatar(item) {
      const logo = item.userLogo || item.UserLogo || ''  // 用户头像字段
      if (!logo) return this.defaultAvatar
      if (logo.startsWith('http')) return logo
      return getProductImageUrlChat(logo)
    },

    // ----------- 获取群组头像
    getGroupAvatar(item) {
      const logo = item.IMGroupLogo || ''
      if (!logo) return this.defaultAvatar
      if (logo.startsWith('http')) return logo
      return getProductImageUrlChat(logo)
    },

    // ----------- 添加好友
    async onAddFriend(item) {
      const userId = item.userId || item.UserID  // 用户ID
      const remark = item.showUserName || item.userName || item.nickName || ''  // 备注名
      try {
        // 先获取好友目录列表，没有就创建一个默认目录
        let dirID = await this.ensureDefaultDir()
        await addFriend({ UserID: userId, UserRemark: remark, DirID: dirID })
        // 标记为已添加
        this.$set(item, 'isFriend', true)
        uni.showToast({ title: '添加成功', icon: 'success' })
      } catch (e) {
        console.error('添加好友失败:', e)
        uni.showToast({ title: '添加失败', icon: 'none' })
      }
    },

    // ----------- 确保有默认好友目录，返回 DirID
    async ensureDefaultDir() {
      // 先查目录列表
      const list = await getFriendDirList(0)
      const dirList = list && list.Data ? list.Data : (Array.isArray(list) ? list : [])
      if (dirList.length > 0) {
        return dirList[0].DirID
      }
      // 没有目录，创建一个默认目录
      const res = await addFriendDir({ ParentID: 0, DirName: '我的联系人' })
      const newDirID = res && res.Data ? res.Data : res
      return newDirID
    },

    // ----------- 申请加入团队（对应 supply-chain-im 的 GroupApply）
    async onJoinGroup(item) {
      try {
        await joinGroup({ groupId: item.ID, applyRemark: '' })
        uni.showToast({ title: '申请已发送', icon: 'success' })
      } catch (e) {
        console.error('加入团队失败:', e)
        uni.showToast({ title: '申请失败', icon: 'none' })
      }
    },

    // ----------- 格式化日期
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const m = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    },

    // ----------- 开始聊天
    async onStartChat(item, type) {
      const categoryId = type === 'user' ? 20 : 52  // 用户20 群组52
      const dataId = String(item.userId || item.UserID || item.ID || '')  // 目标ID
      const name = item.showUserName || item.userName || item.nickName || item.IMGroupName || ''  // 显示名
      const logo = item.userLogo || item.UserLogo || item.IMGroupLogo || ''  // 头像
      try {
        // 先同步会话到服务端
        await startChat({ chatCategoryId: categoryId, chatDataId: dataId })
      } catch (e) {
        console.warn('同步会话失败:', e)
      }
      // 跳转聊天页
      const key = `${categoryId}:${dataId}`
      uni.navigateTo({
        url: `/im-message/pages/chat/detail?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&logo=${encodeURIComponent(logo)}`
      })
    }
  }
}
</script>

<style scoped lang="scss">
.search-page {
  min-height: 100vh;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  gap: 20rpx;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f0f2f5;
  border-radius: 36rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.search-clear {
  font-size: 26rpx;
  color: #999;
  padding: 8rpx;
}

.search-btn {
  font-size: 30rpx;
  color: #2575fc;
  font-weight: 500;
  flex-shrink: 0;
}

/* Tab 切换 */
.search-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 30rpx;
  color: #666;
  position: relative;

  &.active {
    color: #2575fc;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 6rpx;
      background: #2575fc;
      border-radius: 3rpx;
    }
  }
}

/* 搜索结果 */
.search-result {
  flex: 1;
  overflow: hidden;
}

/* 结果卡片（用户 / 群组通用） */
.result-card {
  display: flex;
  align-items: center;
  background: #fff;
  margin: 20rpx 24rpx 0;
  border-radius: 20rpx;
  padding: 24rpx;
  gap: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.avatar-round {
  border-radius: 50%;
}

.avatar-square {
  border-radius: 16rpx;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.name {
  font-size: 30rpx;
  color: #1a1a1a;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  font-size: 24rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 4rpx 0;
}

/* 操作按钮（右侧竖排） */
.actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14rpx;
  flex-shrink: 0;
}

.action-btn {
  font-size: 22rpx;
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}

.add-btn {
  background: #eaf2fe;
  color: #2575fc;
}

.chat-btn {
  background: #2575fc;
  color: #fff;
}

/* 加载中 / 空状态 */
.loading-wrap {
  text-align: center;
  padding: 80rpx 0;
  font-size: 26rpx;
  color: #aaa;
}

.loading-more {
  text-align: center;
  padding: 30rpx 0;
  font-size: 24rpx;
  color: #aaa;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
  gap: 16rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 8rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #a7a7a7;
}

.empty-hint {
  font-size: 24rpx;
  color: #bbb;
}
</style>
