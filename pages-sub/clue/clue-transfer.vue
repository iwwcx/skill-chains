<!-- 转交线索：选择团队成员 -->
<template>
	<view class="transfer-page">
		<!-- 顶部说明 -->
		<view class="page-head">
			<text class="head-eyebrow">TRANSFER</text>
			<text class="head-title">转交线索</text>
			<text class="head-sub">选择要转给的团队成员，转交后由对方跟进</text>
		</view>

		<!-- 成员列表 -->
		<scroll-view class="member-scroll" scroll-y :show-scrollbar="false">
			<view class="member-list" v-if="teamList.length">
				<view class="member" v-for="(item, index) of teamList" :key="index">
					<image class="avatar" :src="getAvatarUrl(item.userLogo, item.sex)" mode="aspectFill" />
					<view class="member-info">
						<view class="name-row">
							<text class="name">{{ filterName(item.userName) }}</text>
							<view class="admin-badge" v-if="item.isAdmin">企业负责人</view>
						</view>
						<text class="account">{{ item.userMdt }}</text>
					</view>
					<!-- 不显示自己 -->
					<view class="transfer-btn" v-if="myUserId !== item.userId" @tap="confirmTransfer(item)">转交</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else-if="!loading" class="transfer-empty">
				<image class="transfer-empty-img" src="https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png" mode="aspectFit" />
				<text class="transfer-empty-title">暂无团队成员</text>
			</view>
		</scroll-view>

		<!-- 转交原因弹窗 -->
		<view v-if="tipVisible" class="tip-mask" @tap="onCancel">
			<view class="tip-dialog" @tap.stop="">
				<text class="tip-title">转交原因</text>
				<view class="tip-sub">当前转交给 <text class="tip-sub-name">{{ curUserName }}</text></view>
				<textarea class="tip-input" v-model="transferReason" placeholder="请输入转交原因" :maxlength="200" />
				<view class="tip-btns">
					<view class="tip-btn cancel" @tap="onCancel">取消</view>
					<view class="tip-btn confirm" :class="{ disabled: submitting }" @tap="onSubmit">确定</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getTeamList, transferClue } from '@/static/api/index.js'
import { getAvatarUrl, handleDataKey } from '@/common/utils/index.js'

