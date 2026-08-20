<template>
  <view class="inquiry-root">
    <scroll-view class="inquiry-scroll" scroll-y>
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrap">
        <view class="loading-dots">
          <view class="dot dot-1"></view>
          <view class="dot dot-2"></view>
          <view class="dot dot-3"></view>
        </view>
        <text class="loading-text">加载中...</text>
      </view>

      <template v-else-if="info">
        <!-- 头部卡片：简洁白底 -->
        <view class="header-card">
          <view class="header-content">
            <view class="header-top">
              <text class="inquiry-status-tag" :class="{ 'status-open': info.status === 1 }">{{ info.status === 1 ? '询价中' : '已结束' }}</text>
              <text class="inquiry-date">{{ info.createDate || '-' }}</text>
            </view>
            <text class="inquiry-title">{{ info.inquiryTitle || '询价单' }}</text>
          </view>
        </view>

        <!-- 询价公司 -->
        <view v-if="info.inquiryCompanyList && info.inquiryCompanyList.length" class="section-card">
          <view class="section-header"><text class="section-icon">🏭</text><text class="section-title">询价公司</text></view>
          <view class="company-list">
            <view class="company-item" v-for="comp in info.inquiryCompanyList" :key="comp.iD">
              <image v-if="comp.compLogo" class="company-logo" :src="formatCompanyLogo(comp.compLogo)" mode="aspectFill" />
              <view v-else class="company-logo company-logo-placeholder"><text>🏢</text></view>
              <view class="company-info">
                <text class="company-name">{{ comp.compName }}</text>
                <text class="company-mdt">{{ comp.compMdt }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 产品信息 -->
        <view class="section-card">
          <view class="section-header"><text class="section-icon">📦</text><text class="section-title">产品信息</text></view>
          <view class="info-list">
            <view class="info-item" v-if="info.productNameModel">
              <text class="info-label">产品名称及型号</text>
              <text class="info-value">{{ info.productNameModel }}</text>
            </view>
            <view class="info-item" v-if="info.specificationsParameters">
              <text class="info-label">规格参数</text>
              <text class="info-value">{{ info.specificationsParameters }}</text>
            </view>
            <view class="info-item" v-if="info.executionStandard">
              <text class="info-label">执行标准</text>
              <text class="info-value">{{ info.executionStandard }}</text>
            </view>
            <view class="info-item" v-if="info.estimatedPurchaseQuantity">
              <text class="info-label">预计采购数量</text>
              <text class="info-value info-value-strong">{{ info.estimatedPurchaseQuantity }}{{ info.unit ? info.unit : '' }}</text>
            </view>
          </view>
        </view>

        <!-- 交货信息 -->
        <view class="section-card">
          <view class="section-header"><text class="section-icon">🚚</text><text class="section-title">交货信息</text></view>
          <view class="info-list">
            <view class="info-item" v-if="info.requiredDeliveryTime">
              <text class="info-label">要求交货时间</text>
              <text class="info-value">{{ info.requiredDeliveryTime }}</text>
            </view>
            <view class="info-item" v-if="info.deliveryLocation">
              <text class="info-label">交货地点</text>
              <text class="info-value">{{ info.deliveryLocation }}</text>
            </view>
            <view class="info-item" v-if="info.transportRequirements">
              <text class="info-label">运输要求</text>
              <text class="info-value">{{ info.transportRequirements }}</text>
            </view>
            <view class="info-item" v-if="info.packagingRequirements">
              <text class="info-label">包装要求</text>
              <text class="info-value">{{ info.packagingRequirements }}</text>
            </view>
          </view>
        </view>

        <!-- 质量与验收 -->
        <view class="section-card">
          <view class="section-header"><text class="section-icon">✅</text><text class="section-title">质量与验收</text></view>
          <view class="info-list">
            <view class="info-item" v-if="info.qualityStandard">
              <text class="info-label">质量标准</text>
              <text class="info-value">{{ info.qualityStandard }}</text>
            </view>
            <view class="info-item" v-if="info.inspectionMethod">
              <text class="info-label">验收方式</text>
              <text class="info-value">{{ info.inspectionMethod }}</text>
            </view>
            <view class="info-item" v-if="info.needDrawingsSamples">
              <text class="info-label">需要图纸样品</text>
              <text class="info-value">{{ info.needDrawingsSamples }}</text>
            </view>
            <view class="info-item" v-if="info.otherSpecialRequirements">
              <text class="info-label">其他特殊要求</text>
              <text class="info-value">{{ info.otherSpecialRequirements }}</text>
            </view>
          </view>
        </view>

        <!-- 报价与付款 -->
        <view class="section-card">
          <view class="section-header"><text class="section-icon">💰</text><text class="section-title">报价与付款</text></view>
          <view class="info-list">
            <view class="info-item" v-if="info.paymentMethod">
              <text class="info-label">付款方式</text>
              <text class="info-value">{{ info.paymentMethod }}</text>
            </view>
            <view class="info-item" v-if="info.quotationValidityPeriod">
              <text class="info-label">报价有效期</text>
              <text class="info-value">{{ info.quotationValidityPeriod }}</text>
            </view>
          </view>
        </view>

        <!-- 联系方式 -->
        <view class="section-card">
          <view class="section-header"><text class="section-icon">📱</text><text class="section-title">联系方式</text></view>
          <view class="info-list">
            <view class="info-item" v-if="info.contactName">
              <text class="info-label">联系人</text>
              <text class="info-value">{{ info.contactName }}</text>
            </view>
            <view class="info-item" v-if="info.contactPhone">
              <text class="info-label">联系电话</text>
              <view class="info-value info-value-link-wrap">
                <text class="info-value-link">{{ info.contactPhone }}</text>
                <view class="call-btn" @tap="callPhone(info.contactPhone)"><text>拨打电话</text></view>
              </view>
            </view>
            <view class="info-item" v-if="info.email">
              <text class="info-label">邮箱</text>
              <text class="info-value">{{ info.email }}</text>
            </view>
          </view>
        </view>

        <!-- 底部留白 -->
        <view class="bottom-spacer"></view>
      </template>

      <!-- 空状态 -->
      <view v-else class="empty-wrap">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无询价详情</text>
      </view>
    </scroll-view>

    <!-- 底部操作栏：授权报价 + 我要报价 -->
    <view v-if="info" class="bottom-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
      <view class="bottom-btn bottom-btn-white" @tap="openAuthPopup">
        <text class="bottom-btn-text-blue">授权报价</text>
      </view>
      <view class="bottom-btn bottom-btn-blue" @tap="onWantQuote">
        <text class="bottom-btn-text-white">我要报价</text>
      </view>
    </view>

    <!-- 授权报价弹窗：选择需要授权的人员 -->
    <view v-if="authPopupVisible" class="auth-popup-mask" @tap="closeAuthPopup">
      <view class="auth-popup-dialog" @tap.stop="">
        <view class="auth-popup-header">
          <text class="auth-popup-title">选择需要授权的人员</text>
          <text class="auth-popup-close" @tap="closeAuthPopup">✕</text>
        </view>
        <scroll-view class="auth-popup-scroll" scroll-y>
          <view class="auth-popup-item" v-for="item in staffList" :key="item.UserID" :class="{ 'auth-popup-item-active': selectedStaff && selectedStaff.UserID === item.UserID }" @tap="selectStaff(item)">
            <view class="auth-popup-radio">
              <view v-if="selectedStaff && selectedStaff.UserID === item.UserID" class="auth-popup-radio-dot"></view>
            </view>
            <view class="auth-popup-info">
              <text class="auth-popup-name">{{ item.UserName || '-' }}</text>
              <text v-if="item.OrgDuty" class="auth-popup-duty">{{ item.OrgDuty }}</text>
            </view>
          </view>
          <view v-if="staffList.length === 0" class="auth-popup-empty">
            <text class="auth-popup-empty-text">暂无人员数据</text>
          </view>
        </scroll-view>
        <view class="auth-popup-footer">
          <view class="auth-popup-btn-cancel" @tap="closeAuthPopup">取消</view>
          <view class="auth-popup-btn-ok" :class="{ 'auth-popup-btn-disabled': !selectedStaff || authLoading }" @tap="confirmAuth">
            <text v-if="authLoading">提交中...</text>
            <text v-else>确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我要报价提示弹窗 -->
    <view v-if="quoteTipVisible" class="quote-tip-mask" @tap="closeQuoteTip">
      <view class="quote-tip-dialog" @tap.stop="">
        <view class="quote-tip-icon">💡</view>
        <text class="quote-tip-title">温馨提示</text>
        <view class="quote-tip-content">
          <text>请在 </text>
          <text class="quote-tip-highlight">大国智造客户端</text>
          <text> 询价信息中 </text>
          <text class="quote-tip-highlight">发起报价</text>
        </view>
        <view class="quote-tip-btn" @tap="closeQuoteTip">我知道了</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getInquiryInfo, getStafflistList, setInquiryOwnerUser } from '../../api/index.js'

