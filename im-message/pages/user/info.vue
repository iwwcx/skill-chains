<template>
  <view class="user-info-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap">
      <view class="loading-dots">
        <view class="dot dot-1"></view>
        <view class="dot dot-2"></view>
        <view class="dot dot-3"></view>
      </view>
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 头部卡片 -->
      <view class="header-card">
        <view class="header-bg">
          <view class="bg-blob bg-blob-1"></view>
          <view class="bg-blob bg-blob-2"></view>
          <view class="bg-blob bg-blob-3"></view>
          <view class="bg-noise"></view>
        </view>
        <view class="header-content">
          <image class="user-avatar" :src="avatarUrl" mode="aspectFill" @error="avatarError = true" />
          <text class="user-name">{{ userInfo.FriendRemark || userInfo.ViewName || userInfo.UserName || userInfo.NickName || userName || '未知用户' }}</text>
          <text v-if="userInfo.Signature" class="user-signature">{{ userInfo.Signature }}</text>
          <view v-if="userInfo.CompName" class="user-company-tag">
            <text class="company-icon">🏢</text>
            <text class="company-text">{{ userInfo.CompName }}</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="section-title">基本信息</view>
      <view class="info-section">
        <view class="info-item" v-if="userInfo.Mdt">
          <view class="item-left">
            <text class="item-icon">🔖</text>
            <text class="info-label">账号</text>
          </view>
          <text class="info-value">{{ userInfo.Mdt }}</text>
        </view>
        <view class="info-item" v-if="userInfo.NickName">
          <view class="item-left">
            <text class="item-icon">😊</text>
            <text class="info-label">昵称</text>
          </view>
          <text class="info-value">{{ userInfo.NickName }}</text>
        </view>
        <view class="info-item" v-if="userInfo.UserName">
          <view class="item-left">
            <text class="item-icon">👤</text>
            <text class="info-label">姓名</text>
          </view>
          <text class="info-value">{{ userInfo.UserName }}</text>
        </view>
        <view class="info-item" v-if="userInfo.UserSex">
          <view class="item-left">
            <text class="item-icon">{{ userInfo.UserSex == 2 ? '♀️' : '♂️' }}</text>
            <text class="info-label">性别</text>
          </view>
          <text class="info-value">{{ userInfo.UserSex == 2 ? '女' : '男' }}</text>
        </view>
        <view class="info-item" v-if="userInfo.Phone">
          <view class="item-left">
            <text class="item-icon">📱</text>
            <text class="info-label">手机</text>
          </view>
          <text class="info-value">{{ userInfo.Phone }}</text>
        </view>
        <view class="info-item" v-if="userInfo.CompName">
          <view class="item-left">
            <text class="item-icon">🏢</text>
            <text class="info-label">企业</text>
          </view>
          <text class="info-value info-value-link" @tap="goEnterpriseDetail">{{ userInfo.CompName }}</text>
        </view>
        <view class="info-item" v-if="userInfo.OrgName">
          <view class="item-left">
            <text class="item-icon">📂</text>
            <text class="info-label">部门</text>
          </view>
          <text class="info-value">{{ userInfo.OrgName }}</text>
        </view>
        <view class="info-item" v-if="userInfo.OrgDuty">
          <view class="item-left">
            <text class="item-icon">💼</text>
            <text class="info-label">职务</text>
          </view>
          <text class="info-value">{{ userInfo.OrgDuty }}</text>
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="section-title" v-if="userInfo.EMail">联系方式</view>
      <view class="info-section" v-if="userInfo.EMail">
        <view class="info-item" v-if="userInfo.EMail">
          <view class="item-left">
            <text class="item-icon">📬</text>
            <text class="info-label">邮箱</text>
          </view>
          <text class="info-value">{{ userInfo.EMail }}</text>
        </view>
      </view>

      <!-- 地址信息 -->
      <view class="section-title" v-if="userInfo.Province || userInfo.City || userInfo.District || userInfo.Address">地址信息</view>
      <view class="info-section" v-if="userInfo.Province || userInfo.City || userInfo.District || userInfo.Address">
        <view class="info-item" v-if="userInfo.Province || userInfo.City || userInfo.District">
          <view class="item-left">
            <text class="item-icon">📍</text>
            <text class="info-label">地区</text>
          </view>
          <text class="info-value">{{ userInfo.Province }}{{ userInfo.City }}{{ userInfo.District }}</text>
        </view>
        <view class="info-item" v-if="userInfo.Address">
          <view class="item-left">
            <text class="item-icon">🏠</text>
            <text class="info-label">详细地址</text>
          </view>
          <text class="info-value">{{ userInfo.Address }}</text>
        </view>
      </view>
      <!-- 企业信息 -->
      <template v-if="companyInfo && companyInfo.compId">
        <view class="section-title">企业信息</view>
        <view class="info-section company-section">
          <!-- 企业数据统计 -->
          <!-- <view class="company-stats" v-if="companyInfo.saleNums || companyInfo.viewNums || companyInfo.downNums">
            <view class="stat-item" v-if="companyInfo.saleNums">
              <text class="stat-num">{{ companyInfo.saleNums }}</text>
              <text class="stat-label">销售数</text>
            </view>
            <view class="stat-divider" v-if="companyInfo.saleNums && companyInfo.viewNums"></view>
            <view class="stat-item" v-if="companyInfo.viewNums">
              <text class="stat-num">{{ companyInfo.viewNums }}</text>
              <text class="stat-label">浏览数</text>
            </view>
            <view class="stat-divider" v-if="companyInfo.viewNums && companyInfo.downNums"></view>
            <view class="stat-item" v-if="companyInfo.downNums">
              <text class="stat-num">{{ companyInfo.downNums }}</text>
              <text class="stat-label">下载数</text>
            </view>
          </view> -->
          <!-- 企业头部 -->
          <view class="company-header">
            <image class="company-logo" :src="companyLogoUrl" mode="aspectFill" @error="companyLogoError = true" />
            <view class="company-header-info">
              <text class="company-name" @tap="goEnterpriseDetail">{{ companyInfo.shortName || companyInfo.compName }}</text>
              <view class="company-level-tag" v-if="companyInfo.level">
                <text class="level-text">{{ companyInfo.level }}</text>
              </view>
            </view>
          </view>
          <!-- 企业详情 -->
          <view class="info-item" v-if="companyInfo.compName">
            <view class="item-left">
              <text class="item-icon">🏢</text>
              <text class="info-label">企业全称</text>
            </view>
            <text class="info-value">{{ companyInfo.compName }}</text>
          </view>
          <view class="info-item" v-if="companyInfo.mainPage">
            <view class="item-left">
              <text class="item-icon">🗞️</text>
              <text class="info-label">企业官网</text>
            </view>
            <text class="info-value info-value-link" @tap="copyWebsite">{{ companyInfo.mainPage }}</text>
          </view>
          <view class="info-item" v-if="companyInfo.compId">
            <view class="item-left">
              <text class="item-icon">📇</text>
              <text class="info-label">产品样本</text>
            </view>
            <text class="info-value" style="color: #4141ff;" @click="goProductCatalog">点击查看</text>
          </view>
          <view class="info-item" v-if="companyInfo.phone">
            <view class="item-left">
              <text class="item-icon">📱</text>
              <text class="info-label">联系方式</text>
            </view>
            <text class="info-value">{{ companyInfo.phone }}</text>
          </view>
          <view class="info-item" v-if="companyInfo.brands && companyInfo.brands.length">
            <view class="item-left">
              <text class="item-icon">🏷️</text>
              <text class="info-label">品牌</text>
            </view>
            <text class="info-value">{{ companyInfo.brands.join('、') }}</text>
          </view>
          <view class="info-item product-item" v-if="companyInfo.mainProduct">
            <view class="item-left">
              <text class="item-icon">📦</text>
              <text class="info-label">主营产品</text>
            </view>
            <text class="info-value product-text">{{ companyInfo.mainProduct }}</text>
          </view>
          <view class="info-item" v-if="companyInfo.province || companyInfo.city || companyInfo.district">
            <view class="item-left">
              <text class="item-icon">📍</text>
              <text class="info-label">所在地区</text>
            </view>
            <text class="info-value">{{ companyInfo.province }}{{ companyInfo.city }}{{ companyInfo.district }}</text>
          </view>
          <view class="info-item" v-if="companyInfo.address">
            <view class="item-left">
              <text class="item-icon">🏠</text>
              <text class="info-label">详细地址</text>
            </view>
            <text class="info-value">{{ companyInfo.address }}</text>
          </view>
          <view class="info-item" v-if="companyInfo.compMdt">
            <view class="item-left">
              <text class="item-icon">🔢</text>
              <text class="info-label">企业通号</text>
            </view>
            <text class="info-value">{{ companyInfo.compMdt }}</text>
          </view>
          <view class="info-item" v-if="companyInfo.email">
            <view class="item-left">
              <text class="item-icon">📬</text>
              <text class="info-label">企业邮箱</text>
            </view>
            <text class="info-value">{{ companyInfo.email }}</text>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<script>
