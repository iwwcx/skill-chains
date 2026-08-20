<template>
  <view class="product-page">
    <!-- 顶部区域：Tab + 搜索 -->
    <view class="header-area">
      <!-- Tab 分段控制器 -->
      <view class="tab-bar">
        <view v-for="(tab, index) in ['企业产品', '我的收藏', '我的足迹']" :key="tab" class="tab-item" :class="{ active: activeTab === index }" @tap="switchTab(index)">
          <text class="tab-text">{{ tab }}</text>
          <view v-if="activeTab === index" class="tab-underline"></view>
        </view>
      </view>
      <!-- 搜索行 -->
      <view v-if="activeTab !== 2" class="search-row">
        <view class="search-wrap">
          <text class="search-icon">🔍</text>
          <input v-model="currentState.keyword" class="search-input" type="text" placeholder="搜索产品名称" placeholder-class="search-placeholder" confirm-type="search" @confirm="onSearch" />
          <text v-if="currentState.keyword" class="clear-icon" @tap="clearSearch">×</text>
        </view>
        <view class="search-btn" @tap="onSearch">搜索</view>
      </view>
    </view>

    <!-- 主体内容 -->
    <view class="content-wrap" :class="{ 'no-dir': activeTab === 2 }">
      <!-- 左侧分类侧栏 -->
      <scroll-view v-if="activeTab !== 2" class="dir-sidebar" scroll-y>
        <view v-for="dir in currentState.directories" :key="dir.DirID" class="dir-item" :class="{ active: String(currentState.dirId) === String(dir.DirID) }" @tap="selectDirectory(dir)">
          <text class="dir-name">{{ dir.DirName }}</text>
        </view>
      </scroll-view>

      <!-- 右侧产品列表 -->
      <scroll-view class="prod-scroll" scroll-y :lower-threshold="100" @scrolltolower="loadMore">
        <!-- 加载中 -->
        <view v-if="currentState.loading && !currentState.products.length" class="state-box">
          <view class="state-spinner"></view>
          <text class="state-text">正在加载产品</text>
        </view>
        <!-- 空状态 -->
        <view v-else-if="!currentState.products.length" class="state-box">
          <view class="empty-illustration">
            <view class="empty-box"></view>
            <view class="empty-box empty-box-small"></view>
          </view>
          <text class="state-text">暂无产品数据</text>
        </view>
        <!-- 产品网格 -->
        <view v-else class="prod-grid">
          <view v-for="item in currentState.products" :key="item.ProdID" class="prod-card" :class="{ selected: isSelected(item) }" @tap="toggleProduct(item)">
            <view class="card-img-area">
              <image v-if="item.ProdLogo" class="card-img" :src="formatProductImage(item.ProdLogo)" mode="aspectFit" />
              <view v-else class="img-placeholder"><text>📦</text></view>
              <view class="select-circle" :class="{ checked: isSelected(item) }">
                <text v-if="isSelected(item)" class="check-mark">✓</text>
              </view>
            </view>
            <view class="card-info">
              <text class="card-name">{{ plainText(item.ProdName) || '未命名产品' }}</text>
              <text v-if="item.CompName" class="card-company">{{ item.CompName }}</text>
            </view>
          </view>
          <!-- 加载更多 -->
          <view class="load-more">
            <view v-if="currentState.loading" class="loading-dots"><text></text><text></text><text></text></view>
            <text v-else class="load-text">{{ currentState.hasMore ? '上拉加载更多' : '已经到底了' }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部发送栏 -->
    <view class="bottom-bar">
      <view class="selected-area">
        <!-- 已选产品缩略图堆叠，最多显示 3 张 -->
        <view class="selected-thumbs">
          <image v-for="item in selectedProducts.slice(0, 4)" :key="item.ProdID" class="thumb-img" :src="formatProductImage(item.ProdLogo)" mode="aspectFill" />
          <view v-if="!selectedProducts.length" class="thumb-empty"><text>📦</text></view>
        </view>
        <text class="selected-label">已选 <text class="selected-num" :class="{ active: selectedProducts.length }">{{ selectedProducts.length }}</text> 件产品</text>
      </view>
      <view class="send-btn" :class="{ active: selectedProducts.length && !sending }" @tap="sendSelectedProducts">
        <text>{{ sending ? '发送中...' : '发送产品' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getCompanyProductList, getCompanyProductDirList, getCollectProductDirList, getCollectProductList, getBrowseProductList, saveRecordByClient } from '../../api/index.js'
import { formatProductImage } from '../../libs/image.js'
import { RecentService } from '../../services/recent.js'
import { IMService } from '../../services/im.js'
import { dateFormat, getUser } from '../../services/util.js'

export default {
  data() {
    return {
      interlocutorKey: '', // 当前会话标识
      categoryId: '', // 当前会话类型ID
      dataId: '', // 当前会话接收方ID
      activeTab: 0, // 当前选中的Tab
      selectedProducts: [], // 三个Tab共同选中的产品
      sending: false, // 产品消息发送状态
      productStates: [
        { keyword: '', dirId: 0, directories: [], products: [], page: 1, pageSize: 18, loading: false, hasMore: true, initialized: false },
        { keyword: '', dirId: 0, directories: [], products: [], page: 1, pageSize: 18, loading: false, hasMore: true, initialized: false },
        { keyword: '', dirId: 0, directories: [], products: [], page: 1, pageSize: 18, loading: false, hasMore: true, initialized: false }
      ] // 三个Tab各自的请求状态
    }
  },
  computed: {
    currentState() {
      return this.productStates[this.activeTab]
    }
  },
  onLoad(options) {
    this.interlocutorKey = decodeURIComponent(options.key || '')
    const keyParts = this.interlocutorKey.split(':') // 会话标识拆分结果
    this.categoryId = keyParts[0] || ''
    this.dataId = keyParts[1] || ''
    this.initializeAllTabs()
  },
  methods: {
    // ----------- 初始化三个Tab
    initializeAllTabs() {
      this.loadDirectories(0)
      this.loadDirectories(1)
      this.loadProductList(0, true)
      this.loadProductList(1, true)
      this.loadProductList(2, true)
    },

    // ----------- 切换Tab
    switchTab(index) {
      this.activeTab = index
    },

    // ----------- 获取当前企业ID
    getCompanyId() {
      const userInfo = uni.getStorageSync('userInfo') || {} // 当前登录用户信息
      return userInfo.CompID || userInfo.CompId || userInfo.compId || userInfo.CompanyID || ''
    },

    // ----------- 加载产品目录
    async loadDirectories(tabIndex) {
      const state = this.productStates[tabIndex] // 当前Tab状态
      try {
        if (tabIndex === 0) {
          const companyId = this.getCompanyId() // 当前企业ID
          const res = await getCompanyProductDirList({ dirId: 0, layer: 0, compId: companyId })
          const list = this.getResponseList(res) // 企业产品目录
          state.directories = [{ DirID: 0, DirName: '全部' }, ...this.flattenDirectories(list)]
        } else {
          const res = await getCollectProductDirList({ dirId: 0 })
          const list = this.getResponseList(res) // 收藏产品目录
          state.directories = [{ DirID: 0, DirName: '我的桌面' }, ...this.flattenDirectories(list)]
        }
      } catch (error) {
        console.error('加载产品目录失败:', error)
        state.directories = [{ DirID: 0, DirName: tabIndex === 0 ? '全部' : '我的桌面' }]
      }
    },

    // ----------- 展平目录数据
    flattenDirectories(list) {
      const result = [] // 展平后的目录
      const walk = (items) => {
        ;(items || []).forEach(item => {
          result.push(item)
          if (item.children && item.children.length) walk(item.children)
        })
      }
      walk(list)
      return result
    },

    // ----------- 加载产品列表
    async loadProductList(tabIndex, reset) {
      const state = this.productStates[tabIndex] // 当前Tab状态
      if (state.loading || (!reset && !state.hasMore)) return
      if (reset) {
        state.page = 1
        state.products = []
        state.hasMore = true
      }
      state.loading = true
      try {
        const params = { page: state.page, pageSize: state.pageSize } // 产品列表公共参数
        let res = null // 产品接口响应
        if (tabIndex === 0) {
          params.q = state.keyword.trim()
          params.sort = 1
          params.compId = this.getCompanyId()
          params.dirId = state.dirId
          res = await getCompanyProductList(params)
        } else if (tabIndex === 1) {
          params.q = state.keyword.trim()
          params.dirId = state.dirId
          res = await getCollectProductList(params)
        } else {
          res = await getBrowseProductList(params)
        }
        const list = this.getResponseList(res) // 本页产品数据
        const responseData = res && res.Data ? res.Data : {} // 接口Data层数据
        const browseHasMore = res && typeof res.HasMore === 'boolean' ? res.HasMore : responseData.HasMore // 足迹接口是否还有下一页
        state.products = reset ? list : state.products.concat(list)
        state.hasMore = tabIndex === 2 && typeof browseHasMore === 'boolean' ? browseHasMore : list.length >= state.pageSize
        state.initialized = true
      } catch (error) {
        console.error('加载产品列表失败:', error)
      } finally {
        state.loading = false
      }
    },

    // ----------- 获取接口数组数据
    getResponseList(res) {
      if (Array.isArray(res)) return res
      if (res && Array.isArray(res.List)) return res.List
      if (res && Array.isArray(res.Data)) return res.Data
      if (res && res.Data && Array.isArray(res.Data.List)) return res.Data.List
      return []
    },

    // ----------- 选择产品目录
    selectDirectory(dir) {
      if (String(this.currentState.dirId) === String(dir.DirID)) return
      this.currentState.dirId = dir.DirID
      this.loadProductList(this.activeTab, true)
    },

    // ----------- 搜索产品
    onSearch() {
      this.loadProductList(this.activeTab, true)
    },

    // ----------- 清空搜索
    clearSearch() {
      this.currentState.keyword = ''
      this.loadProductList(this.activeTab, true)
    },

    // ----------- 加载下一页
    loadMore() {
      if (this.currentState.loading || !this.currentState.hasMore) return
      this.currentState.page += 1
      this.loadProductList(this.activeTab, false)
    },

    // ----------- 判断产品是否已选
    isSelected(item) {
      return this.selectedProducts.some(product => String(product.ProdID) === String(item.ProdID))
    },

    // ----------- 选择或取消产品
    toggleProduct(item) {
      const index = this.selectedProducts.findIndex(product => String(product.ProdID) === String(item.ProdID)) // 已选产品位置
      if (index > -1) {
        this.selectedProducts.splice(index, 1)
      } else {
        this.selectedProducts.push({ ...item })
      }
    },

    // ----------- 批量发送选中产品
    async sendSelectedProducts() {
      if (!this.selectedProducts.length || this.sending) return
      if (!this.categoryId || !this.dataId) {
        uni.showToast({ title: '会话信息无效', icon: 'none' })
        return
      }
      this.sending = true
      uni.showLoading({ title: '发送中...', mask: true })
      try {
        for (let index = 0; index < this.selectedProducts.length; index += 1) {
          await this.sendProductMessage(this.selectedProducts[index])
        }
        uni.hideLoading()
        uni.showToast({ title: '发送成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (error) {
        uni.hideLoading()
        console.error('发送产品失败:', error)
        uni.showToast({ title: '发送失败，请重试', icon: 'none' })
      } finally {
        this.sending = false
      }
    },

    // ----------- 发送单条产品消息
    async sendProductMessage(product) {
      const productUrl = encodeURIComponent('https://big-engineer.global-dsc.cn/product-detail/?id=' + product.ProdID + '&version=1') // 产品详情地址
      const productName = this.plainText(product.ProdName) // 产品名称
      const title = encodeURIComponent(productName + (product.CompName ? '-' + product.CompName : '') + '-大工程师') // 产品卡片标题
      const logo = encodeURIComponent(product.ProdLogo || '') // 产品卡片图片
      const messageText = '<m_link,' + productUrl + ',' + title + ',' + logo + ',>' // 产品链接消息
      const domain = this.generateGuid() // 消息唯一标识
      // 先通过 IM SDK 实时推送，再保存到服务器，和聊天页 onSend 流程一致
      await IMService.send(String(this.dataId), messageText, domain, this.categoryId === '52')
      await saveRecordByClient({ RecvDataID: this.dataId, SessionCategoryID: this.categoryId, MsgText: messageText, Domain: domain })
      // 同步会话列表的最后一条消息
      RecentService.new_message(this.categoryId + ':' + this.dataId, {
        MsgText: messageText, // 消息文本
        MsgTime: dateFormat(new Date()), // 发送时间
        SendUserID: String((getUser() || {}).UserID || ''), // 发送者ID
        Domain: domain, // 消息唯一标识
        IsMe: true // 自己发的消息不累加未读
      })
    },

    // ----------- 格式化产品图片（调用公共方法）
    formatProductImage(value, size) {
      return formatProductImage(value, size)
    },

    // ----------- 清理产品名称HTML
    plainText(value) {
      return String(value || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    },

    // ----------- 生成消息唯一标识
    generateGuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
        const random = Math.random() * 16 | 0 // 随机数
        const value = character === 'x' ? random : (random & 0x3 | 0x8) // UUID对应位值
        return value.toString(16)
      })
    }
  }
}
</script>

<style scoped lang="scss">
$primary: #3d7eff;
$primary-deep: #2f63e8;
$ink: #1f2937;
$muted: #6b7280;
$light: #9ca3af;
$bg: #f4f6fa;
$card-bg: #ffffff;
$sidebar-bg: #eceff5;

.product-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: $bg;
}

/* ====== 顶部区域 ====== */
.header-area {
  flex-shrink: 0;
  padding: 20rpx 32rpx 24rpx;
  background: $card-bg;
  box-shadow: 0 2rpx 12rpx rgba(31, 41, 55, 0.04);
}

/* Tab 分段控制器 */
.tab-bar {
  display: flex;
  gap: 48rpx;
  padding-bottom: 4rpx;
}

.tab-item {
  position: relative;
  padding: 12rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;

  .tab-text {
    font-size: 28rpx;
    color: $muted;
    font-weight: 400;
    transition: all 0.3s ease;
  }

  .tab-underline {
    position: absolute;
    bottom: 0;
    width: 40rpx;
    height: 4rpx;
    border-radius: 2rpx;
    background: $primary;
    transition: all 0.3s ease;
  }

  &.active {
    .tab-text {
      color: $ink;
      font-weight: 600;
    }
  }

  &:active {
    opacity: 0.7;
  }
}

/* 搜索行 */
.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
}

