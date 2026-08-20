<template>
  <view class="login-page">
    <!-- ========== 返回首页按钮 ========== -->
    <view class="back-home-btn" @tap="goHome">
      <view class="back-home-arrow"></view>
    </view>

    <!-- ========== 背景装饰 ========== -->
    <view class="bg-deco bg-deco-1"></view>
    <view class="bg-deco bg-deco-2"></view>
    <view class="bg-deco bg-deco-3"></view>

    <!-- ========== 顶部品牌区 ========== -->
    <view class="brand-area">
      <view class="logo-wrap">
        <image class="logo" src="https://img2cdn.global-dsc.cn/dgzz_img/2c4a54497e379b23b5f29fc400f03a5a.jpg" mode="aspectFit" />
      </view>
      <view class="app-name">探客工兵</view>
      <view class="app-slogan">销售更轻松 · 目标更精准</view>
    </view>

    <!-- ========== 卡片登录区 ========== -->
    <view class="login-card">
      <view class="welcome-title">欢迎使用</view>
      <view class="welcome-tip">请使用您的账号登录</view>

      <!-- 账号输入框 -->
      <view class="input-item">
        <text class="input-icon">👤</text>
        <input class="input-box" type="text" v-model="account" placeholder="请输入账号" maxlength="50" />
      </view>

      <!-- 密码输入框 -->
      <view class="input-item">
        <text class="input-icon">🔒</text>
        <input class="input-box" :type="showPwd ? 'text' : 'password'" v-model="password" placeholder="请输入密码" maxlength="20" />
        <text class="pwd-eye" @tap="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</text>
      </view>

      <!-- 验证码输入框（密码错误多次后后台要求验证码才显示） -->
      <view class="input-item verify-item" v-if="verifySrc">
        <text class="input-icon">🛡</text>
        <input class="input-box" type="text" v-model="verify" placeholder="请输入验证码" maxlength="10" />
        <image class="verify-img" :src="verifySrc + '?key=' + account + '&v=' + verifyTimeStep" mode="aspectFill" @tap="refreshVerify" />
      </view>

      <!-- 账号密码登录按钮 -->
      <button class="login-btn" @tap="onLogin" :loading="loading" :disabled="loading">登 录</button>

      <!-- 服务协议 -->
      <view class="agreement">
        <view class="agreement-checkbox" :class="{ checked: hasAgreed }" @tap="hasAgreed = !hasAgreed">
          <text v-if="hasAgreed" class="checkbox-tick">✓</text>
        </view>
        <text class="agreement-text">登录即代表您同意</text>
        <text class="agreement-link">《用户协议》</text>
        <text class="agreement-text">和</text>
        <text class="agreement-link">《隐私政策》</text>
      </view>
    </view>

    <!-- ========== 产品卖点 ========== -->
    <view class="value-props">
      <view class="value-title">探客工兵 — 解决工业品销售三难</view>
      <!-- <view class="value-item">❖ 找精准目标客户难</view>
      <view class="value-item">❖ 没有联系人进门难</view>
      <view class="value-item">❖ 认识决策关键人难</view> -->
    </view>

    <!-- ========== 底部版权 ========== -->
    <view class="footer">© 2026 苏州聚深软件有限公司</view>
  </view>
</template>

<script>
import { accountLogin, getUserInfo } from '@/static/api/index.js'
import { normalizeUser } from '@/im-message/services/util.js'

export default {
  data() {
    return {
      account: '', // 账号
      password: '', // 密码
      verify: '', // 验证码（后台要求时才填）
      showPwd: false, // 是否明文显示密码
      loading: false, // 登录请求中状态
      hasAgreed: false, // 是否勾选协议
      verifySrc: '', // 验证码图片地址，空字符串表示当前不需要验证码
      verifyTimeStep: new Date().getTime() // 验证码图片刷新时间戳，拼在 url 上防缓存
    }
  },
  methods: {
    // ----------- 点击返回首页
    goHome() {
      uni.switchTab({ url: '/pages/clue/index' })
    },

    // ----------- 刷新验证码图片
    refreshVerify() {
      this.verifyTimeStep = new Date().getTime()
    },

    // ----------- 点击登录按钮
    onLogin() {
      // 未勾选协议拦截
      if (!this.hasAgreed) {
        uni.showToast({ title: '请先勾选同意用户协议', icon: 'none' })
        return
      }
      // 账号空值拦截
      if (!this.account.trim()) {
        uni.showToast({ title: '请输入账号', icon: 'none' })
        return
      }
      // 密码空值拦截
      if (!this.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return
      }
      // 需要验证码但未填拦截
      if (this.verifySrc && !this.verify) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }
      this.loading = true
      // 调用后台账号密码登录接口，type/isWechat 与 skill-chain 保持一致
      accountLogin({
        account: this.account.trim(),
        password: this.password,
        verify: this.verify,
        type: 20000,
        isWechat: 1
      }).then((res) => {
        // res.code === 0 登录成功，先存 token 再拉取用户详情
        if (res.code === 0 && res.data && res.data.token) {
          uni.setStorageSync('token', res.data.token)
          this.fetchUserInfo()
        }
      }).catch((err) => {
        // request.js 已对 code!==0 自动 toast 错误信息，这里只需判断是否需要弹出验证码
        // err 是 res.massage 字符串，包含"验证码"时显示验证码图片
        const msg = typeof err === 'string' ? err : ''
        if (msg.includes('验证码')) {
          this.verifySrc = 'https://api60.global-dsc.cn/page/verify.jpg'
          this.verifyTimeStep = new Date().getTime()
        }
      }).finally(() => {
        this.loading = false
      })
    },

    // ----------- 登录成功后拉取用户详情并跳转
    fetchUserInfo() {
      getUserInfo().then((res) => {
        // 归一化后存 storage（补大写字段别名，IM 模块需要 UserID）
        uni.setStorageSync('userInfo', normalizeUser(res.data || {}))
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          uni.switchTab({ url: '/pages/mine/index' })
        }, 600)
      }).catch(() => {
        // getUserInfo 失败时 token 已存，仍跳回我的页，mine 页 onShow 会放行
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          uni.switchTab({ url: '/pages/mine/index' })
        }, 600)
      })
    }
  }
}
</script>

