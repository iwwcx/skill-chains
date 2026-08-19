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
      <!-- <view class="welcome-tip">登录后开启您的探客之旅</view> -->

      <!-- 一键登录按钮（微信获取手机号） -->
      <button
        class="login-btn"
        :class="{ disabled: !hasAgreedAuth }"
        open-type="getPhoneNumber"
        @getphonenumber="onGetPhoneNumber"
        :loading="loading"
        :disabled="loading"
      >
        <text class="login-btn-icon">📱</text>
        <text class="login-btn-text">手机号一键快捷登录</text>
      </button>

      <!-- 服务协议 -->
      <view class="agreement">
        <view class="agreement-checkbox" :class="{ checked: hasAgreedAuth }" @tap="toggleAgreeAuth">
          <text v-if="hasAgreedAuth" class="checkbox-tick">✓</text>
        </view>
        <text class="agreement-text">登录即代表您同意</text>
        <text class="agreement-link" @tap.stop="openAuthModal">《用户协议》</text>
        <text class="agreement-text">和</text>
        <text class="agreement-link" @tap.stop="openAuthModal">《隐私政策》</text>
      </view>
    </view>

    <!-- ========== 产品卖点 ========== -->
    <view class="value-props">
      <view class="value-title">探客工兵 — 解决工业品销售三难</view>
      <view class="value-item">❖ 找精准目标客户难</view>
      <view class="value-item">❖ 没有联系人进门难</view>
      <view class="value-item">❖ 认识决策关键人难</view>
    </view>

    <!-- ========== 底部版权 ========== -->
    <view class="footer">© 2026 苏州聚深软件有限公司</view>

    <!-- ========== 多账号选择弹窗 ========== -->
    <view class="account-mask" v-if="showAccountPicker" @tap="closeAccountPicker">
      <view class="account-panel" @tap.stop>
        <view class="panel-header">
          <text class="panel-title">选择登录账号</text>
          <text class="panel-sub">该手机号下有多个账号，请选择一个登录</text>
        </view>
        <scroll-view class="account-scroll" scroll-y>
          <view
            class="account-item"
            v-for="(item, index) in accountList"
            :key="item.UserID || index"
            @tap="onSelectAccount(item)"
          >
            <image
              class="account-avatar"
              :src="item.UserLogo ? getProductImageUrlChat(item.UserLogo) : defaultAvatar"
              mode="aspectFill"
            />
            <view class="account-info">
              <view class="account-row">
                <text class="account-name">{{ showName(item) }}</text>
                <text class="account-mdt" v-if="item.UserMdt">（{{ item.UserMdt }}）</text>
                <text class="account-vip" v-if="item.MemberInfo && item.MemberInfo.isMember">VIP</text>
              </view>
              <text class="account-company" v-if="item.CompName">{{ item.CompName }}</text>
            </view>
            <text class="account-arrow">›</text>
          </view>
        </scroll-view>
        <view class="panel-cancel" @tap="closeAccountPicker">取消</view>
      </view>
    </view>

    <!-- ========== 第三方用户信息授权说明弹窗 ========== -->
    <view class="account-mask" v-if="showAuthModal">
      <view class="account-panel auth-panel" @tap.stop>
        <view class="panel-header auth-header">
          <text class="panel-title">第三方用户信息授权说明</text>
        </view>
        <scroll-view class="auth-scroll" scroll-y>
          <view class="auth-content">
            <view class="auth-p auth-bold">感谢您使用本微信小程序！</view>
            <view class="auth-p">为保障您的账号安全、实现小程序核心服务功能，在您登录及使用服务过程中，我们需依法获取并处理您的相关个人信息。请您在充分阅读并理解本说明后，自主选择是否同意授权。</view>
            <view class="auth-h">一、授权主体</view>
            <view class="auth-p">本小程序运营主体：苏州聚深软件有限公司</view>
            <view class="auth-h">二、授权获取信息范围</view>
            <view class="auth-p">1. 基础账号信息：您的微信昵称、头像、微信唯一标识（OpenID），用于账号登录、身份识别及个性化展示；</view>
            <view class="auth-p">2. 敏感个人信息：您的微信绑定手机号，用于账号验证、订单通知、服务沟通、售后对接及账号安全风控；</view>
            <view class="auth-p">3. 除上述信息外，我们不会强制收集您的性别、位置、通讯录等非必要个人信息。</view>
            <view class="auth-h">三、信息收集与使用目的</view>
            <view class="auth-p">1. 完成账号快速登录，简化注册流程，提升您的使用体验；</view>
            <view class="auth-p">2. 保障账号安全，防范账号被盗、恶意操作等风险；</view>
            <view class="auth-p">3. 为您提供订单处理、服务通知、售后咨询等核心服务；</view>
            <view class="auth-p">4. 优化小程序功能，提升服务质量，未经您允许不会用于其他无关用途。</view>
            <view class="auth-h">四、信息使用规则</view>
            <view class="auth-p">1. 我们将严格遵循合法、正当、必要、最小必要原则收集使用您的信息，仅在实现本说明所述目的范围内使用；</view>
            <view class="auth-p">2. 您的个人信息将采取加密技术存储，建立严格的数据安全保护机制，严防信息泄露、篡改、丢失；</view>
            <view class="auth-p">3. 未经您单独明确同意，我们不会向任何第三方共享、出售、转让您的个人信息；依法需配合监管部门核查的除外；</view>
            <view class="auth-p">4. 您可随时在小程序「我的」中查看、更正个人信息，或申请注销账号、撤回授权，我们将依法处理您的相关申请。</view>
            <view class="auth-h">五、授权生效与撤回</view>
            <view class="auth-p">1. 您主动点击同意授权，即表示您已充分阅读、理解并自愿同意本说明，我们将按约定获取并使用相关信息；</view>
            <view class="auth-p">2. 您可随时撤回授权，撤回后将无法正常使用需账号登录的核心功能，不影响您使用小程序无需登录的基础服务；</view>
            <view class="auth-p">3. 本说明基于相关法律法规及微信平台规则制定，如有调整，我们将通过小程序内公告形式告知，更新后的公告公示后生效。</view>
            <view class="auth-h">六、其他</view>
            <view class="auth-p">如您对本授权说明有任何疑问，可通过小程序内客服渠道联系我们咨询。</view>
            <view class="auth-p auth-company">苏州聚深软件有限公司</view>
            <view class="auth-p auth-date">日期：2026年5月20日</view>
            <view class="auth-tip-line"></view>
            <view class="auth-p">请您阅读并同意《第三方用户信息授权说明》，点击按钮主动授权，即可登录使用本小程序服务。</view>
          </view>
        </scroll-view>
        <view class="auth-actions">
          <view class="action-btn cancel" @tap="onDisagreeAuth">不同意</view>
          <view class="action-btn confirm" @tap="onAgreeAuth">同意授权</view>
        </view>
      </view>
    </view>

    <!-- ========== 邀请人手机号弹窗 ========== -->
    <view class="account-mask invite-mask" v-if="showInviteModal">
      <view class="invite-panel" @tap.stop>
        <view class="invite-deco"></view>
        <view class="invite-icon">📱</view>
        <view class="invite-header">
          <text class="invite-title">填写邀请人手机号</text>
        </view>
        <view class="invite-input-wrap">
          <!-- <text class="invite-input-icon">&#x260E;</text> -->
          <input
            class="invite-input"
            type="number"
            placeholder="请输入邀请人手机号码"
            v-model="invitePhone"
            maxlength="11"
          />
        </view>
        <view class="invite-actions">
          <view class="invite-btn skip" @tap="onSkipInvite">跳过</view>
          <view class="invite-btn confirm" @tap="onConfirmInvite">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { tankeLogin, tankeRegister, getMemberInfo, bindInvite, getInvite, bindShare } from '@/static/api/index.js'
