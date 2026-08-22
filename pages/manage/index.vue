<template>
	<view class="manage-page">
		<!-- 顶部：editorial 排版 -->
		<view class="manage-header">
			<text class="header-eyebrow">TEAM</text>
			<view class="header-hero">
				<text class="hero-title">团队管理</text>
				<text class="hero-count">{{ teamList.length }} 位成员</text>
			</view>
			<text class="header-sub">抢线索与成交情况，一目了然</text>
		</view>

		<!-- 白色大圆角 sheet：邀请卡 + tab + 成员列表 -->
		<view class="manage-sheet">
			<scroll-view class="team-scroll" scroll-y :show-scrollbar="false">
				<!-- 邀请员工加入：全页唯一的彩色焦点 -->
				<view class="teamData_box">
					<button class="teamData_btn share-btn" open-type="share">
						<view class="textData_btn_box">
							<image src="/static/images/yqyg.png" class="teamData_icon"></image>
							<view class="teamData_texts">
								<text class="teamData_text">邀请员工加入</text>
								<text class="teamData_sub">加入后实时接收流量通知</text>
							</view>
						</view>
						<text class="invite-arrow">›</text>
					</button>
				</view>

				<!-- 客户类型切换：下划线 tab -->
				<view class="options-box">
					<view class="option-btn" :class="{ active: customerType === '1' }" @tap="handleType('1')">已抢客户</view>
					<view class="option-btn" :class="{ active: customerType === '2' }" @tap="handleType('2')">已成交客户</view>
				</view>

				<!-- 空状态 -->
				<view v-if="!teamList.length && !loading" class="team-empty">
					<image class="team-empty-img" src="https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png" mode="aspectFit" />
					<text class="team-empty-title">暂无员工</text>
				</view>

				<!-- 已抢客户 -->
				<view class="content" v-if="customerType === '1'">
					<view v-for="(item, index) of teamList" class="member" :key="index">
						<view class="member-left" @tap.stop="showClueList(item)">
							<image class="avatar" :src="getAvatarUrl(item.userLogo, item.sex)" mode="aspectFill" />
							<view class="member-info">
								<text class="name">{{ filterName(item.userName) }}</text>
								<text class="account">{{ item.userMdt }}</text>
							</view>
						</view>
						<view class="admin" v-if="item.isAdmin">企业负责人</view>
						<view class="member-right" v-else>
							<view class="clue-name mr-r">
								<text class="num num-blue">{{ item.UserTotal || '0' }}</text>
								<text class="num-label">{{ item.clueName || '已抢客户数' }}</text>
							</view>
							<view class="clue-name">
								<text class="num num-red">{{ precent(item.FollowRate) }}</text>
								<text class="num-label">跟进率</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 已成交客户 -->
				<view class="content" v-if="customerType === '2'">
					<view v-for="(item, index) of teamList" class="member" :key="index">
						<view class="member-left" @tap.stop="showComplateList(item)">
							<image class="avatar" :src="getAvatarUrl(item.userLogo, item.sex)" mode="aspectFill" />
							<view class="member-info">
								<text class="name">{{ filterName(item.userName) }}</text>
								<text class="account">{{ item.userMdt }}</text>
							</view>
						</view>
						<view class="admin" v-if="item.isAdmin">企业负责人</view>
						<view class="member-right" v-else>
							<view class="clue-name mr-r">
								<text class="num num-blue">{{ item.TransactionCount || '0' }}</text>
								<text class="num-label">已成交客户数</text>
							</view>
							<view class="clue-name">
								<text class="num num-red">{{ item.RepurchaseCount || '0' }}</text>
								<text class="num-label">复购数</text>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import { getTeamList } from '@/static/api/index.js'
import { getAvatarUrl, handleDataKey } from '@/common/utils/index.js'

