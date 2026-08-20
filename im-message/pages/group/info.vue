<template>
  <view class="group-info-page">
    <!-- 群信息头部 -->
    <view class="group-header">
      <!-- 渐变背景装饰 -->
      <view class="group-header-bg">
        <view class="bg-blob bg-blob-1"></view>
        <view class="bg-blob bg-blob-2"></view>
        <view class="bg-blob bg-blob-3"></view>
      </view>
      <view class="group-header-content">
        <image class="group-logo" :src="groupLogo || defaultGroupLogo" mode="aspectFill" />
        <view class="group-name-wrap">
          <text class="group-name">{{ groupName }}</text>
        </view>
        <text v-if="canEditGroup" class="group-name-edit" @tap="goRenameGroup">✏️ 修改群名</text>
        <view class="group-meta">
          <view class="group-meta-item">
            <text class="group-meta-icon">👫</text>
            <text class="group-meta-text">共 {{ memberList.length }} 人</text>
          </view>
          <view class="group-meta-item" @tap="copyGroupId">
            <text class="group-meta-icon">🆔</text>
            <text class="group-meta-text">{{ groupId }}</text>
            <text class="group-meta-copy">复制</text>
          </view>
          <!-- <view v-if="myRoleText" class="group-meta-item role">
            <text class="group-meta-text">{{ myRoleText }}</text>
          </view> -->
        </view>
      </view>
    </view>

    <!-- 群成员列表 -->
    <view class="member-section">
      <view class="member-section-title">
        <text class="member-section-text">群成员</text>
      </view>
      <view class="member-list">
        <view class="member-item" v-for="member in memberList" :key="member.UserID" @tap="onMemberTap(member)">
          <view class="member-avatar-wrap">
            <image class="member-avatar" :src="member.UserLogo || defaultAvatar" mode="aspectFill" />
            <!-- 移除模式下的红色减号角标（群主不能被移除） -->
            <view v-if="removeMode && member.RoleInGroup !== 1" class="member-remove-badge">
              <text class="member-remove-badge-icon">−</text>
            </view>
          </view>
          <view class="member-info">
            <text class="member-name">{{ member.UserName || member.UserNameInGroup || '未知' }}</text>
            <text v-if="member.RoleInGroup === 1" class="member-role-tag">群主</text>
            <text v-else-if="member.RoleInGroup === 2" class="member-role-tag admin">管理员</text>
          </view>
        </view>
        <!-- 添加群成员入口 -->
        <view class="member-item op-item" @tap="goAddMember">
          <view class="member-op-btn add">
            <text class="member-op-icon">+</text>
          </view>
          <text class="member-op-name">添加</text>
        </view>
        <!-- 移除群成员入口（仅群主可见，对应 supply-chain-im 只有群主能踢人） -->
        <view class="member-item op-item" v-if="isOwner" @tap="toggleRemoveMode">
          <view class="member-op-btn remove" :class="{ active: removeMode }">
            <text class="member-op-icon">−</text>
          </view>
          <text class="member-op-name">{{ removeMode ? '完成' : '移除' }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作区（群主显示解散，非群主显示退出） -->
    <view class="group-action-section">
      <!-- 修改我的群名片 -->
      <view class="group-action-btn primary" @tap="goRename">
        <text class="group-action-btn-text">修改我的群名片</text>
      </view>
      <view v-if="isOwner" class="group-action-btn danger" @tap="confirmDissolve">
        <text class="group-action-btn-text">解散群聊</text>
      </view>
      <view v-else class="group-action-btn danger" @tap="confirmQuit">
        <text class="group-action-btn-text">退出群聊</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="group-loading">
      <text>加载中...</text>
    </view>

    <!-- 添加群成员弹窗 -->
    <view v-if="addMemberVisible" class="add-member-mask" @tap="onAddMemberCancel">
      <view class="add-member-dialog" @tap.stop="">
        <!-- 头部 -->
        <view class="add-member-header">
          <text class="add-member-title">添加成员</text>
          <text class="add-member-close" @tap="onAddMemberCancel">✕</text>
        </view>

        <!-- 成员选择列表 -->
        <view class="add-member-list-header">
          <text class="add-member-list-title">选择成员</text>
          <text class="add-member-list-count">已选 {{ selectedIds.length }} 人</text>
        </view>
        <scroll-view class="add-member-scroll" scroll-y>
          <view
            class="add-member-item"
            v-for="item in candidateList"
            :key="item.SessionDataID"
            @tap="onToggleMember(item)"
          >
            <view class="add-member-check" :class="{ 'add-member-checked': selectedIds.includes(item.SessionDataID) }">
              <text v-if="selectedIds.includes(item.SessionDataID)" class="add-member-check-icon">✓</text>
            </view>
            <image class="add-member-avatar" :src="getAvatarSrc(item)" mode="aspectFill" />
            <view class="add-member-info">
              <text class="add-member-name">{{ item.SessionName }}</text>
              <text v-if="item.CompanyBrand" class="add-member-company">{{ item.CompanyBrand }}</text>
            </view>
          </view>
          <view v-if="candidateList.length === 0" class="add-member-empty">
            <text class="add-member-empty-text">暂无可添加的联系人</text>
          </view>
        </scroll-view>

        <!-- 底部按钮 -->
        <view class="add-member-footer">
          <view class="add-member-btn-cancel" @tap="onAddMemberCancel">取消</view>
          <view class="add-member-btn-ok" :class="{ 'add-member-btn-disabled': selectedIds.length === 0 }" @tap="onAddMemberConfirm">确定（{{ selectedIds.length }}）</view>
        </view>
      </view>
    </view>

    <!-- 修改群名片弹窗 -->
    <view v-if="renameVisible" class="add-member-mask" @tap="onRenameCancel">
      <view class="rename-dialog" @tap.stop="">
        <view class="add-member-header">
          <text class="add-member-title">修改群名片</text>
          <text class="add-member-close" @tap="onRenameCancel">✕</text>
        </view>
        <view class="rename-tips">设置我在本群的昵称，仅在本群显示</view>
        <input class="rename-input" v-model="renameInput" placeholder="请输入群名片" maxlength="20" :focus="renameVisible" />
        <view class="add-member-footer">
          <view class="add-member-btn-cancel" @tap="onRenameCancel">取消</view>
          <view class="add-member-btn-ok" :class="{ 'add-member-btn-disabled': !renameInput.trim() }" @tap="onRenameConfirm">确定</view>
        </view>
      </view>
    </view>

    <!-- 修改群名弹窗 -->
    <view v-if="renameGroupVisible" class="add-member-mask" @tap="onRenameGroupCancel">
      <view class="rename-dialog" @tap.stop="">
        <view class="add-member-header">
          <text class="add-member-title">修改群名</text>
          <text class="add-member-close" @tap="onRenameGroupCancel">✕</text>
        </view>
        <view class="rename-tips">修改后将同步给群内所有成员</view>
        <input class="rename-input" v-model="renameGroupInput" placeholder="请输入群名" maxlength="30" :focus="renameGroupVisible" />
        <view class="add-member-footer">
          <view class="add-member-btn-cancel" @tap="onRenameGroupCancel">取消</view>
          <view class="add-member-btn-ok" :class="{ 'add-member-btn-disabled': !renameGroupInput.trim() }" @tap="onRenameGroupConfirm">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getGroupUserList, addGroupUser, kickGroupUser, dissolveGroup, quitGroup, removeChat, groupUserRename, groupUpdate } from '../../api/index.js'