import { getProductImageUrlChat } from '@/common/utils/index.js'
import { showName } from '@/common/utils/index.js'

export default {
  data() {
    return {
      loading: false, // 登录请求中状态
      showAccountPicker: false, // 是否显示多账号选择弹窗
      accountList: [], // 多账号列表
      defaultAvatar: 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png', // 默认头像
      phoneCode: '', // 当前一键登录获取到的手机号 code，注册时复用
      registering: false, // 注册接口请求中状态
      showAuthModal: false, // 是否显示授权说明弹窗
      hasAgreedAuth: false, // 用户是否已同意授权说明
      showInviteModal: false, // 是否显示邀请人手机号弹窗
      invitePhone: '', // 邀请人手机号
      registeredUserData: null // 注册成功后暂存的用户数据，用于邀请弹窗后登录
    }
  },
  onLoad() {
    // 进入页面不自动弹窗，需用户主动勾选协议
  },
  methods: {
    // ----------- 点击返回首页
    goHome() {
      uni.switchTab({ url: '/pages/map/index' })
    },

    // ----------- 手机号一键登录按钮回调
    onGetPhoneNumber(e) {
      // 未勾选协议时拦截
      if (!this.hasAgreedAuth) {
        uni.showToast({ title: '请先勾选同意用户协议', icon: 'none' })
        return
      }
      // 用户拒绝授权
      if (!e.detail || e.detail.errMsg !== 'getPhoneNumber:ok') {
        uni.showToast({ title: '已取消授权', icon: 'none' })
        return
      }
      // e.detail.code 是微信返回的一次性 code，用于解密手机号
      // 先检查 session 是否有效，无效则重新 login
      uni.checkSession({
        success: () => {
          // session 有效，直接用 getPhoneNumber 的 code
          this.doLogin(e.detail.code)
        },
        fail: () => {
          // session 失效，先重新 login，再用新 code
          uni.login({
            provider: 'weixin',
            success: (res) => {
              if (res.code) {
                uni.setStorageSync('wx_session_code', res.code)
              }
              this.doLogin(e.detail.code)
            },
            fail: () => {
              uni.showToast({ title: '微信登录失败', icon: 'none' })
            }
          })
        }
      })
    },

    // ----------- 调用后台登录接口
    doLogin(phoneCode) {
      this.phoneCode = phoneCode
      this.loading = true
      tankeLogin({ code: phoneCode }).then((res) => {
        const list = res.data
        // data 为 null 表示当前手机号未注册，直接使用默认公司静默注册并登录
        if (list === null || list === undefined) {
          this.doRegisterWithDefaultCompany(phoneCode)
          return
        }
        this.loading = false
        if (!list.length) {
          uni.showToast({ title: res.massage || '登录失败', icon: 'none' })
          return
        }
        uni.setStorageSync('accountList', list)

        // 只有一个账号，直接登录；多个账号弹窗让用户选
        if (list.length === 1) {
          this.applyLogin(list[0])
        } else {
          this.accountList = list
          this.showAccountPicker = true
        }
      }).catch(() => {
        this.loading = false
      })
    },

    // ----------- 调用注册接口（未注册手机号，使用默认公司静默注册并直接登录）
    doRegisterWithDefaultCompany(code) {
      this.registering = true
      tankeRegister({ code, companyName: "杭州精玖标准件有限公司" }).then((res) => {
        this.registering = false
        this.loading = false
        if (!res || !res.data) {
          uni.showToast({ title: (res && res.massage) || '注册失败', icon: 'none' })
          return
        }
        // 注册接口返回的是单个对象，按数组结构包一下复用原登录流程
        const list = [res.data]
        uni.setStorageSync('accountList', list)
        // 不弹邀请人弹窗，保存登录信息直接进入
        this.saveLoginInfo(res.data).then(() => {
          this.completeLogin()
        })
      }).catch(() => {
        this.registering = false
        this.loading = false
        uni.showToast({ title: '注册失败', icon: 'none' })
      })
    },

    // ----------- 跳过填写邀请人，直接登录
    onSkipInvite() {
      this.showInviteModal = false
      if (this.registeredUserData) {
        this.saveLoginInfo(this.registeredUserData).then(() => {
          this.completeLogin()
        })
      }
      this.invitePhone = ''
      this.registeredUserData = null
    },

    // ----------- 确认填写邀请人手机号并调用接口
    onConfirmInvite() {
      const phone = this.invitePhone.trim()
      // 未填写手机号拦截
      if (!phone) {
        uni.showToast({ title: '请输入邀请人手机号', icon: 'none' })
        return
      }
      // 校验手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return
      }
      // 先保存登录信息（写入 token，bindInvite 需要认证）
      this.saveLoginInfo(this.registeredUserData).then(() => {
        // 有填写才调接口，空值直接完成登录
        if (phone) {
          bindInvite({ invitePhone: phone }).then(() => {
            // 绑定成功后完成登录
            this.showInviteModal = false
            this.completeLogin()
            this.invitePhone = ''
            this.registeredUserData = null
          }).catch(() => {
            // 绑定失败也继续完成登录
            this.showInviteModal = false
            this.completeLogin()
            this.invitePhone = ''
            this.registeredUserData = null
          })
        } else {
          this.showInviteModal = false
          this.completeLogin()
          this.invitePhone = ''
          this.registeredUserData = null
        }
      })
    },

    // ----------- 点击账号列表中的某个账号
    onSelectAccount(item) {
      this.showAccountPicker = false
      this.applyLogin(item)
    },

    // ----------- 关闭账号选择弹窗
    closeAccountPicker() {
      this.showAccountPicker = false
    },

    // ----------- 保存登录基础信息（token、userInfo、memberInfo），供 bindInvite 等接口使用
    async saveLoginInfo(data) {
      uni.setStorageSync('token', data.Token)
      uni.setStorageSync('userInfo', data)
      uni.setStorageSync('isLoggedIn', true)
      try {
        const res = await getMemberInfo()
        uni.setStorageSync('memberInfo', res.data || {})
      } catch (e) {
        console.error('获取会员信息失败', e)
      }
      // 登录成功后检查是否有待绑定的分享关系
      const pendingShareValue = uni.getStorageSync('pendingShareValue')
      if (pendingShareValue) {
        uni.removeStorageSync('pendingShareValue')
        try {
          await bindShare({ shareValue: pendingShareValue })
        } catch (e) {
          // 绑定失败静默处理
        }
      }
      // 登录成功后检查是否有待绑定的邀请人手机号
      const pendingInvitePhone = uni.getStorageSync('pendingInvitePhone')
      if (pendingInvitePhone) {
        uni.removeStorageSync('pendingInvitePhone')
        try {
          const inviteRes = await getInvite()
          if (inviteRes && inviteRes.data && !inviteRes.data.isInvite) {
            await bindInvite({ invitePhone: pendingInvitePhone })
          }
        } catch (e) {
          // 接口异常静默处理
        }
      }
    },

    // ----------- 登录成功提示并跳转
    completeLogin() {
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/mine/index' })
      }, 600)
    },

    // ----------- 保存登录信息并跳转（供非邀请流程复用）
    async applyLogin(data) {
      await this.saveLoginInfo(data)
      // 登录后检查是否已填写邀请人，未填则弹出邀请弹窗
      try {
        const res = await getInvite()
        if (res && res.data && !res.data.isInvite) {
          this.registeredUserData = data
          this.showInviteModal = true
          return
        }
      } catch (e) {
        // 接口异常静默处理，继续完成登录
      }
      this.completeLogin()
    },

    getProductImageUrlChat,

    // ----------- 切换协议勾选状态
    toggleAgreeAuth() {
      this.hasAgreedAuth = !this.hasAgreedAuth
    },

    // ----------- 打开授权说明弹窗
    openAuthModal() {
      this.showAuthModal = true
    },

    // ----------- 关闭授权说明弹窗
    closeAuthModal() {
      this.showAuthModal = false
    },

    // ----------- 点击不同意授权
    onDisagreeAuth() {
      this.hasAgreedAuth = false // 不同意则取消勾选
      this.showAuthModal = false
    },

    // ----------- 点击同意授权
    onAgreeAuth() {
      this.hasAgreedAuth = true // 同意则勾选上
      this.showAuthModal = false
    },

    showName
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

  // 一键登录按钮
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
    gap: 12rpx;
    border: none;
    box-shadow: 0 12rpx 28rpx rgba(41, 98, 255, 0.35);

    &::after {
      border: none;
    }

    &[disabled],
    &.disabled {
      opacity: 0.7;
      color: #fff;
      background: linear-gradient(135deg, #4f8eff 0%, #2962ff 100%);
    }

    .login-btn-icon {
      font-size: 34rpx;
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

// ==================== 多账号选择弹窗
.account-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 99;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: maskFade 0.2s ease;
}

.account-panel {
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  animation: panelSlideUp 0.28s ease;
  display: flex;
  flex-direction: column;

  .panel-header {
    padding: 0 8rpx 28rpx;
    border-bottom: 1rpx solid #f0f2f5;

    .panel-title {
      display: block;
      font-size: 34rpx;
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1.3;
    }
    .panel-sub {
      display: block;
      margin-top: 14rpx;
      font-size: 26rpx;
      color: #999;
    }
  }

  .account-scroll {
    max-height: 60vh;
  }

  .account-item {
    display: flex;
    align-items: center;
    padding: 24rpx 12rpx;
    gap: 24rpx;
    border-bottom: 1rpx solid #f5f7fa;
    transition: background 0.15s;

    &:active {
      background: #f7f9fc;
    }
    &:last-child {
      border-bottom: none;
    }

    .account-avatar {
      width: 88rpx;
      height: 88rpx;
      border-radius: 50%;
      flex-shrink: 0;
      background: #f0f2f5;
    }

    .account-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4rpx;

      .account-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
      }

      .account-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #1a1a1a;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .account-mdt {
        font-size: 26rpx;
        color: #888;
        margin-left: 4rpx;
      }
      .account-vip {
        margin-left: 8rpx;
        padding: 2rpx 10rpx;
        border-radius: 6rpx;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #ffd700;
        font-size: 18rpx;
        font-weight: 700;
        border: 1rpx solid rgba(255, 215, 0, 0.4);
        letter-spacing: 1rpx;
      }
      .account-company {
        font-size: 24rpx;
        margin-top: 8rpx;
        color: #716e6e;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .account-arrow {
      font-size: 40rpx;
      color: #ccc;
      line-height: 1;
      flex-shrink: 0;
    }
  }

  .panel-cancel {
    margin-top: 24rpx;
    height: 88rpx;
    border-radius: 44rpx;
    background: #f4f6fa;
    color: #555;
    font-size: 30rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    &:active {
      background: #e8ebf0;
    }
  }
}

