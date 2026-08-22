<!-- 我的 -->
<template>
	<view class="mine-container">
		<!-- ========== 顶部档案区：居中排版 ========== -->
		<view class="profile-section">
			<view class="avatar-wrap">
				<image
					class="avatar"
					:src="avatarErr ? getAvatarUrl('', userInfo.userSex) : getAvatarUrl(userInfo.userLogo, userInfo.userSex)"
					mode="aspectFill"
					@error="avatarErr = true"
				/>
			</view>
			<view class="name-row">
				<text class="user-name">{{ userInfo.userName || '未设置' }}</text>
				<view v-if="userInfo.isManager" class="manager-badge"><text>管理员</text></view>
			</view>
			<text class="user-account">账号 {{ userInfo.userMdt || userInfo.Mdt || '—' }}</text>
			<!-- 部门 / 手机：宽字距小字横排 -->
			<view class="detail-row" v-if="userInfo.orgName || userInfo.phone">
				<text class="detail-item" v-if="userInfo.orgName">{{ userInfo.orgName }}</text>
				<view class="detail-line" v-if="userInfo.orgName && userInfo.phone"></view>
				<text class="detail-item" v-if="userInfo.phone">{{ userInfo.phone }}</text>
			</view>
		</view>

		<!-- ========== 信息列表：发丝线行式 ========== -->
		<view class="list-card">
			<!-- 当前企业 -->
			<view class="list-item" @tap="onSwitchAccount">
				<text class="item-label">当前企业</text>
				<view class="item-right">
					<text class="item-value value-blue">{{ userInfo.companyName || '未绑定' }}</text>
					<text class="item-arrow">›</text>
				</view>
			</view>
			<!-- 产品库 -->
			<view class="list-item" @tap="goProductLib">
				<text class="item-label">产品库</text>
				<view class="item-right">
					<text class="item-value">管理我的产品信息</text>
					<text class="item-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- ========== 底部操作 ========== -->
		<view class="action-area">
			<view class="action-btn btn-switch" @tap="onSwitchAccount">
				<text class="btn-text">切换账号</text>
			</view>
			<view class="btn-logout" @tap="onLogout">
				<text class="logout-text">退出登录</text>
			</view>
		</view>

		<!-- ========== 账号切换弹窗 ========== -->
		<view v-if="accountPickerVisible" class="company-mask" @tap="accountPickerVisible = false">
			<view class="company-panel" @tap.stop="">
				<view class="panel-header">
					<text class="panel-title">切换账号</text>
					<text class="panel-sub">选择要切换的企业账号</text>
				</view>
				<scroll-view class="company-scroll" scroll-y :show-scrollbar="false">
					<view
						class="company-item"
						v-for="(item, index) in accountList"
						:key="item.UserID || index"
						@tap="onSelectAccount(item)"
					>
						<image
							class="company-avatar"
							:src="getAvatarUrl(item.UserLogo || item.userLogo, item.UserSex || item.userSex)"
							mode="aspectFill"
						/>
						<view class="company-info">
							<view class="company-row">
								<text class="company-item-name">{{ item.UserName || item.userName || '未命名' }}</text>
								<text class="company-item-mdt" v-if="item.UserMdt || item.userMdt">（{{ item.UserMdt || item.userMdt }}）</text>
							</view>
							<text class="company-item-company" v-if="item.CompName || item.companyName">{{ item.CompName || item.companyName }}</text>
						</view>
						<text class="company-item-check" v-if="currentUserID === (item.UserID || item.userId)">✓</text>
						<text class="company-arrow" v-else>›</text>
					</view>
				</scroll-view>
				<view class="panel-cancel" @tap="accountPickerVisible = false">取消</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getUserInfo, getMyUsers } from '@/static/api/index.js'
import { getAvatarUrl } from '@/common/utils/index.js'