import { IMService } from '../../services/im.js'
import { RecentService } from '../../services/recent.js'
import { getProductImageUrlChat } from '@/common/utils/index.js'

export default {
  data() {
    return {
      groupId: '',  // 群ID
      groupName: '',  // 群名称
      groupLogo: '',  // 群头像
      memberList: [],  // 群成员列表
      loading: false,  // 加载中状态
      defaultAvatar: 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png',  // 默认头像
      defaultGroupLogo: 'https://prodimg.global-dsc.cn/24/3c15e1/a543d0/c6cedf/cdac30/8568ba',  // 默认群头像
      addMemberVisible: false,  // 添加成员弹窗显示状态
      candidateList: [],  // 候选联系人列表（单聊会话）
      selectedIds: [],  // 已选中的用户ID列表
      adding: false,  // 添加中状态（防重复提交）
      removeMode: false,  // 移除成员模式开关
      removing: false,  // 移除中状态（防重复提交）
      dissolving: false,  // 解散群聊中状态（防重复提交）
      quitting: false,  // 退出群聊中状态（防重复提交）
      myUserId: '',  // 当前用户ID
      renameVisible: false,  // 修改名片弹窗显示状态
      renameInput: '',  // 名片输入内容
      renaming: false,  // 修改名片中状态（防重复提交）
      renameGroupVisible: false,  // 修改群名弹窗显示状态
      renameGroupInput: '',  // 群名输入内容
      renamingGroup: false  // 修改群名中状态（防重复提交）
    }
  },
  computed: {
    // ----------- 当前用户是否是群主（只有群主能移除成员）
    isOwner() {
      const mine = this.memberList.find(item => String(item.UserID) === this.myUserId) // 我在群里的成员信息
      return mine && mine.RoleInGroup === 1
    },
    // ----------- 当前用户是否可以编辑群信息（群主或管理员）
    canEditGroup() {
      const mine = this.memberList.find(item => String(item.UserID) === this.myUserId) // 我在群里的成员信息
      return mine && (mine.RoleInGroup === 1 || mine.RoleInGroup === 2)
    },
    // ----------- 我在群里的角色文案（用于头部展示）
    myRoleText() {
      const mine = this.memberList.find(item => String(item.UserID) === this.myUserId) // 我在群里的成员信息
      if (!mine) return ''
      return { 1: '我是群主', 2: '我是管理员', 3: '我是成员' }[mine.RoleInGroup] || ''
    },
    // ----------- 我在群里的成员信息（用于读取当前群名片）
    myMember() {
      return this.memberList.find(item => String(item.UserID) === this.myUserId) || null
    }
  },
  onLoad(options) {
    this.groupId = options.groupId || ''
    const userInfo = uni.getStorageSync('userInfo') || {} // 当前登录用户信息
    this.myUserId = String(userInfo.UserID || '')
    this.groupName = decodeURIComponent(options.name || '')
    this.groupLogo = decodeURIComponent(options.logo || '')
  },
  onShow() {
    // 放在 onShow 里，回到本页面时自动刷新成员列表
    this.loadMembers()
  },
  methods: {
    // ----------- 打开添加成员弹窗（候选取会话列表里的单聊，排除已在群的成员）
    async goAddMember() {
      this.selectedIds = []
      this.removeMode = false // 打开添加弹窗时退出移除模式
      this.addMemberVisible = true
      try {
        await RecentService.init(true)
        const excludeIds = this.memberList.map(item => String(item.UserID)) // 已在群里的成员ID
        this.candidateList = RecentService.getList().filter(item =>
          item.SessionCategoryID == 20 && !excludeIds.includes(String(item.SessionDataID))
        )
      } catch (e) {
        console.error('加载候选联系人失败:', e)
        this.candidateList = []
      }
    },

    // ----------- 切换成员选中状态
    onToggleMember(item) {
      const id = item.SessionDataID
      const idx = this.selectedIds.indexOf(id)
      if (idx > -1) {
        this.selectedIds.splice(idx, 1)
      } else {
        this.selectedIds.push(id)
      }
    },

    // ----------- 取消添加成员
    onAddMemberCancel() {
      this.addMemberVisible = false
    },

    // ----------- 确认添加成员（对应 supply-chain-im 的 GroupIMService.addMembers 流程）
    async onAddMemberConfirm() {
      if (this.adding || this.selectedIds.length === 0) return
      this.adding = true
      uni.showLoading({ title: '添加中...' })
      try {
        // 1. 调网易云信 SDK 邀请成员入群
        await IMService.inviteTeamMembers(this.groupId, this.selectedIds)
        // 2. 调后端接口同步群成员
        await addGroupUser(this.groupId, this.selectedIds.map(String))
        uni.showToast({ title: '添加成功', icon: 'success' })
        this.addMemberVisible = false
        // 3. 刷新群成员列表
        this.loadMembers()
      } catch (err) {
        console.error('[添加群成员] 失败:', err)
        uni.showToast({ title: err.message || '添加失败', icon: 'none' })
      } finally {
        this.adding = false
        uni.hideLoading()
      }
    },

    // ----------- 获取候选人头像地址，没有则兜底默认图
    getAvatarSrc(item) {
      return item.SessionLogo ? getProductImageUrlChat(item.SessionLogo) : this.defaultAvatar
    },

    // ----------- 切换移除成员模式
    toggleRemoveMode() {
      this.removeMode = !this.removeMode
    },

    // ----------- 点击成员：移除模式下确认踢出，否则跳转用户详情页
    onMemberTap(member) {
      if (this.removeMode) {
        if (this.removing) return
        if (member.RoleInGroup === 1) return // 群主不能被移除
        const name = member.UserName || member.UserNameInGroup || '该成员' // 被移除成员名称
        uni.showModal({
          title: '提示',
          content: `是否将「${name}」移出群组？`,
          success: (res) => {
            res.confirm && this.kickMember(member)
          }
        })
        return
      }
      // 非移除模式，跳转个人信息页（和聊天详情页跳法一致）
      const userName = member.UserName || member.UserNameInGroup || '' // 用户名称
      const userLogo = member.UserLogo || '' // 用户头像（loadMembers 里已转完整URL，详情页兼容 http 开头）
      uni.navigateTo({
        url: `/im-message/pages/user/info?userId=${member.UserID}&name=${encodeURIComponent(userName)}&logo=${encodeURIComponent(userLogo)}`
      })
    },

    // ----------- 执行移除成员
    async kickMember(member) {
      this.removing = true
      uni.showLoading({ title: '移除中...' })
      try {
        // 1. 调网易云信 SDK 将成员踢出群
        await IMService.kickTeamMembers(this.groupId, [member.UserID])
        // 2. 调后端接口同步群成员
        await kickGroupUser({ groupId: this.groupId, userId: member.UserID })
        // 3. 前端直接从列表移除
        this.memberList = this.memberList.filter(item => item.UserID !== member.UserID)
        uni.showToast({ title: '移出成功', icon: 'success' })
      } catch (err) {
        console.error('[移除群成员] 失败:', err)
        uni.showToast({ title: err.message || '移除失败', icon: 'none' })
      } finally {
        this.removing = false
        uni.hideLoading()
      }
    },

    // ----------- 复制群号
    copyGroupId() {
      if (!this.groupId) return
      uni.setClipboardData({
        data: String(this.groupId),
        success: () => uni.showToast({ title: '群号已复制', icon: 'none' })
      })
    },

    // ----------- 加载群成员列表
    async loadMembers() {
      if (!this.groupId) return
      this.loading = true
      try {
        const res = await getGroupUserList({ groupId: this.groupId })
        const list = res.Data || []
        // 按角色排序：群主 > 管理员 > 普通成员
        this.memberList = list.sort((a, b) => {
          const roleOrder = { 1: 0, 2: 1 }
          return (roleOrder[a.RoleInGroup] || 2) - (roleOrder[b.RoleInGroup] || 2)
        }).map(item => ({
          ...item,
          UserName: item.UserNameInGroup || item.UserName || '',
          UserLogo: item.UserLogo ? getProductImageUrlChat(item.UserLogo) : ''
        }))
      } catch (e) {
        console.error('加载群成员失败:', e)
      } finally {
        this.loading = false
      }
    },

    // ----------- 解散群聊二次确认
    confirmDissolve() {
      uni.showModal({
        title: '解散群聊',
        content: `解散后群聊将无法恢复，所有成员都会被移出，确定要解散「${this.groupName}」吗？`,
        confirmText: '解散',
        confirmColor: '#fa5151',
        success: (res) => {
          if (res.confirm) this.doDissolve()
        }
      })
    },

    // ----------- 执行解散群聊：先调网易云信 SDK 解散群组（自动通知所有群成员），再调后端 GroupDiss，最后删除会话返回列表
    async doDissolve() {
      if (this.dissolving) return
      this.dissolving = true
      uni.showLoading({ title: '解散中...' })
      try {
        // 1. 调网易云信 SDK 解散群组：SDK 会自动给所有群成员推送 onTeamDismissed 事件，群成员端实时从列表移除该群
        await IMService.dismissTeam(this.groupId)
        // 2. 调后端解散群组（同步业务侧群数据）
        await dissolveGroup({ groupId: this.groupId })
        // 3. 从会话列表找到对应的 chatId，删除会话
        const chatItem = RecentService.getList().find(item =>
          item.SessionCategoryID == 52 && String(item.SessionDataID) === String(this.groupId)
        )
        if (chatItem && chatItem.ID) {
          await removeChat({ chatId: chatItem.ID })
        }
        // 4. 从本地会话列表移除
        const list = RecentService.getList()
        const idx = list.findIndex(item =>
          item.SessionCategoryID == 52 && String(item.SessionDataID) === String(this.groupId)
        )
        if (idx > -1) list.splice(idx, 1)
        RecentService.notify_change()
        uni.showToast({ title: '已解散', icon: 'success' })
        // 5. 返回消息列表页（navigateBack 回到聊天详情，再回到列表；用 reLaunch 直接回列表最干净）
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/message/index' })
        }, 500)
      } catch (err) {
        console.error('[解散群聊] 失败:', err)
        uni.showToast({ title: err.message || '解散失败', icon: 'none' })
      } finally {
        this.dissolving = false
        uni.hideLoading()
      }
    },

    // ----------- 退出群聊二次确认
    confirmQuit() {
      uni.showModal({
        title: '退出群聊',
        content: `退出后后将不再接收「${this.groupName}」的消息，确定退出吗？`,
        confirmText: '退出',
        confirmColor: '#fa5151',
        success: (res) => {
          if (res.confirm) this.doQuit()
        }
      })
    },

    // ----------- 执行退出群聊：先调 GroupQuit 退群，再调 RemoveChat 删除会话，最后返回消息列表
    async doQuit() {
      if (this.quitting) return
      this.quitting = true
      uni.showLoading({ title: '退出中...' })
      try {
        // 1. 调后端退出群组
        await quitGroup({ groupId: this.groupId })
        // 2. 从会话列表找到对应的 chatId，删除会话
        const chatItem = RecentService.getList().find(item =>
          item.SessionCategoryID == 52 && String(item.SessionDataID) === String(this.groupId)
        )
        if (chatItem && chatItem.ID) {
          await removeChat({ chatId: chatItem.ID })
        }
        // 3. 从本地会话列表移除
        const list = RecentService.getList()
        const idx = list.findIndex(item =>
          item.SessionCategoryID == 52 && String(item.SessionDataID) === String(this.groupId)
        )
        if (idx > -1) list.splice(idx, 1)
        uni.showToast({ title: '已退出', icon: 'success' })
        // 4. 返回消息列表页
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/message/index' })
        }, 500)
      } catch (err) {
        console.error('[退出群聊] 失败:', err)
        uni.showToast({ title: err.message || '退出失败', icon: 'none' })
      } finally {
        this.quitting = false
        uni.hideLoading()
      }
    },

    // ----------- 打开修改名片弹窗，预填当前群名片
    goRename() {
      const cur = this.myMember ? (this.myMember.UserNameInGroup || this.myMember.UserName || '') : '' // 当前群名片
      this.renameInput = cur
      this.renameVisible = true
    },

    // ----------- 取消修改名片
    onRenameCancel() {
      this.renameVisible = false
      this.renameInput = ''
    },

    // ----------- 确认修改名片（调 GroupUserRename，userId 传 0 表示改自己的名片）
    async onRenameConfirm() {
      const name = this.renameInput.trim()
      if (!name || this.renaming) return
      this.renaming = true
      uni.showLoading({ title: '修改中...' })
      try {
        await groupUserRename({ groupId: this.groupId, nameInGroup: name, userId: 0 })
        // 同步更新本地成员列表里我的名片
        if (this.myMember) this.myMember.UserNameInGroup = name
        uni.showToast({ title: '修改成功', icon: 'success' })
        this.renameVisible = false
        this.renameInput = ''
      } catch (err) {
        console.error('[修改群名片] 失败:', err)
        uni.showToast({ title: err.message || '修改失败', icon: 'none' })
      } finally {
        this.renaming = false
        uni.hideLoading()
      }
    },

    // ----------- 打开修改群名弹窗，预填当前群名
    goRenameGroup() {
      this.renameGroupInput = this.groupName
      this.renameGroupVisible = true
    },

    // ----------- 取消修改群名
    onRenameGroupCancel() {
      this.renameGroupVisible = false
      this.renameGroupInput = ''
    },

    // ----------- 确认修改群名（调 GroupUpdate，成功后通知聊天页和会话列表同步更新）
    async onRenameGroupConfirm() {
      const name = this.renameGroupInput.trim()
      if (!name || this.renamingGroup) return
      if (name === this.groupName) {  // 名字没变直接关闭
        this.renameGroupVisible = false
        return
      }
      this.renamingGroup = true
      uni.showLoading({ title: '修改中...' })
      try {
        await groupUpdate(this.groupId, { IMGroupName: name })
        // 1. 更新本页群名
        this.groupName = name
        // 2. 同步更新会话列表里的群名，返回消息列表也是新名字
        const chatItem = RecentService.getList().find(item =>
          item.SessionCategoryID == 52 && String(item.SessionDataID) === String(this.groupId)
        )
        if (chatItem) {
          chatItem.SessionName = name
          RecentService.notify_change()
        }
        // 3. 通知聊天详情页实时更新导航栏标题
        uni.$emit('groupInfoUpdate', { groupId: this.groupId, name })
        uni.showToast({ title: '修改成功', icon: 'success' })
        this.renameGroupVisible = false
        this.renameGroupInput = ''
      } catch (err) {
        console.error('[修改群名] 失败:', err)
        uni.showToast({ title: err.message || '修改失败', icon: 'none' })
      } finally {
        this.renamingGroup = false
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped lang="scss">
.group-info-page {
  min-height: 100vh;
  background: #ededed;
}

/* 群信息头部 */
.group-header {
  position: relative;
  margin-bottom: 20rpx;
}

/* 渐变背景装饰 */
.group-header-bg {
  height: 240rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  position: relative;
  overflow: hidden;

  .bg-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(40rpx);
  }

  .bg-blob-1 {
    width: 240rpx;
    height: 240rpx;
    top: -60rpx;
    right: -40rpx;
    background: rgba(255, 255, 255, 0.25);
  }

  .bg-blob-2 {
    width: 180rpx;
    height: 180rpx;
    bottom: -50rpx;
    left: 60rpx;
    background: rgba(69, 136, 252, 0.4);
  }

  .bg-blob-3 {
    width: 140rpx;
    height: 140rpx;
    top: 60rpx;
    left: 300rpx;
    background: rgba(255, 255, 255, 0.15);
  }
}

.group-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  padding: 0 24rpx 32rpx;
  margin-top: -1rpx;
  position: relative;
  z-index: 1;
}

