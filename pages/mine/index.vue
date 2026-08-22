<!-- 我的 -->
<template>
	<view class="mine-container">
		<!-- ========== 顶部用户信息卡片 ========== -->
		<view class="profile-card is-vip">
			<!-- 装饰背景圆 -->
			<view class="deco-circle deco-circle-1"></view>
			<view class="deco-circle deco-circle-2"></view>
			<!-- 极光光晕层 + 对角扫光层 -->
			<view class="vip-aurora"></view>
			<view class="vip-sweep"></view>

			<!-- 用户信息行 -->
			<view class="profile-main">
				<image
					class="avatar"
					:src="avatarErr ? getAvatarUrl('', userInfo.userSex) : getAvatarUrl(userInfo.userLogo, userInfo.userSex)"
					mode="aspectFill"
					@error="avatarErr = true"
				/>
				<view class="profile-info">
					<view class="user-name-row">
						<view class="user-name">{{ userInfo.userName || '未设置' }}</view>
						<view v-if="userInfo.isManager" class="manager-badge"><text>管理员</text></view>
					</view>
					<view class="user-account">账号：{{ userInfo.userMdt || userInfo.Mdt || '—' }}</view>
				</view>
			</view>

			<!-- 详细信息行：部门、手机 -->
			<view class="detail-row">
				<view class="detail-item" v-if="userInfo.orgName">
					<text class="detail-icon">💼</text>
					<text class="detail-text">{{ userInfo.orgName }}</text>
				</view>
				<view class="detail-item" v-if="userInfo.phone">
					<text class="detail-icon">📞</text>
					<text class="detail-text">{{ userInfo.phone }}</text>
				</view>
			</view>
		</view>

		<!-- ========== 当前企业卡片 ========== -->
		<view class="company-card" @tap="onSwitchAccount">
			<view class="company-left">
				<text class="company-icon">🏢</text>
				<view class="company-text">
					<view class="company-name">当前企业：<text class="company-chip-name">{{ userInfo.companyName || '未绑定' }}</text></view>
				</view>
			</view>
		</view>

		<!-- ========== 功能菜单 ========== -->
		<view class="menu-card">
			<!-- 产品库 -->
			<view class="menu-item" @tap="goProductLib">
				<view class="menu-icon icon-blue"><text class="icon-emoji">📦</text></view>
				<view class="menu-content">
					<view class="menu-title">产品库</view>
					<view class="menu-desc">管理我的产品信息</view>
				</view>
				<text class="menu-arrow">›</text>
			</view>
		</view>

		<!-- ========== 底部操作按钮 ========== -->
		<view class="action-row">
			<view class="action-btn btn-switch" @tap="onSwitchAccount">
				<text class="btn-text">切换账号</text>
			</view>
			<view class="action-btn btn-logout" @tap="onLogout">
				<text class="btn-text">退出登录</text>
			</view>
		</view>

		<!-- ========== 账号切换弹窗 ========== -->
		<view v-if="accountPickerVisible" class="company-mask" @tap="accountPickerVisible = false">
			<view class="company-panel" @tap.stop="">
				<view class="panel-header">
					<text class="panel-title">切换账号</text>
					<text class="panel-sub">选择要切换的企业账号</text>
				</view>
				<scroll-view class="company-scroll" scroll-y>
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
// ==================== 我的页容器
.mine-container {
	width: 100%;
	min-height: 100vh;
	background: #f4f6fa;
	padding: 20rpx 0 60rpx 0;
	box-sizing: border-box;
}

