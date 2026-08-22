<template>
	<view class="manage-page">
		<!-- 团队管理（参考 skill-chain 的 pages/mine/my-team/index） -->
		<scroll-view class="team-scroll" scroll-y>
			<view class="team-manage">
				<!-- 邀请员工加入 -->
				<view class="teamData_box">
					<button class="teamData_btn share-btn" open-type="share">
						<view class="textData_btn_box">
							<image src="/static/images/yqyg.png" class="teamData_icon"></image>
							<text class="teamData_text">邀请员工加入</text>
						</view>
						<view class="chooseIcon"></view>
					</button>
				</view>

				<!-- 客户类型切换 -->
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
								<text>{{ item.clueName || '已抢客户数' }}</text>
								<text class="num-blue">{{ item.UserTotal || '0' }}</text>
							</view>
							<view class="clue-name">
								<text>跟进率</text>
								<text class="num-red">{{ precent(item.FollowRate) }}</text>
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
								<text>已成交客户数</text>
								<text class="num-blue">{{ item.TransactionCount || '0' }}</text>
							</view>
							<view class="clue-name">
								<text>复购数</text>
								<text class="num-red">{{ item.RepurchaseCount || '0' }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
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
// ----------- 色板（与线索页保持一致的蓝色系）
$bg: #f5f6f8; // 页面底色
$t3: #a5abb4; // 弱文字
$blue: #146ff6; // 主色（亮蓝）

.manage-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $bg;

	// ----------- 团队管理滚动区
	.team-scroll {
		flex: 1;
		min-height: 0;
	}

	.team-manage {
		min-height: 100%;
		padding-top: 10rpx;
		box-sizing: border-box;

		// 邀请员工加入
		.teamData_box {
			padding: 0 0 0 30rpx;
			background-color: #fff;

			.teamData_btn {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;
				padding: 20rpx 0;

				.textData_btn_box {
					display: flex;
					flex-direction: row;
					align-items: center;

					.teamData_icon {
						width: 70rpx;
						height: 70rpx;
					}
					.teamData_text {
						margin-left: 31rpx;
						font-size: 28rpx;
						font-weight: 400;
						color: #333;
					}
				}

				.chooseIcon {
					margin: auto 30rpx auto 22rpx;
					width: 26rpx;
					height: 26rpx;
				}
			}

			// 去掉 button 默认样式
			.share-btn {
				background-color: transparent;
				border: none;
				border-radius: 0;

				&::after {
					border: none;
				}
			}
		}

		// 客户类型切换
		.options-box {
			display: flex;
			align-items: center;
			padding: 25rpx 40rpx;
			font-size: 24rpx;
			font-weight: 400;
			color: #707072;
			line-height: 24rpx;

			.option-btn {
				&.active {
					position: relative;
					color: $blue;

					&::after {
						content: '';
						position: absolute;
						width: 65%;
						height: 4rpx;
						background-color: $blue;
						bottom: -16rpx;
						left: 50%;
						transform: translateX(-50%);
						border-radius: 2rpx;
					}
				}

				& + .option-btn {
					margin-left: 48rpx;
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

		// 成员列表
		.content {
			margin-top: 10rpx;
			padding: 0 30rpx;
			background-color: #fff;

			.member {
				display: flex;
				align-items: center;
				justify-content: space-between;
				height: 120rpx;

				&:not(:last-of-type) {
					border-bottom: 1rpx solid #f2f2f2;
				}

				.member-left {
					flex: 1;
					display: flex;
					align-items: center;

					.avatar {
						width: 70rpx;
						height: 70rpx;
						border-radius: 50%;
						background: #f0f2f5;
						flex-shrink: 0;
					}

					.member-info {
						display: flex;
						flex-direction: column;
						justify-content: space-around;
						margin-left: 20rpx;

						.name {
							font-size: 28rpx;
							color: #232327;
						}
						.account {
							font-size: 20rpx;
							color: #707072;
						}
					}
				}

				.admin {
					font-size: 28rpx;
					color: #dc0000;
				}

				.member-right {
					display: flex;
					align-items: center;

					.clue-name {
						display: flex;
						flex-direction: column;
						line-height: 20px;
						font-size: 24rpx;
						color: #707072;

						&.mr-r {
							margin-right: 20px;
						}

						.num-blue {
							text-align: center;
							color: #2979ff;
						}
						.num-red {
							text-align: center;
							color: #dc0000;
						}
					}
				}
			}
		}
	}
}
</style>