export default {
	data() {
		return {
			userInfo: {}, // 当前登录用户信息
			accountList: [], // 可切换的账号列表
			accountPickerVisible: false, // 账号切换弹窗显示
			currentUserID: '', // 当前登录用户ID
			avatarErr: false // 头像加载失败标记
		}
	},
	onShow() {
		// 未登录则跳转登录页
		const token = uni.getStorageSync('token')
		if (!token) {
			uni.redirectTo({ url: '/pages/common/login/index' })
			return
		}
		this.fetchUserInfo()
	},
	methods: {
		getAvatarUrl,
		// ----------- 拉取用户详情
		async fetchUserInfo() {
			try {
				const res = await getUserInfo()
				this.userInfo = res.data || {}
				this.currentUserID = String(this.userInfo.userId || this.userInfo.UserID || '')
			} catch (e) {
				// request 内部已统一弹 toast
			}
		},
		// ----------- 切换账号 - 调接口拿账号列表再打开弹窗
		async onSwitchAccount() {
			try {
				const res = await getMyUsers()
				if (res && res.data) {
					this.accountList = res.data
					uni.setStorageSync('accountList', res.data)
				}
			} catch (e) {
				// 接口失败时回退到缓存
				this.accountList = uni.getStorageSync('accountList') || []
			}
			this.accountPickerVisible = true
		},
		// ----------- 选择某个账号切换
		onSelectAccount(item) {
			const newUserId = String(item.UserID || item.userId || '')
			if (newUserId === this.currentUserID) {
				this.accountPickerVisible = false
				return
			}
			// 更新 storage 里的 token 和 userInfo
			uni.setStorageSync('token', item.Token || item.token)
			uni.setStorageSync('userInfo', item)
			this.accountPickerVisible = false
			uni.showToast({ title: '切换成功', icon: 'success' })
			// 重新加载页面
			setTimeout(() => {
				uni.reLaunch({ url: '/pages/mine/index' })
			}, 800)
		},
		// ----------- 退出登录
		onLogout() {
			uni.showModal({
				title: '提示',
				content: '确认退出当前登录？',
				success: (res) => {
					if (res.confirm) {
						uni.removeStorageSync('token')
						uni.removeStorageSync('userInfo')
						uni.removeStorageSync('accountList')
						uni.reLaunch({ url: '/pages/common/login/index' })
					}
				}
			})
		},
		// ----------- 产品库（跳转产品库小程序，与 skill-chain 同一个 appId）
		goProductLib() {
			const userInfo = uni.getStorageSync('userInfo') || {}
			const token = encodeURIComponent(userInfo.token || '')
			const compId = userInfo.companyId || ''
			const redirect = encodeURIComponent(`/pagesCurrency/pages/product-list/product-list?compId=${compId}`)
			uni.navigateToMiniProgram({
				appId: 'wx795238050c6d6512',
				path: `/pages/login/index?token=${token}&redirect=${redirect}`,
				envVersion: 'trial',
				success: (res) => {
					console.log('打开产品库成功', res)
				},
				fail: (err) => {
					console.log('打开产品库失败', err)
				}
			})
		}
	}
}
</script>

<style scoped lang="scss">
// ----------- 「线索账本」editorial 色板（与线索/管理页一致）
$paper: #f4f6fa; // 页面底色（冷调浅蓝灰）
$card: #ffffff; // 卡片白
$ink: #191c22; // 主文字
$t2: #6b7079; // 次文字
$t3: #a6abb4; // 弱文字
$line: rgba(25, 28, 34, 0.08); // 发丝线
$blue: #146ff6; // 品牌主色
$blue-soft: #ebf2fe; // 主色浅底
$red: #c9543f; // 低饱和赭红

// ==================== 我的页容器
.mine-container {
	width: 100%;
	min-height: 100vh;
	background: $paper;
	padding-bottom: 60rpx;
	box-sizing: border-box;
}

// ==================== 顶部档案区：居中排版
.profile-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 64rpx 36rpx 52rpx;

	// 头像：大圆 + 细白环 + 轻投影
	.avatar-wrap {
		.avatar {
			width: 148rpx;
			height: 148rpx;
			border-radius: 50%;
			background: #eceef1;
			border: 5rpx solid #fff;
			box-sizing: border-box;
			box-shadow: 0 12rpx 32rpx rgba(25, 28, 34, 0.1);
		}
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 14rpx;
		margin-top: 28rpx;

		.user-name {
			font-size: 42rpx;
			font-weight: 700;
			color: $ink;
			letter-spacing: 3rpx;
			line-height: 1.2;
		}

		// 管理员标签：蓝底小胶囊
		.manager-badge {
			padding: 6rpx 16rpx;
			border-radius: 999rpx;
			background: $blue-soft;
			font-size: 20rpx;
			font-weight: 600;
			color: $blue;
		}
	}

	.user-account {
		margin-top: 12rpx;
		font-size: 24rpx;
		color: $t3;
		letter-spacing: 1rpx;
		font-variant-numeric: tabular-nums;
	}

	// 部门 / 手机：宽字距小字，发丝竖线分隔
	.detail-row {
		display: flex;
		align-items: center;
		margin-top: 22rpx;

		.detail-item {
			font-size: 23rpx;
			color: $t2;
			letter-spacing: 1rpx;
		}
		.detail-line {
			width: 1rpx;
			height: 22rpx;
			background: $line;
			margin: 0 24rpx;
		}
	}
}