@keyframes maskFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes panelSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
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

// ==================== 授权说明弹窗
.auth-panel {
  .auth-header {
    text-align: center;
    padding-bottom: 24rpx;
  }

  .auth-scroll {
    max-height: 55vh;
    margin-top: 8rpx;

    .auth-content {
      padding: 0 8rpx 16rpx;

      .auth-p {
        font-size: 26rpx;
        color: #555;
        line-height: 1.7;
        margin-bottom: 12rpx;
        text-align: justify;
      }

      .auth-bold {
        font-weight: 600;
        color: #1a1a1a;
      }

      .auth-h {
        font-size: 28rpx;
        font-weight: 600;
        color: #1a1a1a;
        margin-top: 20rpx;
        margin-bottom: 8rpx;
      }

      .auth-company {
        margin-top: 16rpx;
        font-weight: 600;
        color: #333;
      }

      .auth-date {
        color: #888;
        font-size: 24rpx;
      }

      .auth-tip-line {
        height: 1rpx;
        background: #e8ebf0;
        margin: 24rpx 0;
      }

      .auth-center {
        text-align: center;
        color: #666;
        font-size: 26rpx;
        margin-bottom: 0;
      }
    }
  }

  .auth-actions {
    display: flex;
    align-items: center;
    gap: 20rpx;
    margin-top: 24rpx;
    flex-shrink: 0;

    .action-btn {
      flex: 1;
      height: 88rpx;
      line-height: 88rpx;
      border-radius: 44rpx;
      font-size: 30rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      &.cancel {
        background: #f4f6fa;
        color: #555;
      }

      &.confirm {
        background: linear-gradient(135deg, #4f8eff 0%, #2962ff 100%);
        color: #fff;
        font-weight: 600;
      }
    }
  }
}

// ==================== 邀请人手机号弹窗
.invite-mask {
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6rpx);
}