// ==================== 顶部用户信息卡片
.profile-card {
	position: relative;
	margin: 0 24rpx;
	padding: 40rpx 36rpx 32rpx;
	border-radius: 24rpx;
	overflow: hidden;
	color: #fff;
	transition: all 0.3s ease;

	// 会员：深紫金渐变，加金色边框与光泽
	&.is-vip {
		background: linear-gradient(135deg, #2a2350 0%, #4a3a8a 45%, #6c4fb8 100%);
		box-shadow: 0 14rpx 36rpx rgba(60, 40, 120, 0.45),
					inset 0 0 60rpx rgba(255, 215, 130, 0.08);
		border: 1rpx solid rgba(255, 215, 130, 0.4);

		// 顶部金色高光条
		&::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 2rpx;
			background: linear-gradient(90deg,
				transparent 0%,
				rgba(255, 215, 130, 0.85) 50%,
				transparent 100%);
			z-index: 3;
		}
	}

	// 背景装饰圆（会员用金色光晕）
	.deco-circle {
		position: absolute;
		border-radius: 50%;
		background: radial-gradient(circle,
			rgba(255, 215, 130, 0.28) 0%,
			rgba(255, 215, 130, 0) 70%);
		pointer-events: none;
	}

	// 极光光晕层：缓慢旋转的多彩径向光，让深紫底色更通透
	.vip-aurora {
		position: absolute;
		top: -40%;
		left: -20%;
		width: 140%;
		height: 180%;
		background:
			radial-gradient(circle at 30% 30%, rgba(255, 200, 120, 0.32) 0%, transparent 35%),
			radial-gradient(circle at 70% 60%, rgba(180, 130, 255, 0.30) 0%, transparent 40%),
			radial-gradient(circle at 50% 80%, rgba(120, 180, 255, 0.22) 0%, transparent 38%);
		filter: blur(20rpx);
		pointer-events: none;
		z-index: 1;
		animation: vipAurora 12s linear infinite;
	}

	// 对角扫光层：周期性掠过整张卡片
	.vip-sweep {
		position: absolute;
		top: -50%;
		left: -50%;
		width: 60%;
		height: 200%;
		background: linear-gradient(115deg,
			transparent 0%,
			rgba(255, 235, 180, 0.18) 45%,
			rgba(255, 255, 255, 0.32) 50%,
			rgba(255, 235, 180, 0.18) 55%,
			transparent 100%);
		transform: rotate(8deg);
		pointer-events: none;
		z-index: 1;
		animation: vipSweep 5s ease-in-out infinite;
	}

	.deco-circle-1 {
		width: 280rpx;
		height: 280rpx;
		top: -100rpx;
		right: -80rpx;
	}

	.deco-circle-2 {
		width: 180rpx;
		height: 180rpx;
		bottom: -60rpx;
		left: -40rpx;
		background: rgba(255, 255, 255, 0.08);
	}

	// 用户信息主体
	.profile-main {
		display: flex;
		align-items: center;
		gap: 24rpx;
		position: relative;
		z-index: 2;

		.avatar {
			width: 120rpx;
			height: 120rpx;
			border-radius: 50%;
			background: #fff;
			flex-shrink: 0;
		}

		.profile-info {
			flex: 1;
			min-width: 0;

			.user-name-row {
				display: flex;
				align-items: center;
				gap: 14rpx;
				margin-bottom: 6rpx;

				.user-name {
					font-size: 40rpx;
					font-weight: 700;
					color: #fff;
					line-height: 1.2;
				}

				// 管理员标签
				.manager-badge {
					padding: 6rpx 14rpx;
					border-radius: 999rpx;
					background: rgba(255, 255, 255, 0.25);
					font-size: 20rpx;
					color: #fff;
				}
			}

			.user-account {
				font-size: 28rpx;
				margin-top: 20rpx;
				color: rgba(255, 255, 255, 0.75);
			}
		}
	}

	// 详细信息行
	.detail-row {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx 32rpx;
		margin-top: 24rpx;
		padding: 16rpx 24rpx;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 16rpx;
		position: relative;
		z-index: 2;

		.detail-item {
			display: flex;
			align-items: center;
			gap: 8rpx;

			.detail-icon {
				font-size: 26rpx;
			}

			.detail-text {
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.9);
			}
		}
	}
}