import { getUserInfo, getCompanyInfo } from '../../api/index.js'
import { getProductImageUrlChat } from '@/common/utils/index.js'

export default {
  data() {
    return {
      userId: '',  // 目标用户ID
      userName: '',  // 传过来的用户名（兜底显示）
      userLogo: '',  // 传过来的头像（兜底显示）
      userInfo: {},  // 接口返回的完整用户信息
      companyInfo: {},  // 企业详细信息
      loading: false,  // 加载状态
      avatarError: false,  // 头像加载失败标记
      companyLogoError: false  // 企业logo加载失败标记
    }
  },
  computed: {
    // 头像URL：优先用接口返回的，其次传过来的，最后默认头像
    avatarUrl() {
      if (this.avatarError) return this.defaultAvatar
      const logo = this.userInfo.UserLogo || this.userLogo
      if (!logo) return this.defaultAvatar
      if (logo.startsWith('http')) return logo
      return getProductImageUrlChat(logo)
    },
    defaultAvatar() {
      return 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png'
    },
    // 企业logo URL
    companyLogoUrl() {
      if (this.companyLogoError || !this.companyInfo.compLogo) return this.defaultCompanyLogo
      const logo = this.companyInfo.compLogo
      if (logo.startsWith('http')) return logo
      return getProductImageUrlChat(logo)
    },
    defaultCompanyLogo() {
      return 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png'
    },
    // 显示名称：优先备注 > 显示名 > 姓名 > 昵称 > 通号
    displayName() {
      return this.userInfo.FriendRemark || this.userInfo.ViewName || this.userInfo.UserName || this.userInfo.NickName || this.userInfo.Mdt || this.userName || '未知用户'
    }
  },
  onLoad(options) {
    this.userId = options.userId || ''
    this.userName = decodeURIComponent(options.name || '')
    this.userLogo = decodeURIComponent(options.logo || '')
    this.loadUserInfo()
  },
  methods: {
    // ----------- 加载用户信息
    async loadUserInfo() {
      if (!this.userId) return
      this.loading = true
      try {
        const res = await getUserInfo(this.userId)
        this.userInfo = res.Data || res.data || res || {}
        // 用户信息加载完后，如果有企业ID则加载企业信息
        const compId = this.userInfo.CompID
        if (compId) this.loadCompanyInfo(compId)
      } catch (e) {
        console.error('获取用户信息失败:', e)
      } finally {
        this.loading = false
      }
    },
    // ----------- 加载企业信息
    async loadCompanyInfo(compId) {
      try {
        const res = await getCompanyInfo(compId)
        this.companyInfo = res.Data || res.data || res || {}
      } catch (e) {
        console.error('获取企业信息失败:', e)
      }
    },
    // ----------- 跳转企业深度档案页
    goEnterpriseDetail() {
      // 企业名称优先取企业信息模块的，没有则取基本信息里的 userInfo.CompName
      const compName = this.companyInfo.compName || this.companyInfo.shortName || this.userInfo.CompName || ''
      if (!compName) return
      // 企业深度档案页尚未迁移，暂用 toast 提示
      uni.showToast({ title: '企业档案功能开发中', icon: 'none' })
    },

    // ----------- 复制企业官网
    copyWebsite() {
      const url = this.companyInfo.mainPage  // 企业官网
      if (!url) return
      uni.setClipboardData({
        data: url,
        success: () => {
          uni.showToast({ title: '已复制', icon: 'success' })
        }
      })
    },
    // ----------- 跳转大国工匠小程序产品样本页
    goProductCatalog() {
      const compId = this.companyInfo.compId  // 企业ID
      if (!compId) return
      uni.navigateToMiniProgram({
        appId: 'wx795238050c6d6512',
        path: 'pagesCurrency/pages/product-list/product-list?compId=' + compId
      })
    }
  }
}
</script>