export default {
  data() {
    return {
      statusBarHeight: 20, // 状态栏高度，自定义导航栏顶部占位
      safeAreaBottom: 0, // 安全区域底部高度，底部操作栏适配
      inquiryId: '', // 询价单ID
      info: null, // 询价详情数据
      loading: true, // 加载状态
      authPopupVisible: false, // 授权报价弹窗显示状态
      staffList: [], // 可授权人员列表
      selectedStaff: null, // 当前选中的人员
      authLoading: false, // 授权提交中状态
      quoteTipVisible: false // 我要报价提示弹窗显示状态
    }
  },
  onLoad(options) {
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 20
    this.safeAreaBottom = sysInfo.safeArea && sysInfo.safeArea.bottom ? sysInfo.screenHeight - sysInfo.safeArea.bottom : 0
    this.inquiryId = options.id || ''
    this.loadInquiryInfo()
  },
  methods: {
    // ----------- 返回上一页
    goBack() {
      uni.navigateBack()
    },

    // ----------- 加载询价详情
    async loadInquiryInfo() {
      if (!this.inquiryId) {
        this.loading = false
        return
      }
      try {
        const res = await getInquiryInfo({ id: this.inquiryId })
        this.info = (res && res.data) || null
      } catch (error) {
        console.error('加载询价详情失败:', error)
      } finally {
        this.loading = false
      }
    },

    // ----------- 拼接公司logo完整地址
    formatCompanyLogo(logo) {
      if (!logo) return ''
      if (/^https?:\/\//i.test(logo)) return logo
      return 'https://prodimg.global-dsc.cn/' + logo.replace(/^\/+/, '')
    },

    // ----------- 拨打电话
    callPhone(phone) {
      if (!phone) return
      uni.makePhoneCall({ phoneNumber: phone })
    },

    // ----------- 打开授权报价弹窗并加载人员列表
    async openAuthPopup() {
      this.authPopupVisible = true
      this.selectedStaff = null
      try {
        const res = await getStafflistList({ Page: 1, PageSize: 200, orgId: 0 })
        this.staffList = (res && res.data && res.data.List) || []
      } catch (error) {
        console.error('加载人员列表失败:', error)
        this.staffList = []
      }
    },

    // ----------- 选择需要授权的人员
    selectStaff(item) {
      this.selectedStaff = item
    },

    // ----------- 关闭授权报价弹窗
    closeAuthPopup() {
      this.authPopupVisible = false
    },

    // ----------- 确认授权报价：提交负责人
    async confirmAuth() {
      if (!this.selectedStaff || this.authLoading) return
      this.authLoading = true
      try {
        await setInquiryOwnerUser({ inquiryId: this.inquiryId, ownerUser: this.selectedStaff.UserID })
        uni.showToast({ title: '授权成功', icon: 'success' })
        this.authPopupVisible = false
      } catch (error) {
        console.error('授权报价失败:', error)
      } finally {
        this.authLoading = false
      }
    },

    // ----------- 我要报价按钮：弹出提示
    onWantQuote() {
      this.quoteTipVisible = true
    },

    // ----------- 关闭我要报价提示弹窗
    closeQuoteTip() {
      this.quoteTipVisible = false
    }
  }
}
</script>

<style lang="scss" scoped>
.inquiry-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
}