.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 68rpx;
  padding: 0 24rpx;
  background: $bg;
  border-radius: 16rpx;

  .search-icon {
    font-size: 26rpx;
    color: $light;
  }

  .search-input {
    flex: 1;
    font-size: 26rpx;
    color: $ink;
    height: 68rpx;
    line-height: 68rpx;
  }

  .search-placeholder {
    color: $light;
    font-size: 26rpx;
  }

  .clear-icon {
    font-size: 32rpx;
    color: $light;
    line-height: 1;
    padding: 0 4rpx;
  }
}

.search-btn {
  flex-shrink: 0;
  height: 62rpx;
  line-height: 62rpx;
  padding: 0 30rpx;
  background: $primary;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
  text-align: center;
  transition: all 0.2s ease;

  &:active {
    opacity: 0.85;
    transform: scale(0.98);
  }
}

/* ====== 主体内容 ====== */
.content-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  margin-top: 16rpx;
  overflow: hidden;

  &.no-dir {
    .prod-scroll {
      width: 100%;
    }
  }
}

/* 左侧分类侧栏 */
.dir-sidebar {
  width: 196rpx;
  flex-shrink: 0;
  height: 100%;
  background: $sidebar-bg;
  padding: 12rpx 0;
  box-sizing: border-box;
}

