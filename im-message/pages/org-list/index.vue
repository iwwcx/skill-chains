<template>
  <view class="org-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input class="search-input" v-model="keyword" placeholder="搜索组织成员姓名" confirm-type="search" @confirm="onSearch" @input="onSearchInput" />
        <text v-if="keyword" class="search-clear" @tap="clearKeyword">✕</text>
      </view>
    </view>

    <scroll-view class="body-scroll" scroll-y @scrolltolower="loadMore">
      <!-- 搜索结果模式 -->
      <template v-if="searchMode">
        <view v-if="searchLoading && searchResultList.length === 0" class="skeleton-wrap">
          <view v-for="n in 5" :key="n" class="skeleton-card">
            <view class="skeleton-avatar"></view>
            <view class="skeleton-info">
              <view class="skeleton-line skeleton-line-short"></view>
              <view class="skeleton-line skeleton-line-long"></view>
            </view>
          </view>
        </view>
        <template v-else>
          <view v-for="(item, idx) in searchResultList" :key="'s' + (item.UserID || idx)" class="member-card">
            <image class="avatar" :src="getMemberAvatar(item)" mode="aspectFill" />
            <view class="info">
              <view class="name-row">
                <text class="name">{{ item.UserName || '未知用户' }}</text>
                <text v-if="item.OrgDuty" class="duty-tag">{{ item.OrgDuty }}</text>
                <text v-if="item.IsManager == 1" class="manager-tag">管理员</text>
                <text v-if="item.IsCS" class="cs-tag">{{ item.CSName || '客服' }}</text>
              </view>
              <text v-if="item.OrgName" class="sub">🧰 {{ item.OrgName }}</text>
              <text v-if="item.Phone" class="sub">📱 {{ item.Phone }}</text>
            </view>
            <view class="actions">
              <text v-if="!isMyself(item) && !isFriend(item)" class="action-btn add-btn" @tap.stop="onAddFriend(item)">添加好友</text>
              <text v-if="!isMyself(item)" class="action-btn chat-btn" @tap.stop="onStartChat(item)">立即沟通</text>
            </view>
          </view>
        </template>
        <view v-if="!searchLoading && searchResultList.length === 0" class="empty-wrap">
          <text class="empty-icon">🔍</text>
          <text class="empty-text">未找到相关成员</text>
        </view>
      </template>

      <!-- 部门树模式 -->
      <template v-else>
        <view v-if="deptLoading && visibleNodes.length === 0" class="skeleton-wrap">
          <view v-for="n in 4" :key="n" class="skeleton-dept">
            <view class="skeleton-circle"></view>
            <view class="skeleton-line skeleton-line-short"></view>
          </view>
        </view>

        <template v-else>
          <view v-for="node in visibleNodes" :key="node.key">
            <!-- 部门节点 -->
            <view
              v-if="node.type === 'dept'"
              class="dept-item"
              :class="{ 'dept-expanded': expandedMap[node.OrgID], 'dept-active': node.isActive }"
              :style="{ paddingLeft: (-6 + node.level * 40) + 'rpx' }"
              hover-class="dept-hover"
              :hover-stay-time="80"
              @tap="onDeptTap(node)"
            >
              <view v-if="node.level > 0" class="dept-indent-line"></view>
              <view class="dept-icon" :style="{ background: deptIconBgs[node.level % deptIconBgs.length] }">
                <text class="dept-icon-text">{{ node.OrgID === 0 ? '🏭' : (expandedMap[node.OrgID] ? '📂' : '📁') }}</text>
              </view>
              <text class="dept-name">{{ node.OrgName }}</text>
              <view v-if="node.memberCount > 0" class="dept-count">{{ node.memberCount }}</view>
              <view v-if="node.hasChild || node.memberCount > 0" class="dept-arrow" :class="{ 'arrow-down': expandedMap[node.OrgID] }">
                <text class="arrow-text">›</text>
              </view>
            </view>

            <!-- 成员节点 -->
            <view v-else-if="node.type === 'member'" class="member-card">
              <image class="avatar" :src="getMemberAvatar(node)" mode="aspectFill" />
              <view class="info">
                <view class="name-row">
                  <text class="name">{{ node.UserName || '未知用户' }}</text>
                  <text v-if="node.OrgDuty" class="duty-tag">{{ node.OrgDuty }}</text>
                  <text v-if="node.IsManager == 1" class="manager-tag">管理员</text>
                  <text v-if="node.IsCS" class="cs-tag">{{ node.CSName || '客服' }}</text>
                </view>
                <text v-if="node.OrgName" class="sub">🧰 {{ node.OrgName }}</text>
                <text v-if="node.Phone" class="sub">📱 {{ node.Phone }}</text>
              </view>
              <view class="actions">
                <text v-if="!isMyself(node) && !isFriend(node)" class="action-btn add-btn" @tap.stop="onAddFriend(node)">添加好友</text>
                <text v-if="!isMyself(node)" class="action-btn chat-btn" @tap.stop="onStartChat(node)">立即沟通</text>
              </view>
            </view>

            <!-- 加载占位 -->
            <view v-else-if="node.type === 'loading'" class="member-loading">
              <view class="skeleton-card">
                <view class="skeleton-avatar"></view>
                <view class="skeleton-info">
                  <view class="skeleton-line skeleton-line-short"></view>
                  <view class="skeleton-line skeleton-line-long"></view>
                </view>
              </view>
            </view>
          </view>
        </template>

        <view v-if="!deptLoading && visibleNodes.length === 0" class="empty-wrap">
          <text class="empty-icon">--</text>
          <text class="empty-text">暂无组织成员</text>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script>