.invite-panel {
  width: 600rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 56rpx 48rpx;
  box-sizing: border-box;
  animation: inviteScale 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.18);

  .invite-deco {
    position: absolute;
    top: -100rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
    opacity: 0.6;
    filter: blur(20rpx);
  }

  .invite-icon {
    position: relative;
    z-index: 2;
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #6198ff 0%, #2962ff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 44rpx;
    box-shadow: 0 12rpx 32rpx rgba(41, 98, 255, 0.35);
    margin-bottom: 28rpx;
  }

  .invite-header {
    position: relative;
    z-index: 2;
    text-align: center;
    margin-bottom: 36rpx;

    .invite-title {
      display: block;
      font-size: 36rpx;
      font-weight: 700;
      color: #1a1a1a;
    }
    .invite-sub {
      display: block;
      margin-top: 10rpx;
      font-size: 24rpx;
      color: #999;
    }
  }

  .invite-input-wrap {
    position: relative;
    z-index: 2;
    width: 100%;
    display: flex;
    align-items: center;
    background: #f7f9fc;
    border-radius: 16rpx;
    padding: 0 20rpx;
    box-sizing: border-box;
    border: 2rpx solid transparent;
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus-within {
      border-color: rgba(41, 98, 255, 0.35);
      box-shadow: 0 0 0 4rpx rgba(41, 98, 255, 0.08);
      background: #fff;
    }

    .invite-input-icon {
      font-size: 28rpx;
      margin-right: 12rpx;
      flex-shrink: 0;
    }

    .invite-input {
      flex: 1;
      height: 96rpx;
      font-size: 30rpx;
      color: #1a1a1a;
      background: transparent;
    }
  }

  .invite-actions {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin-top: 44rpx;
    width: 100%;

    .invite-btn {
      flex: 1;
      height: 88rpx;
      border-radius: 44rpx;
      font-size: 30rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.12s, opacity 0.15s;

      &:active {
        transform: scale(0.96);
        opacity: 0.9;
      }

      &.skip {
        background: #f0f4fa;
        color: #666;
        font-weight: 500;
      }

      &.confirm {
        background: linear-gradient(135deg, #4f8eff 0%, #2962ff 100%);
        color: #fff;
        font-weight: 600;
        box-shadow: 0 12rpx 28rpx rgba(41, 98, 255, 0.32);
      }
    }
  }
}

@keyframes inviteScale {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
