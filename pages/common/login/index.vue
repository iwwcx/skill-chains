<template>
  <view class="login-page">
    <!-- ========== 返回首页按钮 ========== -->
    <view class="back-home-btn" @tap="goHome">
      <view class="back-home-arrow"></view>
    </view>

    <!-- ========== 顶部品牌区：左对齐 editorial ========== -->
    <view class="brand-area">
      <view class="logo-wrap">
        <image class="logo" src="https://img2cdn.global-dsc.cn/dgzz_img/2c4a54497e379b23b5f29fc400f03a5a.jpg" mode="aspectFit" />
      </view>
      <view class="app-name">工品链</view>
      <view class="app-slogan">工品上码 · 码上获客</view>
    </view>

    <!-- ========== 登录表单区：下划线式输入 ========== -->
    <view class="login-form">
      <view class="welcome-title">欢迎使用</view>
      <view class="welcome-tip">请使用您的账号登录</view>

      <!-- 账号输入框 -->
      <view class="input-item">
        <text class="input-label">账号</text>
        <input class="input-box" type="text" v-model="account" placeholder="请输入账号" maxlength="50" />
      </view>

      <!-- 密码输入框 -->
      <view class="input-item">
        <text class="input-label">密码</text>
        <input class="input-box" :type="showPwd ? 'text' : 'password'" v-model="password" placeholder="请输入密码" maxlength="20" />
        <text class="pwd-eye" @tap="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</text>
      </view>

      <!-- 验证码输入框（密码错误多次后后台要求验证码才显示） -->
      <view class="input-item verify-item" v-if="verifySrc">
        <text class="input-label">验证码</text>
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
      <view class="value-title">工品链 — 让每个工业品都成为获客入口</view>
      <!-- <view class="value-item">❖ 找精准目标客户难</view>
      <view class="value-item">❖ 没有联系人进门难</view>
      <view class="value-item">❖ 认识决策关键人难</view> -->
    </view>

    <!-- ========== 底部版权 ========== -->
    <view class="footer">© 2026 杭州玖开科技有限公司</view>
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
// ----------- 「线索账本」editorial 色板（与全站一致）
$paper: #f4f6fa; // 页面底色（冷调浅蓝灰）
$ink: #191c22; // 主文字
$t2: #6b7079; // 次文字
$t3: #a6abb4; // 弱文字
$line: rgba(25, 28, 34, 0.08); // 发丝线
$blue: #146ff6; // 品牌主色

// ==================== 返回首页按钮（纸白底上用墨箭头）
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

  .back-home-arrow {
    width: 22rpx;
    height: 22rpx;
    border-left: 5rpx solid $ink;
    border-bottom: 5rpx solid $ink;
    transform: rotate(45deg);
    margin-left: 8rpx;
  }
}

// ==================== 登录页容器：浅蓝渐变顶落到冷灰底
.login-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 0 56rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #e0ecfd 0%, $paper 42%);
  overflow: hidden;
}

// ==================== 顶部品牌区：左对齐 editorial
.brand-area {
  padding-top: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .logo-wrap {
    width: 120rpx;
    height: 120rpx;
    border-radius: 28rpx;
    box-shadow: 0 12rpx 28rpx rgba(20, 111, 246, 0.18);
    overflow: hidden;

    .logo {
      width: 100%;
      height: 100%;
    }
  }

  .app-name {
    margin-top: 36rpx;
    font-size: 64rpx;
    font-weight: 800;
    color: $ink;
    letter-spacing: 10rpx;
  }

  .app-slogan {
    margin-top: 18rpx;
    font-size: 24rpx;
    color: $t3;
    letter-spacing: 6rpx;
  }
}

// ==================== 产品卖点
.value-props {
  margin-top: 64rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14rpx;

  .value-title {
    font-size: 23rpx;
    color: $t3;
    letter-spacing: 3rpx;
  }

  .value-item {
    font-size: 28rpx;
    color: $t2;
    margin-top: 10rpx;
    letter-spacing: 2rpx;
  }
}

// ==================== 登录表单：下划线式输入
.login-form {
  margin-top: 72rpx;

  .welcome-title {
    font-size: 40rpx;
    font-weight: 700;
    color: $ink;
    line-height: 1.2;
    letter-spacing: 3rpx;
  }

  .welcome-tip {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: $t3;
  }

  // 账号 / 密码输入框：左侧标签 + 底部发丝线，聚焦线变蓝
  .input-item {
    margin-top: 44rpx;
    display: flex;
    align-items: center;
    height: 88rpx;
    border-bottom: 1rpx solid rgba(25, 28, 34, 0.16);
    box-sizing: border-box;
    transition: border-color 0.2s;

    &:focus-within {
      border-bottom: 2rpx solid $blue;
    }

    .input-label {
      width: 96rpx;
      flex-shrink: 0;
      font-size: 28rpx;
      font-weight: 600;
      color: $ink;
      letter-spacing: 2rpx;
    }

    .input-box {
      flex: 1;
      height: 88rpx;
      font-size: 30rpx;
      color: $ink;
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

  // 登录按钮：品牌蓝实心胶囊
  .login-btn {
    margin-top: 72rpx;
    width: 100%;
    height: 96rpx;
    border-radius: 999rpx;
    background: $blue;
    color: #fff;
    font-size: 32rpx;
    font-weight: 600;
    letter-spacing: 10rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    box-shadow: 0 12rpx 28rpx rgba(20, 111, 246, 0.3);

    &::after {
      border: none;
    }

    &[disabled] {
      opacity: 0.7;
      color: #fff;
      background: $blue;
    }
  }

  // 服务协议
  .agreement {
    margin-top: 48rpx;
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
      border: 2rpx solid $t3;
      border-radius: 6rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;

      &.checked {
        background: $blue;
        border-color: $blue;
      }

      .checkbox-tick {
        color: #fff;
        font-size: 22rpx;
        font-weight: bold;
      }
    }

    .agreement-text {
      color: $t3;
    }
    .agreement-link {
      color: $blue;
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
  font-size: 22rpx;
  color: $t3;
  letter-spacing: 3rpx;
}
</style>