// ==================== 信息列表：白卡 + 发丝线行
.list-card {
	margin: 0 24rpx;
	background: $card;
	border-radius: 20rpx;
	padding: 4rpx 32rpx;
	box-shadow: 0 4rpx 20rpx rgba(25, 28, 34, 0.04);

	.list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 34rpx 0;
		border-bottom: 1rpx solid $line;
		transition: opacity 0.15s;

		&:last-child {
			border-bottom: none;
		}
		&:active {
			opacity: 0.6;
		}

		.item-label {
			font-size: 30rpx;
			font-weight: 600;
			color: $ink;
			letter-spacing: 1rpx;
		}

		.item-right {
			display: flex;
			align-items: center;
			gap: 10rpx;
			min-width: 0;

			.item-value {
				font-size: 26rpx;
				color: $t3;
				max-width: 380rpx;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;

				&.value-blue {
					color: $blue;
					font-weight: 500;
				}
			}
			.item-arrow {
				font-size: 36rpx;
				color: $t3;
				line-height: 1;
			}
		}
	}
}

// ==================== 底部操作：蓝实心 + 纯文字退出
.action-area {
	margin-top: 64rpx;
	padding: 0 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;

	// 切换账号：品牌蓝实心
	.action-btn {
		width: 100%;
		height: 96rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.15s;

		&:active {
			opacity: 0.85;
		}
	}

	.btn-switch {
		background: $blue;
		box-shadow: 0 12rpx 28rpx rgba(20, 111, 246, 0.28);

		.btn-text {
			font-size: 30rpx;
			font-weight: 600;
			color: #fff;
			letter-spacing: 6rpx;
		}
	}

	// 退出登录：纯文字，克制处理
	.btn-logout {
		margin-top: 40rpx;
		padding: 16rpx 32rpx;

		.logout-text {
			font-size: 26rpx;
			color: $red;
			letter-spacing: 2rpx;
		}

		&:active {
			opacity: 0.6;
		}
	}
}

// ==================== 账号切换弹窗
.company-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 99;
	background: rgba(25, 28, 34, 0.45);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	animation: maskFade 0.2s ease;
}

.company-panel {
	width: 100%;
	max-height: 80vh;
	background: #fff;
	border-radius: 32rpx 32rpx 0 0;
	padding: 44rpx 36rpx 36rpx;
	box-sizing: border-box;
	animation: panelSlideUp 0.28s ease;

	.panel-header {
		padding-bottom: 28rpx;
		border-bottom: 1rpx solid $line;

		.panel-title {
			display: block;
			font-size: 38rpx;
			font-weight: 700;
			color: $ink;
			line-height: 1.3;
			letter-spacing: 3rpx;
		}

		.panel-sub {
			display: block;
			margin-top: 10rpx;
			font-size: 24rpx;
			color: $t3;
		}
	}

	.company-scroll {
		max-height: 60vh;

		// 隐藏滚动条但保留滚动
		&::-webkit-scrollbar {
			display: none;
			width: 0 !important;
		}
	}

	.company-item {
		display: flex;
		align-items: center;
		padding: 28rpx 0;
		gap: 24rpx;
		border-bottom: 1rpx solid $line;
		transition: opacity 0.15s;

		&:active {
			opacity: 0.6;
		}

		&:last-child {
			border-bottom: none;
		}

		.company-avatar {
			width: 88rpx;
			height: 88rpx;
			border-radius: 50%;
			flex-shrink: 0;
			background: #f0f2f5;
		}

		.company-info {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
			justify-content: center;
			gap: 4rpx;

			.company-row {
				display: flex;
				align-items: center;
				flex-wrap: wrap;
			}

			.company-item-name {
				font-size: 30rpx;
				font-weight: 600;
				color: $ink;
				max-width: 100%;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.company-item-mdt {
				font-size: 24rpx;
				color: $t3;
				margin-left: 4rpx;
				font-variant-numeric: tabular-nums;
			}

			.company-item-company {
				font-size: 24rpx;
				color: $t2;
				margin-top: 8rpx;
				max-width: 100%;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}

		.company-item-check {
			font-size: 36rpx;
			color: $blue;
			flex-shrink: 0;
			line-height: 1;
		}

		.company-arrow {
			font-size: 40rpx;
			color: $t3;
			line-height: 1;
			flex-shrink: 0;
		}
	}

	.panel-cancel {
		margin-top: 28rpx;
		height: 92rpx;
		border-radius: 999rpx;
		background: #eef1f5;
		color: $t2;
		font-size: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;

		&:active {
			background: #e4e9ef;
		}
	}
}

// ==================== 弹窗动画
@keyframes maskFade {
	from { opacity: 0; }
	to { opacity: 1; }
}

@keyframes panelSlideUp {
	from { transform: translateY(100%); opacity: 0.4; }
	to { transform: translateY(0); opacity: 1; }
}
</style>