.dir-item {
  position: relative;
  margin: 4rpx 14rpx;
  padding: 24rpx 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  .dir-name {
    font-size: 25rpx;
    color: $muted;
    line-height: 36rpx;
    text-align: center;
    transition: all 0.2s ease;
  }

  &.active {
    background: $card-bg;
    box-shadow: 0 4rpx 14rpx rgba(31, 41, 55, 0.08);

    .dir-name {
      color: $primary;
      font-weight: 600;
    }
  }

  &:active {
    opacity: 0.75;
  }
}

/* 右侧产品列表区 */
.prod-scroll {
  flex: 1;
  width: 0;
  height: 100%;
  background: $bg;
}

.prod-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 16rpx 12rpx;
  box-sizing: border-box;
}

/* 产品卡片 */
.prod-card {
  width: calc(50% - 20rpx);
  margin: 0 10rpx 20rpx;
  box-sizing: border-box;
  border-radius: 20rpx;
  overflow: hidden;
  background: $card-bg;
  box-shadow: 0 6rpx 20rpx rgba(31, 41, 55, 0.06);
  border: 2rpx solid transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.97);
  }

  &.selected {
    border-color: $primary;
    box-shadow: 0 8rpx 24rpx rgba($primary, 0.18);
  }
}

.card-img-area {
  position: relative;
  width: 100%;
  height: 220rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #f8fafd 0%, #eef2f9 100%);
}