.group-logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  margin-top: -70rpx;
  margin-bottom: 16rpx;
  background: #fff;
}

.group-name {
  font-size: 36rpx;
  color: #222;
  font-weight: 700;
  margin-bottom: 16rpx;
  max-width: 600rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 群名 + 编辑笔图标 */
.group-name-wrap {
  display: flex;
  align-items: center;
}

.group-name-edit {
  font-size: 24rpx;
  color: #4588fc;
  padding: 6rpx 20rpx;
  background: #eef4ff;
  border-radius: 20rpx;
  margin-bottom: 16rpx;

  &:active {
    opacity: 0.6;
  }
}

/* 头部信息标签行 */
.group-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
  justify-content: center;
}

.group-meta-item {
  display: flex;
  align-items: center;
  background: #f5f6f8;
  border-radius: 24rpx;
  padding: 10rpx 20rpx;

  &.role {
    background: linear-gradient(135deg, #4588fc, #66a6ff);

    .group-meta-text {
      color: #fff;
    }
  }

  &:active {
    opacity: 0.75;
  }
}

.group-meta-icon {
  font-size: 24rpx;
  margin-right: 6rpx;
}

.group-meta-text {
  font-size: 24rpx;
  color: #666;
}

.group-meta-copy {
  font-size: 24rpx;
  color: #0561ff;
  margin-left: 10rpx;
  padding-left: 10rpx;
  border-left: 1rpx solid #e0e0e0;
}

/* 群成员列表 */
.member-section {
  background: #fff;
}

.member-section-title {
  padding: 24rpx 30rpx 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.member-section-text {
  font-size: 26rpx;
  color: #999;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 15rpx;
}

.member-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6rpx 0;
}

.member-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  margin-bottom: 12rpx;
}