/* 自定义导航栏 */
.inquiry-navbar {
  background: #fff;
  flex-shrink: 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);

  .inquiry-navbar-inner {
    position: relative;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inquiry-navbar-back {
    position: absolute;
    left: 12rpx;
    top: 0;
    width: 80rpx;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inquiry-navbar-back-arrow {
    width: 20rpx;
    height: 20rpx;
    border-left: 4rpx solid #1a1a1a;
    border-bottom: 4rpx solid #1a1a1a;
    transform: rotate(45deg);
  }

  .inquiry-navbar-title {
    font-size: 34rpx;
    color: #1a1a1a;
    font-weight: 600;
  }
}

/* 滚动区域 */
.inquiry-scroll {
  flex: 1;
  min-height: 0;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;

  .loading-dots {
    display: flex;
    gap: 12rpx;
    margin-bottom: 20rpx;

    .dot {
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background: #2563eb;
      animation: dot-bounce 1.2s infinite ease-in-out;
    }

    .dot-2 { animation-delay: 0.2s; }
    .dot-3 { animation-delay: 0.4s; }
  }

  .loading-text {
    font-size: 28rpx;
    color: #8c8c8c;
  }
}

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.6; }
  40% { transform: scale(1); opacity: 1; }
}

/* 头部卡片 */
.header-card {
  margin: 24rpx 24rpx 0;
  padding: 36rpx 32rpx 32rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

  .header-content {
    display: flex;
    flex-direction: column;
    gap: 20rpx;

    .header-top {
      display: flex;
      align-items: center;
      gap: 16rpx;
    }

    .inquiry-status-tag {
      font-size: 26rpx;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 6rpx 20rpx;
      border-radius: 20rpx;

      &.status-open {
        color: #2563eb;
        background: #e8f2ff;
        border: 2rpx solid #ceddff;
      }
    }

    .inquiry-date {
      margin-left: 10rpx;
      font-size: 26rpx;
      color: #7e91ad;
    }

    .inquiry-title {
      font-size: 40rpx;
      color: #1a1a1a;
      font-weight: 700;
      line-height: 56rpx;
      letter-spacing: 1rpx;
    }
  }
}