<style scoped lang="scss">
.user-info-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 30rpx;
} 

/* 头部卡片 */
.header-card {
  position: relative;
}

.header-bg {
  height: 260rpx;
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
    background: rgba(106, 17, 203, 0.4);
  }

  .bg-blob-3 {
    width: 140rpx;
    height: 140rpx;
    top: 60rpx;
    left: 300rpx;
    background: rgba(37, 117, 252, 0.3);
  }

  .bg-noise {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.03);
  }
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24rpx 40rpx;
  margin-top: -90rpx;
  position: relative;
  z-index: 1;
}

.user-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  margin-bottom: 16rpx;
  background: #fff;
}

.user-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 8rpx;
}

.user-signature {
  font-size: 24rpx;
  color: #888;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 500rpx;
}

.user-company-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 20rpx;
  background: rgba(118, 75, 162, 0.08);
  border-radius: 20rpx;
  margin-bottom: 12rpx;

  .company-icon {
    font-size: 22rpx;
  }

  .company-text {
    font-size: 24rpx;
    color: #015be2;
    font-weight: 500;
  }
}

/* 分组标题 */
.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #888;
  padding: 20rpx 30rpx 10rpx;
  margin-bottom: 20rpx;
}

/* 信息列表 */
.info-section {
  background: #fff;
  border-radius: 16rpx;
  margin: 0 20rpx 20rpx;
  overflow: hidden;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.item-icon {
  font-size: 28rpx;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #222;
  font-weight: 500;
  text-align: right;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 70rpx;
}

.info-value-link {
  color: #4141ff;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.loading-dots {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;

  .dot {
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    background: #4f8eff;
    animation: dotBounce 1.2s infinite ease-in-out;
  }

  .dot-1 { animation-delay: 0s; }
  .dot-2 { animation-delay: 0.2s; }
  .dot-3 { animation-delay: 0.4s; }
}

.loading-text {
  font-size: 26rpx;
  color: #aaa;
}

@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 企业信息模块 */
.company-section {
  .company-header {
    display: flex;
    align-items: center;
    padding: 28rpx 30rpx;
    border-bottom: 1rpx solid #f5f5f5;
    gap: 20rpx;
  }

  .company-logo {
    width: 80rpx;
    height: 80rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
    background: #f5f5f5;
  }

  .company-header-info {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  .company-name {
    font-size: 30rpx;
    font-weight: 700;
    color: #4141ff;
  }

  .company-level-tag {
    display: inline-flex;
    align-items: center;
    padding: 4rpx 16rpx;
    background: linear-gradient(135deg, #ff9a56 0%, #ff6a00 100%);
    border-radius: 8rpx;
    align-self: flex-start;

    .level-text {
      font-size: 20rpx;
      color: #fff;
      font-weight: 500;
    }
  }

  .product-item {
    align-items: flex-start;
  }

  .product-text {
    white-space: normal;
    line-height: 1.5;
    text-align: left;
  }

  .company-stats {
    display: flex;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f5f5f5;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
  }

  .stat-num {
    font-size: 32rpx;
    font-weight: 700;
    color: #2575fc;
  }

  .stat-label {
    font-size: 22rpx;
    color: #999;
  }

  .stat-divider {
    width: 1rpx;
    height: 50rpx;
    background: #f0f0f0;
  }
}
</style>