.member-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.member-name {
  margin: 6rpx 0;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.member-role-tag {
  position: absolute;
  margin-top: -40rpx;
  margin-left: 6rpx;
  font-size: 20rpx;
  color: #fff;
  background: #fa9d3b;
  border-radius: 10rpx;
  padding: 6rpx 12rpx;
  line-height: 1.2;

  &.admin {
    background: #4cbc84;
  }
}

/* 移除模式角标 */
.member-avatar-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.member-remove-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.member-remove-badge-icon {
  font-size: 26rpx;
  color: #fff;
  line-height: 1;
}

/* 添加/移除成员按钮 */
.op-item {
  align-items: center;
}

.member-op-btn {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  flex-shrink: 0;

  &.add {
    background: #eef4ff;
  }

  &.remove {
    background: #fff1f0;
  }

  &.remove.active {
    background: #ff4d4f;

    .member-op-icon {
      color: #fff;
    }
  }

  &:active {
    opacity: 0.75;
  }
}

.member-op-icon {
  font-size: 44rpx;
  font-weight: 600;
  line-height: 1;

  .add & {
    color: #4588fc;
  }

  .remove & {
    color: #ff4d4f;
  }
}

.member-op-name {
  width: 100%;
  font-size: 26rpx;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 添加成员弹窗 */
.add-member-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-member-dialog {
  width: 620rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-member-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx 10rpx;
}

.add-member-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.add-member-close {
  font-size: 32rpx;
  color: #999;
  padding: 0 10rpx;
}

.add-member-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx 10rpx;
}

.add-member-list-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.add-member-list-count {
  font-size: 26rpx;
  color: #4588fc;
  font-weight: 600;
}

.add-member-scroll {
  height: 560rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
}

.add-member-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:active {
    background: #fafafa;
  }
}