export default {
	data() {
		return {
			teamList: [], // 团队成员列表
			customerType: '1', // 客户类型：1=已抢客户 2=已成交客户
			loading: false // 团队列表加载中
		}
	},
	onShow() {
		// 进入页面拉取团队列表
		this.teamGetTeamList()
	},
	methods: {
		getAvatarUrl,

		// ----------- 切换客户类型（已抢 / 已成交）
		handleType(type) {
			this.customerType = type
			this.teamGetTeamList()
		},
		// ----------- 获取团队列表
		async teamGetTeamList() {
			this.loading = true
			uni.showLoading({ title: 'Loading...' })
			try {
				const res = await getTeamList({ Page: 1, PageSize: 2000, orgId: 0, type: this.customerType })
				if (res.code === 0) {
					this.teamList = handleDataKey(res.data.List || [])
				}
			} catch (e) {
				// request 内部已统一弹 toast
			} finally {
				this.loading = false
				uni.hideLoading()
			}
		},
		// ----------- 用户名过滤：去掉括号及后面的内容（与 skill-chain 的 filterUserName 保持一致）
		filterName(userName) {
			return userName ? userName.split('(')[0] : ''
		},
		// ----------- 跟进率百分比格式化
		precent(num) {
			if (!num) return '0.00%'
			return (num * 100).toFixed(2) + '%'
		},
		// ----------- 查看员工的已抢客户列表（详情页暂未实现，先提示）
		showClueList(item) {
			uni.showToast({ icon: 'none', title: '客户列表功能开发中' })
		},
		// ----------- 查看员工的已成交客户列表（详情页暂未实现，先提示）
		showComplateList(item) {
			uni.showToast({ icon: 'none', title: '客户列表功能开发中' })
		}
	},
	// 分享给朋友
	onShareAppMessage() {
		return {
			title: '邀请你加入团队，及时接收流量通知',
			path: 'pages/clue/index',
			imageUrl: 'http://hzmdstatic.oss-cn-hangzhou.aliyuncs.com/todaymic/share/share-img.png'
		}
	},
	// 分享给朋友圈
	onShareTimeline() {
		return {
			title: '邀请你加入团队，及时接收流量通知',
			path: 'pages/clue/index',
			imageUrl: 'http://hzmdstatic.oss-cn-hangzhou.aliyuncs.com/todaymic/share/share-img.png'
		}
	}
}
</script>

<style lang="scss" scoped>
// ----------- 「线索账本」editorial 色板（与线索页一致）
$paper: #f4f6fa; // 页面底色（冷调浅蓝灰）
$card: #ffffff; // sheet 白
$ink: #191c22; // 主文字
$t2: #6b7079; // 次文字
$t3: #a6abb4; // 弱文字
$line: rgba(25, 28, 34, 0.08); // 发丝线
$blue: #146ff6; // 品牌主色
$blue-soft: #ebf2fe; // 主色浅底
$red: #c9543f; // 低饱和赭红