import { getOrgList, getOrgStaffList, addFriend, getFriendDirList, addFriendDir, startChat, getAddressBookList } from '../../api/index.js'
import { getProductImageUrlChat } from '@/common/utils/index.js'

export default {
  data() {
    return {
      keyword: '',  // 搜索关键词
      deptTree: [],  // 部门树结构
      deptFlatMap: {},  // 所有部门的平铺映射，key=OrgID，value=节点，用于查找同级部门
      rootExpandedOnce: true,  // "我的组织"是否展示初始成员，点击子部门后置false，收起子部门不再回显
      deptLoading: false,  // 部门树加载状态
      expandedMap: {},  // 已展开的部门ID映射
      deptMembers: {},  // 各部门成员缓存，key=OrgID，value=成员数组
      loadingDept: {},  // 正在加载成员的部门，key=OrgID，value=true
      searchMode: false,  // 是否处于搜索模式
      searchResultList: [],  // 搜索结果列表
      searchLoading: false,  // 搜索加载状态
      myUserId: '',  // 当前用户ID
      friendIds: new Set(),  // 已是好友的用户ID集合
      defaultAvatar: 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png',  // 默认头像（男/未知）
      femaleAvatar: 'https://img2cdn.global-dsc.cn/dgzz_img/6842d00b7f7db24082ed4f59f2bba02a.png',  // 女性默认头像，UserSex=2 且无头像时使用
      deptColors: ['#2575fc', '#00b894', '#fd79a8', '#fdcb6e', '#a29bfe'],  // 部门层级色条颜色
      deptIconBgs: ['#eaf2fe', '#e6f9f3', '#ffeef5', '#fff8e6', '#f0eefe']  // 部门图标的浅色背景，与 deptColors 同层级一一对应
    }
  },
  computed: {
    // ----------- 当前可见的树节点平铺列表（部门+成员）
    visibleNodes() {
      return this.flattenTree(this.deptTree, 0)
    }
  },
  onLoad() {
    const userInfo = uni.getStorageSync('userInfo') || {}
    this.myUserId = String(userInfo.UserID || '')
    this.loadDeptTree()
    this.loadFriendIds()
  },
  methods: {
    // ----------- 加载好友ID集合（先查好友目录拿DirID，再用DirID查通讯录列表）
    async loadFriendIds() {
      try {
        const dirRes = await getFriendDirList(0)
        const dirList = dirRes && dirRes.Data ? dirRes.Data : (Array.isArray(dirRes) ? dirRes : [])
        if (dirList.length === 0) return
        const dirID = dirList[0].DirID  // 取第一个目录的DirID
        const listRes = await getAddressBookList(dirID)
        const friendList = (listRes && listRes.Data) || []
        this.friendIds = new Set(friendList.map(f => String(f.UserID)))
      } catch (e) {
        console.error('获取好友列表失败:', e)
      }
    },

    // ----------- 判断是否已是好友
    isFriend(item) {
      const id = String(item.UserID || '')  // 成员用户ID
      return this.friendIds.has(id)
    },

    // ----------- 加载部门树，最顶部固定"我的组织"（OrgID=0），其余部门排在下面
    async loadDeptTree() {
      this.deptLoading = true
      try {
        const res = await getOrgList()
        // 兼容两种返回结构：Data 直接为数组，或 Data.List 为数组
        const rawList = Array.isArray(res.Data) ? res.Data : ((res.Data && res.Data.List) || [])
        const tree = this.buildTree(rawList)
        // 固定插入"我的组织"节点到最顶部，所有部门作为其子节点
        const myOrgNode = { OrgID: 0, OrgName: '我的组织', ParentID: 0, children: tree }
        this.deptTree = [myOrgNode]
        // 构建平铺映射，用于手风琴展开时查找同级部门
        this.deptFlatMap = {}
        this.buildFlatMap(this.deptTree)
        // 默认展开"我的组织"并加载其成员（初始展示全部成员）
        this.$set(this.expandedMap, 0, true)
        this.loadDeptMembers(myOrgNode)
      } catch (e) {
        console.error('获取部门列表失败:', e)
      } finally {
        this.deptLoading = false
      }
    },

    // ----------- 根据平铺部门列表构建树结构
    buildTree(list) {
      const map = {}  // 部门ID到部门节点的映射
      list.forEach(item => {
        map[item.OrgID] = { ...item, children: [] }
      })
      const roots = []  // 根部门集合
      list.forEach(item => {
        const isTop = item.ParentID === '0' || item.ParentID === 0  // 是否为最顶级（ParentID为0）
        const hasParent = map[item.ParentID]  // 父部门是否存在于列表中
        // ParentID为0的作为根部门展示；父部门存在则挂到父节点下；父部门不存在且非顶级则丢弃
        if (isTop) {
          roots.push(map[item.OrgID])
        } else if (hasParent) {
          map[item.ParentID].children.push(map[item.OrgID])
        }
      })
      return roots
    },

    // ----------- 递归平铺部门树为可见节点列表（部门+成员）
    flattenTree(tree, level) {
      const result = []
      tree.forEach(node => {
        const hasChild = node.children && node.children.length > 0  // 是否有子部门
        const memberCount = (this.deptMembers[node.OrgID] || []).length  // 该部门直属成员数
        // 当前展示层：已展开，且没有子部门展开（成员显示在这一层）；"我的组织"还需 rootExpandedOnce 为 true 才高亮
        const hasExpandedChild = hasChild && node.children.some(c => this.expandedMap[c.OrgID])
        const isActive = this.expandedMap[node.OrgID] && !hasExpandedChild && (node.OrgID !== 0 || this.rootExpandedOnce)
        result.push({
          key: 'dept-' + node.OrgID,
          type: 'dept',
          level,
          hasChild,
          memberCount,
          isActive,
          ...node
        })
        // 部门已展开时，先放子部门；有子部门展开时不再显示本部门直属成员，只展示最深一层
        if (this.expandedMap[node.OrgID]) {
          if (hasChild) {
            result.push(...this.flattenTree(node.children, level + 1))
          }
          // 有子部门且其中有展开的，隐藏本部门成员；"我的组织"(OrgID=0)仅在初始展示成员，之后不回显；否则显示本部门直属成员
          const hasExpandedChild = hasChild && node.children.some(c => this.expandedMap[c.OrgID])
          if (!hasExpandedChild && (node.OrgID !== 0 || this.rootExpandedOnce)) {
            const members = this.deptMembers[node.OrgID] || []
            members.forEach(m => {
              result.push({ key: 'member-' + m.UserID + '-' + node.OrgID, type: 'member', level: level + 1, ...m })
            })
          }
        }
      })
      return result
    },

    // ----------- 递归构建部门平铺映射（OrgID -> 节点），用于查找同级部门
    buildFlatMap(tree) {
      tree.forEach(node => {
        this.deptFlatMap[node.OrgID] = node
        if (node.children && node.children.length) {
          this.buildFlatMap(node.children)
        }
      })
    },

    // ----------- 收起同级（同父）的其他已展开部门，实现手风琴效果
    collapseSiblings(node) {
      const parent = this.deptFlatMap[node.ParentID]  // 父节点
      if (!parent || !parent.children) return
      parent.children.forEach(sibling => {
        if (sibling.OrgID !== node.OrgID && this.expandedMap[sibling.OrgID]) {
          this.$set(this.expandedMap, sibling.OrgID, false)
        }
      })
    },

    // ----------- 递归收起某部门的所有子部门（收起父部门时清掉子部门的展开状态，避免下次展开父部门时子部门还是展开的）
    collapseChildren(node) {
      if (!node.children) return
      node.children.forEach(child => {
        if (this.expandedMap[child.OrgID]) {
          this.$set(this.expandedMap, child.OrgID, false)
        }
        this.collapseChildren(child)
      })
    },

    // ----------- 点击部门：展开/收起，展开时收起同级其他部门（手风琴），首次展开懒加载成员
    onDeptTap(node) {
      const id = node.OrgID  // 部门ID
      // 已展开则收起，同时递归收起所有子部门
      if (this.expandedMap[id]) {
        this.$set(this.expandedMap, id, false)
        this.collapseChildren(node)
        return
      }
      // 展开前先收起同级其他已展开部门，保证同一层只展开一个
      this.collapseSiblings(node)
      // 展开"我的组织"时重新展示其成员；展开其他部门后"我的组织"不再回显初始成员
      if (id === 0) {
        this.rootExpandedOnce = true
      } else {
        this.rootExpandedOnce = false
      }
      // 展开并加载成员（未加载过时懒加载）
      this.$set(this.expandedMap, id, true)
      if (!this.deptMembers[id] && !this.loadingDept[id]) {
        this.loadDeptMembers(node)
      }
    },

    // ----------- 加载某部门的直属成员（懒加载，缓存到 deptMembers）
    async loadDeptMembers(node) {
      const id = node.OrgID  // 部门ID
      this.$set(this.loadingDept, id, true)
      try {
        const res = await getOrgStaffList({ page: 1, pageSize: 1000, orgId: id })
        const list = (res.Data && res.Data.List) || []
        // 一次性设置 deptMembers 和 loadingDept，减少响应式触发次数
        this.$set(this.deptMembers, id, list)
        this.$set(this.loadingDept, id, false)
      } catch (e) {
        console.error('获取部门成员失败:', e)
        this.$set(this.deptMembers, id, [])
        this.$set(this.loadingDept, id, false)
      }
    },

    // ----------- 搜索输入：有关键词进入搜索模式，无关键词回到部门树
    onSearchInput() {
      const kw = this.keyword.trim()  // 去空格后的关键词
      if (kw) {
        this.searchMode = true
        this.doSearch()
      } else {
        this.searchMode = false
        this.searchResultList = []
      }
    },

    // ----------- 搜索确认
    onSearch() {
      if (!this.keyword.trim()) return
      this.searchMode = true
      this.doSearch()
    },

    // ----------- 执行全局搜索：拉全部成员（orgId=0）后前端过滤
    async doSearch() {
      const kw = this.keyword.trim().toLowerCase()  // 搜索关键词转小写
      this.searchLoading = true
      try {
        const res = await getOrgStaffList({ page: 1, pageSize: 1000, orgId: 0 })
        const list = (res.Data && res.Data.List) || []
        this.searchResultList = list.filter(item => {
          const name = (item.UserName || '').toLowerCase()  // 成员姓名
          const phone = (item.Phone || '').toLowerCase()  // 手机号
          const orgName = (item.OrgName || '').toLowerCase()  // 组织名称
          const duty = (item.OrgDuty || '').toLowerCase()  // 职务
          return name.indexOf(kw) > -1 || phone.indexOf(kw) > -1 || orgName.indexOf(kw) > -1 || duty.indexOf(kw) > -1
        })
      } catch (e) {
        console.error('搜索成员失败:', e)
        this.searchResultList = []
      } finally {
        this.searchLoading = false
      }
    },

    // ----------- 清空搜索
    clearKeyword() {
      this.keyword = ''
      this.searchMode = false
      this.searchResultList = []
    },

    // ----------- 树模式下暂不分页，占位避免报错
    loadMore() {},

    // ----------- 判断是否是自己
    isMyself(item) {
      const id = String(item.UserID || '')  // 用户ID
      return id === this.myUserId
    },

    // ----------- 获取成员头像
    getMemberAvatar(item) {
      const logo = item.UserLogo || ''  // 用户头像字段
      // 无头像时按性别取默认头像：UserSex=2 用女性头像，其余用默认头像
      if (!logo) return Number(item.UserSex) === 2 ? this.femaleAvatar : this.defaultAvatar
      if (logo.startsWith('http')) return logo
      return getProductImageUrlChat(logo)
    },

    // ----------- 添加好友
    async onAddFriend(item) {
      const userId = item.UserID  // 用户ID
      const remark = item.UserName || ''  // 备注名
      try {
        let dirID = await this.ensureDefaultDir()
        await addFriend({ UserID: userId, UserRemark: remark, DirID: dirID })
        this.friendIds.add(String(userId))
        this.friendIds = new Set(this.friendIds)  // 触发响应式更新
        uni.showToast({ title: '添加成功', icon: 'success' })
      } catch (e) {
        console.error('添加好友失败:', e)
        uni.showToast({ title: '添加失败', icon: 'none' })
      }
    },

    // ----------- 确保有默认好友目录，返回 DirID
    async ensureDefaultDir() {
      const list = await getFriendDirList(0)
      const dirList = list && list.Data ? list.Data : (Array.isArray(list) ? list : [])
      if (dirList.length > 0) {
        return dirList[0].DirID
      }
      const res = await addFriendDir({ ParentID: 0, DirName: '我的联系人' })
      const newDirID = res && res.Data ? res.Data : res
      return newDirID
    },

    // ----------- 立即沟通
    async onStartChat(item) {
      const dataId = String(item.UserID || '')  // 目标用户ID
      const name = item.UserName || ''  // 显示名
      const logo = item.UserLogo || ''  // 头像
      try {
        await startChat({ chatCategoryId: 20, chatDataId: dataId })
      } catch (e) {
        console.warn('同步会话失败:', e)
      }
      const key = `20:${dataId}`
      uni.navigateTo({
        url: `/im-message/pages/chat/detail?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&logo=${encodeURIComponent(logo)}`
      })
    }
  }
}
</script>