.add-member-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d0d4dc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.add-member-checked {
  background: #4588fc;
  border-color: #4588fc;
}

.add-member-check-icon {
  font-size: 22rpx;
  color: #fff;
  line-height: 1;
}

.add-member-avatar {
  width: 68rpx;
  height: 68rpx;
  border-radius: 14rpx;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.add-member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.add-member-name {
  font-size: 29rpx;
  color: #222;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.add-member-company {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.add-member-empty {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-member-empty-text {
  font-size: 26rpx;
  color: #ccc;
}

.add-member-footer {
  display: flex;
  gap: 20rpx;
  padding: 22rpx 30rpx 28rpx;
  border-top: 1rpx solid #f0f0f0;
}

.add-member-btn-cancel {
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

.add-member-btn-ok {
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

  &:active {
    opacity: 0.85;
  }
}

.add-member-btn-disabled {
  background: #d3e0f5;
  color: #fff;
}

.group-loading {
  text-align: center;
  padding: 60rpx;
  font-size: 26rpx;
  color: #c0c0c0;
}

/* 底部操作区（解散群聊） */
.group-action-section {
  padding: 40rpx 24rpx 60rpx;
}

.group-action-btn {
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;

  &.danger {
    background: #fa5151;

    .group-action-btn-text {
      color: #fff;
      font-size: 30rpx;
    }
  }

  &.primary {
    background: #fff;

    .group-action-btn-text {
      color: #4588fc;
      font-size: 30rpx;
    }
  }

  &:active {
    opacity: 0.7;
  }
}

/* 修改群名片弹窗 */
.rename-dialog {
  width: 620rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  margin-top: -200rpx;
  flex-direction: column;
  overflow: hidden;
}

.rename-tips {
  font-size: 26rpx;
  color: #999;
  padding: 4rpx 30rpx 20rpx;
}

.rename-input {
  margin: 0 30rpx 20rpx;
  height: 80rpx;
  background: #f5f6f8;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
}
</style>