/* 分区卡片 */
.section-card {
  margin: 24rpx 24rpx 0;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

  .section-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 28rpx 28rpx 20rpx;
    border-bottom: 1rpx solid #f5f6f8;

    .section-icon {
      font-size: 32rpx;
    }

    .section-title {
      font-size: 30rpx;
      color: #1a1a1a;
      font-weight: 600;
    }
  }
}

/* 询价公司列表 */
.company-list {
  .company-item {
    display: flex;
    align-items: center;
    padding: 24rpx 28rpx;

    .company-logo {
      width: 76rpx;
      height: 76rpx;
      border-radius: 14rpx;
      flex-shrink: 0;
      margin-right: 20rpx;
      background: #f4f5f7;
    }

    .company-logo-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;

      text {
        font-size: 36rpx;
      }
    }

    .company-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8rpx;

      .company-name {
        font-size: 30rpx;
        color: #1a1a1a;
        font-weight: 500;
      }

      .company-mdt {
        font-size: 24rpx;
        color: #8c8c8c;
      }
    }
  }
}

/* 信息列表 */
.info-list {
  .info-item {
    display: flex;
    align-items: center;
    padding: 28rpx;
    border-bottom: 1rpx solid #f5f6f8;

    &:last-child {
      border-bottom: none;
    }

    .info-label {
      width: 220rpx;
      flex-shrink: 0;
      font-size: 28rpx;
      color: #8c8c8c;
    }

    .info-value {
      flex: 1;
      min-width: 0;
      font-size: 28rpx;
      color: #333;
      line-height: 42rpx;
    }

    .info-value-strong {
      color: #2563eb;
      font-weight: 600;
    }

    .info-value-link {
      color: #2563eb;
    }

    .info-value-link-wrap {
      display: flex;
      align-items: center;
      gap: 12rpx;
    }

    .call-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20rpx;
      height: 44rpx;
      border-radius: 22rpx;
      background: linear-gradient(135deg, #2563eb, #6366f1);
      font-size: 22rpx;
      color: #fff;
      margin-left: 6rpx;
    }
  }
}

/* 底部留白 */
.bottom-spacer {
  height: 40rpx;
}