<style scoped lang="scss">
// ==================== 返回首页按钮
.back-home-btn {
  position: fixed;
  top: calc(96rpx + env(safe-area-inset-top));
  left: 32rpx;
  z-index: 10;
  width: 60rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  backdrop-filter: blur(8rpx);

  .back-home-arrow {
    width: 22rpx;
    height: 22rpx;
    border-left: 5rpx solid #fff;
    border-bottom: 5rpx solid #fff;
    transform: rotate(45deg);
    margin-left: 8rpx;
  }
}

// ==================== 登录页容器
.login-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 0 48rpx;
  box-sizing: border-box;
  background: linear-gradient(160deg, #a8d8ff 0%, #4f8eff 45%, #2962ff 100%);
  overflow: hidden;
}

// ==================== 背景装饰圆
.bg-deco {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(2rpx);
}
.bg-deco-1 {
  width: 520rpx;
  height: 520rpx;
  top: -160rpx;
  right: -160rpx;
  background: rgba(255, 255, 255, 0.18);
}
.bg-deco-2 {
  width: 320rpx;
  height: 320rpx;
  top: 360rpx;
  left: -120rpx;
  background: rgba(255, 255, 255, 0.12);
}
.bg-deco-3 {
  width: 240rpx;
  height: 240rpx;
  bottom: -80rpx;
  right: -60rpx;
  background: rgba(255, 255, 255, 0.1);
}

// ==================== 顶部品牌区
.brand-area {
  position: relative;
  z-index: 2;
  padding-top: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;

  .logo-wrap {
    width: 230rpx;
    height: 230rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16rpx 40rpx rgba(41, 98, 255, 0.35);
    overflow: hidden;

    .logo {
      width: 100%;
      height: 100%;
    }
  }

  .app-name {
    margin-top: 32rpx;
    font-size: 52rpx;
    font-weight: 800;
    color: #fff;
    letter-spacing: 8rpx;
    text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
  }

  .app-slogan {
    margin-top: 14rpx;
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 4rpx;
  }
}

// ==================== 产品卖点
.value-props {
  position: relative;
  z-index: 2;
  margin-top: 78rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;

  .value-title {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    letter-spacing: 2rpx;
    text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.12);
  }

  .value-item {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 10rpx;
    letter-spacing: 2rpx;
    text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
  }
}

// ==================== 登录卡片
.login-card {
  position: relative;
  z-index: 2;
  margin-top: 60rpx;
  padding: 60rpx 48rpx;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.12);

  .welcome-title {
    font-size: 44rpx;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
  }

  .welcome-tip {
    margin-top: 14rpx;
    font-size: 26rpx;
    color: #999;
  }

  // 账号 / 密码输入框
  .input-item {
    margin-top: 36rpx;
    display: flex;
    align-items: center;
    height: 96rpx;
    padding: 0 28rpx;
    background: #f7f9fc;
    border-radius: 48rpx;
    box-sizing: border-box;
    border: 2rpx solid transparent;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

    &:focus-within {
      border-color: rgba(41, 98, 255, 0.35);
      box-shadow: 0 0 0 4rpx rgba(41, 98, 255, 0.08);
      background: #fff;
    }

    .input-icon {
      font-size: 32rpx;
      margin-right: 16rpx;
      flex-shrink: 0;
    }

    .input-box {
      flex: 1;
      height: 96rpx;
      font-size: 30rpx;
      color: #1a1a1a;
      background: transparent;
    }

    .pwd-eye {
      font-size: 32rpx;
      padding: 0 8rpx;
      flex-shrink: 0;
    }

    // 验证码图片
    .verify-img {
      width: 150rpx;
      height: 56rpx;
      margin-left: 12rpx;
      flex-shrink: 0;
      background: #f0f2f5;
      border-radius: 8rpx;
    }
  }

  // 登录按钮
  .login-btn {
    margin-top: 50rpx;
    width: 100%;
    height: 96rpx;
    border-radius: 48rpx;
    background: linear-gradient(135deg, #4f8eff 0%, #2962ff 100%);
    color: #fff;
    font-size: 32rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    box-shadow: 0 12rpx 28rpx rgba(41, 98, 255, 0.35);

    &::after {
      border: none;
    }

    &[disabled] {
      opacity: 0.7;
      color: #fff;
      background: linear-gradient(135deg, #4f8eff 0%, #2962ff 100%);
    }
  }

  // 服务协议
  .agreement {
    margin-top: 46rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    font-size: 24rpx;
    line-height: 1.5;

    .agreement-checkbox {
      width: 26rpx;
      height: 26rpx;
      margin-right: 8rpx;
      border: 2rpx solid #999;
      border-radius: 6rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;

      &.checked {
        background: #2962ff;
        border-color: #2962ff;
      }

      .checkbox-tick {
        color: #fff;
        font-size: 22rpx;
        font-weight: bold;
      }
    }

    .agreement-text {
      color: #999;
    }
    .agreement-link {
      color: #2962ff;
    }
  }
}

// ==================== 底部版权
.footer {
  position: absolute;
  bottom: 50rpx;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 2rpx;
  z-index: 2;
}
</style>