export default {
	data() {
		return {
			id: '', // 线索id
			teamList: [], // 团队成员列表
			myUserId: '', // 当前登录用户ID，用来在列表里排除自己
			loading: false, // 团队列表加载中
			tipVisible: false, // 转交原因弹窗显示状态
			curUserId: '', // 当前选中要转给的用户ID
			curUserName: '', // 当前选中要转给的用户名
			transferReason: '', // 转交原因
			submitting: false // 提交中状态（防重复提交）
		}
	},
	onLoad(options) {
		this.id = options.id || ''
		const userInfo = uni.getStorageSync('userInfo') || {}
		this.myUserId = userInfo.userId || ''
		this.fetchTeamList()
	},
	methods: {
		getAvatarUrl,

		// ----------- 拉取团队列表（不传 type，取全部成员）
		async fetchTeamList() {
			this.loading = true
			try {
				const res = await getTeamList({ Page: 1, PageSize: 2000, orgId: 0 })
				if (res.code === 0) {
					this.teamList = handleDataKey(res.data.List || [])
				}
			} catch (e) {
				// request 内部已统一弹 toast
			} finally {
				this.loading = false
			}
		},
		// ----------- 用户名过滤：去掉括号及后面的内容（与管理页保持一致）
		filterName(userName) {
			return userName ? userName.split('(')[0] : ''
		},
		// ----------- 点击转交：打开原因弹窗
		confirmTransfer(item) {
			this.curUserId = item.userId
			this.curUserName = this.filterName(item.userName)
			this.transferReason = ''
			this.tipVisible = true
		},
		// ----------- 取消转交
		onCancel() {
			this.tipVisible = false
			this.transferReason = ''
		},
		// ----------- 确认转交
		async onSubmit() {
			if (this.submitting) return
			if (!this.transferReason.trim()) {
				uni.showToast({ icon: 'none', title: '请填写转交原因' })
				return
			}
			this.submitting = true
			try {
				const res = await transferClue({
					id: this.id,
					transferUserId: this.curUserId,
					content: this.transferReason.trim()
				})
				if (res.code === 0) {
					this.tipVisible = false
					uni.showToast({ icon: 'success', title: '转交成功' })
					// 转交后线索归对方，直接回线索列表（与 skill-chain 行为一致）
					setTimeout(() => {
						uni.switchTab({ url: '/pages/clue/index' })
					}, 800)
				}
			} catch (e) {
				// request 内部已统一弹 toast
			} finally {
				this.submitting = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
// ----------- 「线索账本」editorial 色板（与全站一致）
$paper: #f4f6fa; // 页面底色
$card: #ffffff; // 卡片白
$ink: #191c22; // 主文字
$t2: #6b7079; // 次文字
$t3: #a6abb4; // 弱文字
$line: rgba(25, 28, 34, 0.08); // 发丝线
$blue: #146ff6; // 品牌主色
$blue-soft: #ebf2fe; // 主色浅底
$red: #c9543f; // 低饱和赭红

.transfer-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $paper;

	// ----------- 顶部说明：editorial 排版
	.page-head {
		padding: 32rpx 36rpx 32rpx;
		display: flex;
		flex-direction: column;

		.head-eyebrow {
			font-size: 20rpx;
			font-weight: 600;
			color: $t3;
			letter-spacing: 8rpx;
		}
		.head-title {
			margin-top: 14rpx;
			font-size: 40rpx;
			font-weight: 700;
			color: $ink;
			letter-spacing: 3rpx;
		}
		.head-sub {
			margin-top: 12rpx;
			font-size: 23rpx;
			color: $t3;
		}
	}

	.member-scroll {
		flex: 1;
		min-height: 0;

		// 隐藏滚动条但保留滚动
		&::-webkit-scrollbar {
			display: none;
			width: 0 !important;
		}
	}

	// ----------- 成员列表：白卡 + 发丝线行
	.member-list {
		margin: 0 24rpx 40rpx;
		background: $card;
		border-radius: 20rpx;
		padding: 0 28rpx;
		box-shadow: 0 4rpx 20rpx rgba(25, 28, 34, 0.04);

		.member {
			display: flex;
			align-items: center;
			padding: 28rpx 0;
			border-bottom: 1rpx solid $line;

			&:last-of-type {
				border-bottom: none;
			}

			.avatar {
				width: 80rpx;
				height: 80rpx;
				border-radius: 50%;
				background: #f0f2f5;
				flex-shrink: 0;
			}

			.member-info {
				flex: 1;
				min-width: 0;
				display: flex;
				flex-direction: column;
				gap: 6rpx;
				margin-left: 22rpx;

				.name-row {
					display: flex;
					align-items: center;
					gap: 12rpx;

					.name {
						font-size: 30rpx;
						font-weight: 600;
						color: $ink;
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
					}

					// 企业负责人：低饱和赭红小标签
					.admin-badge {
						flex-shrink: 0;
						font-size: 20rpx;
						font-weight: 600;
						color: $red;
						background: #faecea;
						padding: 4rpx 12rpx;
						border-radius: 8rpx;
					}
				}

				.account {
					font-size: 21rpx;
					color: $t3;
					font-variant-numeric: tabular-nums;
				}
			}

			// 转交按钮：蓝色描边胶囊
			.transfer-btn {
				flex-shrink: 0;
				padding: 12rpx 32rpx;
				border-radius: 999rpx;
				border: 1rpx solid rgba(20, 111, 246, 0.4);
				font-size: 24rpx;
				font-weight: 600;
				color: $blue;
				letter-spacing: 1rpx;
				transition: opacity 0.15s ease;

				&:active {
					opacity: 0.6;
				}
			}
		}
	}

	// ----------- 空状态
	.transfer-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 130rpx;

		.transfer-empty-img {
			width: 240rpx;
			height: 240rpx;
			opacity: 0.6;
		}
		.transfer-empty-title {
			margin-top: 20rpx;
			font-size: 26rpx;
			color: $t3;
		}
	}

	// ----------- 转交原因弹窗：居中卡片
	.tip-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(25, 28, 34, 0.45);
		z-index: 99;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tip-dialog {
		width: 620rpx;
		background: $card;
		border-radius: 20rpx;
		padding: 44rpx 40rpx 36rpx;
		box-sizing: border-box;

		.tip-title {
			display: block;
			font-size: 34rpx;
			font-weight: 700;
			color: $ink;
			text-align: center;
			letter-spacing: 2rpx;
		}

		.tip-sub {
			margin-top: 14rpx;
			text-align: center;
			font-size: 24rpx;
			color: $t2;

			.tip-sub-name {
				color: $blue;
				font-weight: 600;
			}
		}

		.tip-input {
			margin-top: 32rpx;
			width: 100%;
			height: 180rpx;
			background: $paper;
			border-radius: 14rpx;
			padding: 20rpx;
			font-size: 26rpx;
			color: $ink;
			box-sizing: border-box;
		}

		.tip-btns {
			display: flex;
			gap: 20rpx;
			margin-top: 36rpx;

			.tip-btn {
				flex: 1;
				text-align: center;
				padding: 24rpx 0;
				border-radius: 999rpx;
				font-size: 28rpx;
				transition: opacity 0.15s ease;

				&:active {
					opacity: 0.75;
				}

				&.cancel {
					background: #eef1f5;
					color: $t2;
				}
				&.confirm {
					background: $blue;
					font-weight: 600;
					color: #fff;
					box-shadow: 0 6rpx 16rpx rgba(20, 111, 246, 0.26);

					&.disabled {
						opacity: 0.6;
					}
				}
			}
		}
	}
}
</style>