<style scoped lang="scss">
.org-page {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;

  /* 搜索栏 */
  .search-bar {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background: #fff;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
    position: relative;
    z-index: 10;

    .search-input-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      background: #f0f2f5;
      border-radius: 40rpx;
      padding: 0 24rpx;
      height: 68rpx;

      .search-icon {
        font-size: 26rpx;
        margin-right: 10rpx;
        opacity: 0.5;
      }

      .search-input {
        flex: 1;
        font-size: 28rpx;
        color: #333;
      }

      .search-clear {
        font-size: 24rpx;
        color: #bbb;
        padding: 8rpx;
      }
    }
  }

  /* 内容滚动区 */
  .body-scroll {
    flex: 1;
    overflow: hidden;
  }

  /* 部门节点 */
  .dept-item {
    display: flex;
    align-items: center;
    padding: 18rpx 24rpx 18rpx 28rpx;
    background: #fff;
    position: relative;
    transition: background 0.15s ease;

    /* 行分隔线，从图标右侧开始，不顶到最左边 */
    &::after {
      content: '';
      position: absolute;
      left: 116rpx;
      right: 24rpx;
      bottom: 0;
      height: 1rpx;
      background: #f3f4f6;
    }

    /* 当前展示层：成员显示在这一层，文字高亮 + 浅蓝背景 */
    &.dept-active {
      .dept-name {
        color: #2575fc;
        font-weight: 700;
      }

      .dept-count {
        background: #2575fc;
        color: #fff;
      }
    }

    &.dept-hover {
      background: #f8f9fb;
    }

    .dept-indent-line {
      width: 6rpx;
      height: 32rpx;
      border-radius: 4rpx;
      margin-right: 14rpx;
      flex-shrink: 0;
    }

    /* 部门图标：圆角方块 + 浅色底 */
    .dept-icon {
      width: 64rpx;
      height: 64rpx;
      border-radius: 16rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20rpx;
      flex-shrink: 0;

      .dept-icon-text {
        font-size: 32rpx;
        line-height: 1;
      }
    }

    .dept-name {
      flex: 1;
      font-size: 28rpx;
      color: #1a1a1a;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* 人数胶囊徽章 */
    .dept-count {
      font-size: 22rpx;
      color: #909399;
      background: #f2f3f5;
      border-radius: 20rpx;
      padding: 2rpx 16rpx;
      margin-right: 12rpx;
      flex-shrink: 0;
    }

    .dept-arrow {
      width: 48rpx;
      height: 48rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s ease;
      transform: rotate(0deg);

      &.arrow-down {
        transform: rotate(90deg);
      }

      .arrow-text {
        font-size: 44rpx;
        color: #c0c4cc;
        line-height: 1;
        position: relative;
        top: -4rpx;
      }
    }
  }

  /* 成员卡片 */
  .member-card {
    display: flex;
    align-items: center;
    background: #fff;
    margin: 20rpx 24rpx;
    border-radius: 20rpx;
    padding: 24rpx;
    gap: 24rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

    .avatar {
      width: 96rpx;
      height: 96rpx;
      border-radius: 50%;
      flex-shrink: 0;
      background: #f0f0f0;
    }

    .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6rpx;

      .name-row {
        display: flex;
        align-items: center;
        gap: 12rpx;
        flex-wrap: wrap;

        .name {
          font-size: 30rpx;
          color: #1a1a1a;
          font-weight: 600;
        }

        .duty-tag {
          font-size: 20rpx;
          color: #2575fc;
          background: #eaf2fe;
          padding: 4rpx 12rpx;
          border-radius: 6rpx;
        }

        .manager-tag {
          font-size: 20rpx;
          color: #ff9800;
          background: #fff4e6;
          padding: 4rpx 12rpx;
          border-radius: 6rpx;
        }

        .cs-tag {
          font-size: 20rpx;
          color: #ff6b6b;
          background: #ffeaea;
          padding: 4rpx 12rpx;
          border-radius: 6rpx;
        }
      }

      .sub {
        font-size: 24rpx;
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 8rpx 0;
      }
    }

    /* 操作按钮 */
    .actions {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 14rpx;
      flex-shrink: 0;

      .action-btn {
        font-size: 22rpx;
        padding: 10rpx 24rpx;
        border-radius: 32rpx;
        font-weight: 500;
        text-align: center;
        white-space: nowrap;

        &.add-btn {
          background: #eaf2fe;
          color: #2575fc;
        }

        &.chat-btn {
          background: #2575fc;
          color: #fff;
        }
      }
    }
  }

  /* 骨架屏 */
  .skeleton-wrap {
    padding: 16rpx 0;

    .skeleton-card {
      display: flex;
      align-items: center;
      background: #fff;
      margin: 20rpx 24rpx 0;
      border-radius: 20rpx;
      padding: 24rpx;
      gap: 24rpx;

      .skeleton-avatar {
        width: 96rpx;
        height: 96rpx;
        border-radius: 50%;
        background: #eceef1;
        flex-shrink: 0;
        animation: shimmer 1.4s infinite ease-in-out;
      }

      .skeleton-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12rpx;

        .skeleton-line {
          height: 24rpx;
          border-radius: 8rpx;
          background: #eceef1;
          animation: shimmer 1.4s infinite ease-in-out;

          &.skeleton-line-short {
            width: 40%;
          }

          &.skeleton-line-long {
            width: 70%;
          }
        }
      }
    }

    .skeleton-dept {
      display: flex;
      align-items: center;
      padding: 22rpx 32rpx;
      background: #fff;
      border-bottom: 1rpx solid #f5f5f5;
      gap: 16rpx;

      .skeleton-circle {
        width: 32rpx;
        height: 32rpx;
        border-radius: 6rpx;
        background: #eceef1;
        animation: shimmer 1.4s infinite ease-in-out;
      }
    }
  }

  .member-loading {
    padding: 8rpx 0;
  }

  /* 空状态 */
  .empty-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 200rpx 0;
    gap: 20rpx;

    .empty-icon {
      font-size: 72rpx;
      opacity: 0.3;
    }

    .empty-text {
      font-size: 26rpx;
      color: #b0b0b0;
    }
  }
}

@keyframes shimmer {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}
</style>