/* 底部操作栏 */
.bottom-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-top: 1rpx solid rgba(0, 0, 0, 0.06);
  padding: 16rpx 32rpx;

  .bottom-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88rpx;
    border-radius: 44rpx;
    font-size: 32rpx;
    font-weight: 600;
  }

  .bottom-btn-white {
    background: #fff;
    border: 2rpx solid #2563eb;

    .bottom-btn-text-blue {
      color: #2563eb;
    }
  }

  .bottom-btn-blue {
    background: linear-gradient(135deg, #2563eb, #6366f1);
    box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.3);

    .bottom-btn-text-white {
      color: #fff;
    }
  }
}

/* 授权报价弹窗 */
.auth-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;

  .auth-popup-dialog {
    width: 100%;
    height: 70vh;
    background: #fff;
    border-radius: 24rpx;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .auth-popup-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 32rpx;
    border-bottom: 1rpx solid #f5f6f8;

    .auth-popup-title {
      font-size: 32rpx;
      color: #1a1a1a;
      font-weight: 600;
    }

    .auth-popup-close {
      font-size: 36rpx;
      color: #8c8c8c;
      padding: 8rpx 16rpx;
    }
  }

  .auth-popup-scroll {
    height: calc(70vh - 262rpx);
    padding: 16rpx 0;

    .auth-popup-item {
      display: flex;
      align-items: center;
      gap: 20rpx;
      padding: 24rpx 32rpx;
      margin: 0 16rpx;
      border-radius: 12rpx;

      &.auth-popup-item-active {
        background: #eff6ff;
      }

      .auth-popup-radio {
        width: 36rpx;
        height: 36rpx;
        border-radius: 50%;
        border: 2rpx solid #d9d9d9;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .auth-popup-radio-dot {
          width: 20rpx;
          height: 20rpx;
          border-radius: 50%;
          background: #2563eb;
        }
      }

      .auth-popup-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8rpx;

        .auth-popup-name {
          font-size: 30rpx;
          color: #1a1a1a;
        }

        .auth-popup-duty {
          font-size: 24rpx;
          color: #8c8c8c;
        }
      }
    }

    .auth-popup-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 80rpx 0;

      .auth-popup-empty-text {
        font-size: 28rpx;
        color: #8c8c8c;
      }
    }
  }

  .auth-popup-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 24rpx;
    padding: 20rpx 32rpx 32rpx;
    border-top: 1rpx solid #f5f6f8;

    .auth-popup-btn-cancel {
      width: 240rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 70rpx;
      border-radius: 35rpx;
      background: #f5f6f8;
      font-size: 30rpx;
      color: #666;
    }

    .auth-popup-btn-ok {
      width: 240rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 70rpx;
      border-radius: 35rpx;
      background: linear-gradient(135deg, #2563eb, #6366f1);
      font-size: 30rpx;
      color: #fff;
      font-weight: 600;

      &.auth-popup-btn-disabled {
        opacity: 0.5;
      }
    }
  }
}

/* 我要报价提示弹窗 */
.quote-tip-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx;

  .quote-tip-dialog {
    width: 100%;
    background: #fff;
    border-radius: 28rpx;
    padding: 48rpx 40rpx 36rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 24rpx 80rpx rgba(15, 23, 42, 0.25);
    animation: quote-tip-pop 0.25s ease;
  }

  @keyframes quote-tip-pop {
    from { transform: scale(0.85); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .quote-tip-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    margin-bottom: 24rpx;
  }

  .quote-tip-title {
    font-size: 32rpx;
    color: #1a1a1a;
    font-weight: 600;
    margin-bottom: 20rpx;
  }

  .quote-tip-content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    color: #64748b;
    line-height: 44rpx;
    margin-bottom: 36rpx;

    .quote-tip-highlight {
      color: #ef4444;
      font-weight: 600;
      margin: 0 6rpx;
    }
  }

  .quote-tip-btn {
    width: 100%;
    height: 80rpx;
    border-radius: 40rpx;
    background: linear-gradient(135deg, #2563eb, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.35);
  }
}

/* 空状态 */
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 240rpx;
  gap: 20rpx;

  .empty-icon {
    font-size: 80rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: #8c8c8c;
  }
}
</style>