.card-img {
  width: 100%;
  height: 100%;
  padding: 16rpx;
  box-sizing: border-box;
}

.img-placeholder {
  text {
    font-size: 52rpx;
    opacity: 0.15;
  }
}

.select-circle {
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2rpx solid rgba(31, 41, 55, 0.12);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2rpx 8rpx rgba(31, 41, 55, 0.08);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.checked {
    background: linear-gradient(135deg, #5b8cff 0%, $primary-deep 100%);
    border-color: transparent;
    transform: scale(1.1);
  }

  .check-mark {
    font-size: 22rpx;
    color: #fff;
    font-weight: 600;
  }
}

.card-info {
  padding: 18rpx 20rpx 22rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.card-name {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
  line-height: 36rpx;
  display: -webkit-box;
  overflow: hidden;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-company {
  font-size: 22rpx;
  color: $light;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 加载更多 */
.load-more {
  width: 100%;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.load-text {
  font-size: 23rpx;
  color: $light;
}

.loading-dots {
  display: flex;
  gap: 10rpx;

  text {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #5b8cff 0%, $primary-deep 100%);
    animation: dotBounce 0.8s ease-in-out infinite alternate;
  }

  text:nth-child(2) { animation-delay: 0.15s; }
  text:nth-child(3) { animation-delay: 0.3s; }
}

/* 状态占位 */
.state-box {
  height: 100%;
  min-height: 420rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;

  .state-text {
    font-size: 25rpx;
    color: $light;
  }
}

.state-spinner {
  width: 52rpx;
  height: 52rpx;
  border: 4rpx solid rgba($primary, 0.12);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.empty-illustration {
  position: relative;
  width: 110rpx;
  height: 88rpx;

  .empty-box {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 70rpx;
    height: 52rpx;
    border-radius: 10rpx;
    border: 4rpx solid rgba($primary, 0.18);
  }

  .empty-box-small {
    width: 44rpx;
    height: 32rpx;
    bottom: 44rpx;
    left: 38%;
    opacity: 0.5;
  }
}

/* ====== 底部发送栏 ====== */
.bottom-bar {
  flex-shrink: 0;
  padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: $card-bg;
  box-shadow: 0 -4rpx 24rpx rgba(31, 41, 55, 0.07);
}

.selected-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-width: 0;

  .selected-label {
    font-size: 26rpx;
    color: $muted;
    white-space: nowrap;
  }

  .selected-num {
    color: $light;
    font-weight: 600;

    &.active {
      color: $primary;
    }
  }
}

/* 已选产品缩略图堆叠 */
.selected-thumbs {
  display: flex;
  align-items: center;
  padding-left: 8rpx;

  .thumb-img {
    width: 56rpx;
    height: 56rpx;
    border-radius: 12rpx;
    border: 3rpx solid $card-bg;
    background: #f0f3f8;
    margin-left: -14rpx;
    box-shadow: 0 2rpx 8rpx rgba(31, 41, 55, 0.12);
  }

  .thumb-empty {
    width: 56rpx;
    height: 56rpx;
    margin-left: -8rpx;
    border-radius: 12rpx;
    background: #f0f3f8;
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 28rpx;
      opacity: 0.3;
    }
  }
}

.send-btn {
  width: 220rpx;
  height: 80rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: #c9d2dd;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.active {
    background: linear-gradient(135deg, #5b8cff 0%, $primary-deep 100%);
    box-shadow: 0 8rpx 20rpx rgba($primary, 0.35);
  }

  &:active {
    transform: scale(0.96);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes dotBounce {
  from { transform: translateY(0); opacity: 0.3; }
  to { transform: translateY(-6rpx); opacity: 1; }
}
</style>