.manage-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $paper;

	// ----------- 顶部：editorial 排版，品牌蓝极浅渐变落到页面底色
	.manage-header {
		padding: 0 36rpx 40rpx;
		background: linear-gradient(180deg, #e0ecfd 0%, rgba(244, 246, 250, 0) 100%);

		.header-eyebrow {
			font-size: 20rpx;
			font-weight: 600;
			color: $t3;
			letter-spacing: 8rpx;
		}

		.header-hero {
			display: flex;
			align-items: baseline;
			gap: 16rpx;
			margin-top: 20rpx;

			.hero-title {
				font-size: 44rpx;
				font-weight: 700;
				color: $ink;
				letter-spacing: 3rpx;
			}
			.hero-count {
				font-size: 24rpx;
				color: $t3;
				font-variant-numeric: tabular-nums;
			}
		}

		.header-sub {
			display: block;
			margin-top: 14rpx;
			font-size: 23rpx;
			color: $t3;
			letter-spacing: 2rpx;
		}
	}

	// ----------- 白色大圆角 sheet
	.manage-sheet {
		flex: 1;
		min-height: 0;
		background: $card;
		border-radius: 32rpx 32rpx 0 0;
		box-shadow: 0 -8rpx 32rpx rgba(25, 28, 34, 0.05);
		overflow: hidden;

		.team-scroll {
			height: 100%;
			box-sizing: border-box;

			// 隐藏滚动条但保留滚动
			&::-webkit-scrollbar {
				display: none;
				width: 0 !important;
			}
		}

		// 邀请员工加入：品牌蓝渐变卡，全页唯一彩色焦点
		.teamData_box {
			margin: 28rpx 28rpx 0;
			background: linear-gradient(120deg, #146ff6 0%, #4f8eff 100%);
			border-radius: 20rpx;
			box-shadow: 0 12rpx 28rpx rgba(20, 111, 246, 0.26);
			overflow: hidden;

			.teamData_btn {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;
				padding: 30rpx 32rpx;

				.textData_btn_box {
					display: flex;
					flex-direction: row;
					align-items: center;

					.teamData_icon {
						width: 72rpx;
						height: 72rpx;
					}
					.teamData_texts {
						display: flex;
						flex-direction: column;
						gap: 6rpx;
						margin-left: 24rpx;

						.teamData_text {
							font-size: 31rpx;
							font-weight: 600;
							color: #fff;
							letter-spacing: 2rpx;
						}
						.teamData_sub {
							font-size: 22rpx;
							color: rgba(255, 255, 255, 0.72);
						}
					}
				}

				.invite-arrow {
					font-size: 48rpx;
					color: rgba(255, 255, 255, 0.85);
					line-height: 1;
				}
			}

			// 去掉 button 默认样式
			.share-btn {
				background-color: transparent;
				border: none;
				border-radius: 0;
				line-height: 1.4;
				text-align: left;

				&::after {
					border: none;
				}
			}
		}

		// 客户类型切换：下划线 tab（editorial 式）
		.options-box {
			display: flex;
			align-items: center;
			padding: 0 36rpx;
			margin-top: 8rpx;
			border-bottom: 1rpx solid $line;

			.option-btn {
				position: relative;
				padding: 26rpx 4rpx;
				font-size: 27rpx;
				color: $t2;

				&.active {
					color: $ink;
					font-weight: 700;

					&::after {
						content: '';
						position: absolute;
						left: 50%;
						transform: translateX(-50%);
						bottom: -1rpx;
						width: 44rpx;
						height: 4rpx;
						border-radius: 2rpx;
						background: $blue;
					}
				}

				& + .option-btn {
					margin-left: 56rpx;
				}
			}
		}

		// 空状态
		.team-empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding-top: 120rpx;

			.team-empty-img {
				width: 240rpx;
				height: 240rpx;
				opacity: 0.5;
			}
			.team-empty-title {
				margin-top: 20rpx;
				font-size: 26rpx;
				color: $t3;
			}
		}

		// 成员列表：发丝线行，不用卡片盒
		.content {
			padding: 0 36rpx 40rpx;

			.member {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 32rpx 0;
				border-bottom: 1rpx solid $line;

				&:last-of-type {
					border-bottom: none;
				}

				.member-left {
					flex: 1;
					min-width: 0;
					display: flex;
					align-items: center;

					.avatar {
						width: 84rpx;
						height: 84rpx;
						border-radius: 50%;
						background: #f0f2f5;
						flex-shrink: 0;
					}

					.member-info {
						display: flex;
						flex-direction: column;
						gap: 6rpx;
						margin-left: 22rpx;
						min-width: 0;

						.name {
							font-size: 31rpx;
							font-weight: 600;
							color: $ink;
							overflow: hidden;
							white-space: nowrap;
							text-overflow: ellipsis;
						}
						.account {
							font-size: 21rpx;
							color: $t3;
							font-variant-numeric: tabular-nums;
						}
					}
				}

				// 企业负责人：低饱和赭红文字标签
				.admin {
					flex-shrink: 0;
					font-size: 22rpx;
					font-weight: 600;
					color: $red;
					background: #faecea;
					padding: 6rpx 16rpx;
					border-radius: 8rpx;
				}

				.member-right {
					display: flex;
					align-items: center;
					flex-shrink: 0;

					.clue-name {
						display: flex;
						flex-direction: column;
						align-items: flex-end;
						gap: 8rpx;
						min-width: 110rpx;

						&.mr-r {
							margin-right: 44rpx;
						}

						// 数字：等宽大数字作为视觉重点
						.num {
							font-size: 36rpx;
							font-weight: 700;
							line-height: 1;
							font-variant-numeric: tabular-nums;
						}
						.num-blue {
							color: $blue;
						}
						.num-red {
							color: $ink;
						}
						.num-label {
							font-size: 20rpx;
							color: $t3;
							letter-spacing: 1rpx;
						}
					}
				}
			}
		}
	}
}
</style>
