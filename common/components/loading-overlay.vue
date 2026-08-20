<!-- 首页天蓝色加载中的loading组件 -->
<template>
  <view v-if="visible" class="loading-overlay">
    <view class="loading-content">
      <view class="loading-spinner">
        <view class="spinner-ring"></view>
        <view class="spinner-inner"></view>
        <view class="spinner-dot"></view>
      </view>
      <text class="loading-text">{{ text }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'loading-overlay',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: '正在加载...'
    }
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(214, 206, 206, 0.3);
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
}

.loading-spinner {
  position: relative;
  width: 120rpx;
  height: 120rpx;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  border: 6rpx solid transparent;
  border-top-color: #4facfe;
  border-right-color: #00f2fe;
  animation: spin 1.2s linear infinite;
}

.spinner-inner {
  position: absolute;
  top: 15rpx;
  left: 15rpx;
  right: 15rpx;
  bottom: 15rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  border-bottom-color: rgba(9, 98, 177, 0.5);
  border-left-color: rgba(14, 88, 255, 0.5);
  animation: spin-rev 0.8s linear infinite;
}

.spinner-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20rpx;
  height: 20rpx;
  margin-left: -10rpx;
  margin-top: -10rpx;
  background: linear-gradient(135deg, #4facfe, #839798);
  border-radius: 50%;
  box-shadow: 0 0 20rpx rgba(79, 172, 254, 0.6);
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text {
  color: #655858;
  font-size: 32rpx;
  font-weight: 500;
  letter-spacing: 4rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  animation: breathe 2s ease-in-out infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spin-rev {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