// ==================== 当前企业卡片
.company-card {
	margin: 20rpx 24rpx 0;
	padding: 24rpx;
	background: #fff;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);

	.company-left {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 20rpx;

		.company-icon {
			font-size: 36rpx;
			flex-shrink: 0;
			position: relative;
			top: -2rpx;
		}

		.company-text {
			flex: 1;
			min-width: 0;

			.company-name {
				font-size: 30rpx;
				font-weight: 500;
				color: #353535;
				line-height: 1.3;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;

				.company-chip-name {
					min-width: 0;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					font-size: 30rpx;
					color: #146ff6;
				}
			}
		}
	}
}

// ==================== 功能菜单
.menu-card {
	margin: 24rpx 24rpx 0;
	background: #fff;
	border-radius: 20rpx;
	padding: 8rpx 0;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

	.menu-item {
		display: flex;
		align-items: center;
		padding: 28rpx 32rpx;
		gap: 24rpx;
		transition: background 0.15s;

		&:active {
			background: #f7f9fc;
		}

		.menu-icon {
			width: 76rpx;
			height: 76rpx;
			border-radius: 18rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;

			.icon-emoji {
				font-size: 40rpx;
			}

			&.icon-blue {
				background: linear-gradient(135deg, #e8f0ff, #d6e4ff);
			}
			&.icon-cyan {
				background: linear-gradient(135deg, #e0f7fa, #b2ebf2);
			}
			&.icon-purple {
				background: linear-gradient(135deg, #efe6ff, #d9c8ff);
			}
			&.icon-green {
				background: linear-gradient(135deg, #d1fae5, #a7f3d0);
			}
		}

		.menu-content {
			flex: 1;
			min-width: 0;

			.menu-title {
				font-size: 30rpx;
				color: #1a1a1a;
				font-weight: 500;
				line-height: 1.3;
				margin-bottom: 6rpx;
			}

			.menu-desc {
				font-size: 24rpx;
				color: #999;
				line-height: 1.2;
			}
		}

		.menu-arrow {
			font-size: 36rpx;
			color: #ccc;
			flex-shrink: 0;
			line-height: 1;
		}
	}

	.menu-divider {
		height: 1rpx;
		background: #f0f2f5;
		margin: 0 32rpx 0 132rpx;
	}
}

// ==================== 底部操作按钮
.action-row {
	margin: 48rpx 24rpx 0;
	display: flex;
	gap: 30rpx;

	.action-btn {
		flex: 1;
		height: 92rpx;
		border-radius: 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		font-size: 28rpx;
		transition: opacity 0.15s;

		&:active {
			opacity: 0.85;
		}
	}

	// 切换账号：浅色描边按钮
	.btn-switch {
		background: #fff;
		color: #2962ff;
		border: 1rpx solid #d6e4ff;
	}

	// 退出登录：红色填充
	.btn-logout {
		background: linear-gradient(135deg, #ff6b6b, #ee5253);
		color: #fff;
		box-shadow: 0 8rpx 20rpx rgba(238, 82, 83, 0.25);
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
	background: rgba(0, 0, 0, 0.45);
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
	padding: 40rpx 32rpx 32rpx;
	box-sizing: border-box;
	animation: panelSlideUp 0.28s ease;

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
			margin-top: 10rpx;
			font-size: 24rpx;
			color: #999;
		}
	}

	.company-scroll {
		max-height: 60vh;
	}

	.company-item {
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
				color: #1a1a1a;
				max-width: 100%;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.company-item-mdt {
				font-size: 26rpx;
				color: #888;
				margin-left: 4rpx;
			}

			.company-item-company {
				font-size: 24rpx;
				color: #848383;
				margin-top: 8rpx;
				max-width: 100%;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}

		.company-item-check {
			font-size: 36rpx;
			color: #2962ff;
			flex-shrink: 0;
			line-height: 1;
		}

		.company-arrow {
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

// ==================== VIP 卡片动画
@keyframes vipAurora {
	0%   { transform: translate(0, 0) rotate(0deg); }
	50%  { transform: translate(-6%, 4%) rotate(180deg); }
	100% { transform: translate(0, 0) rotate(360deg); }
}

@keyframes vipSweep {
	0%        { left: -60%; opacity: 0; }
	20%       { opacity: 1; }
	60%, 100% { left: 130%; opacity: 0; }
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
