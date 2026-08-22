<template>
	<view class="clue-page">
		<!-- 顶部：浅蓝氛围底 + 图标统计卡 -->
		<view class="clue-header">
			<!-- 统计：图标小块 + 数字标签横排 -->
			<view class="header-stats">
				<view class="hs-item">
					<view class="hs-text">
						<text class="hs-num num-browse">{{ formatNumber(displayTotal.browseNum) }}</text>
						<text class="hs-label">浏览客户</text>
					</view>
				</view>
				<view class="hs-item">
					<view class="hs-text">
						<text class="hs-num num-download">{{ formatNumber(displayTotal.downloadNum) }}</text>
						<text class="hs-label">下载客户</text>
					</view>
				</view>
				<view class="hs-item">
					<view class="hs-text">
						<text class="hs-num num-robbed">{{ formatNumber(displayTotal.robbedNum) }}</text>
						<text class="hs-label">已抢客户</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 筛选：白色胶囊，选中为淡蓝底 -->
		<view class="clue-filter">
			<view class="filter-chip" :class="{ active: activeDrop === 'type' }" @tap="toggleDrop('type')">
				<text class="chip-text">{{ typeText }}</text>
				<text class="chip-arrow" :class="{ up: activeDrop === 'type' }">▾</text>
			</view>
			<view class="filter-chip" :class="{ active: activeDrop === 'keyword', 'is-on': params.keyword !== 0 }" @tap="toggleDrop('keyword')">
				<text class="chip-text">{{ keywordText }}</text>
				<text class="chip-arrow" :class="{ up: activeDrop === 'keyword' }">▾</text>
			</view>
			<view class="filter-chip" :class="{ active: activeDrop === 'order' }" @tap="toggleDrop('order')">
				<text class="chip-text">{{ orderText }}</text>
				<text class="chip-arrow" :class="{ up: activeDrop === 'order' }">▾</text>
			</view>
			<!-- 下拉面板：贴着筛选条下方展开 -->
			<view v-if="activeDrop" class="drop-panel">
				<view
					class="drop-option"
					:class="{ on: params[activeDrop] === opt.value }"
					v-for="opt in currentDropOptions"
					:key="activeDrop + '-' + opt.value"
					@tap="onDropPick(opt.value)"
				>
					<view class="drop-option-main">
						<text class="drop-option-label">{{ opt.label }}</text>
						<text v-if="opt.desc" class="drop-option-desc">{{ opt.desc }}</text>
					</view>
					<text v-if="params[activeDrop] === opt.value" class="drop-option-check">✓</text>
				</view>
			</view>
		</view>

		<!-- 下拉遮罩：点击空白处关闭，层级在筛选条之下 -->
		<view v-if="activeDrop" class="drop-mask" @tap="activeDrop = ''"></view>


		<!-- 线索时间轴 Feed -->
		<scroll-view
			class="clue-scroll"
			scroll-y
			:refresher-enabled="true"
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore"
			:lower-threshold="100"
		>
			<view v-if="list.length" class="feed">
				<view class="feed-group" v-for="group in groupedList" :key="group.label">
					<!-- 时间分组标题：今天 / 昨天 / 本周 / 更早 -->
					<view class="group-head" v-if="group.label">
						<text class="group-label">{{ group.label }}</text>
						<text class="group-count">{{ group.items.length }} 位客户</text>
					</view>

					<view
						class="feed-item"
						v-for="item in group.items"
						:key="item.id"
					>
						<view
							class="clue-card"
							hover-class="clue-card-hover"
							:hover-stay-time="60"
							@tap="goDetail(item)"
						>
							<!-- 第一行：头像 + 客户名 / 状态时间 + 抢线索 -->
							<view class="card-head">
								<image class="card-avatar" :src="item._avatarUrl || getAvatarUrl(item.userLogo, item.userSex)" mode="aspectFill" @error="onAvatarError(item)" />
								<view class="card-head-mid">
									<text class="card-name">{{ item.userName }}</text>
									<view class="card-sub">
										<view class="card-state" :class="{ 'is-giveup': item.status === '放弃' }">
											<text class="card-state-dot"></text>
											<text>{{ item.status === '放弃' ? '已放弃' : '可跟进' }}</text>
										</view>
										<text class="card-sub-sep">·</text>
										<text class="card-time">{{ formatDiffTime(item.lastDate) }}</text>
									</view>
								</view>
								<view class="card-rob" hover-class="card-rob-hover" :hover-stay-time="60" @tap.stop="onRob(item)">
									<text>抢线索</text>
								</view>
							</view>

							<!-- 第二行：下载次数强调胶囊 + 浏览次数灰字 + 客户标签，同一行内收窄高度 -->
							<view class="card-info">
								<view class="info-key">
									<text class="info-key-num">{{ item.downloadCount || 0 }}</text>
									<text class="info-key-unit">次下载</text>
								</view>
								<text class="info-browse">浏览 {{ item.browseCount || 0 }} 次</text>
								<text
									class="client-tag"
									:class="tagClassMap[tag]"
									v-for="tag in item.labelNum"
									:key="tag"
								>{{ tagDicMap[tag] }}</text>
							</view>

							<!-- 最近行为产品条 -->
							<view class="card-prod" v-if="item.last">
								<image class="card-prod-img" :src="getProdImg(item.last.prodLogo)" mode="aspectFill" />
								<text class="card-prod-type">{{ item.last.type === 1 ? '浏览了' : '下载了' }}</text>
								<text class="card-prod-name">{{ item.last.prodName }}</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 加载更多 -->
				<view class="clue-loadmore">
					<view v-if="loadStatus === 'loading'" class="loadmore-loading">
						<view class="loadmore-spinner"></view>
						<text>加载中...</text>
					</view>
					<text v-else-if="loadStatus === 'nomore'" class="loadmore-end">已加载全部线索</text>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else-if="!loading" class="clue-empty">
				<image class="clue-empty-img" src="https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png" mode="aspectFit" />
				<text class="clue-empty-title">暂无相关线索</text>
				<text class="clue-empty-hint">换个筛选条件，或下拉刷新试试</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getClueTotal, getClueList, robClue } from '@/static/api/index.js'
import { getProductImageUrl, getAvatarUrl } from '@/common/utils/index.js'

// ----------- 客户标签字典（与 skill-chain 保持一致）
const TAG_DIC = { 1: '高意向', 2: '高活跃', 3: '设计选中', 4: '信息完整', 5: '绑定企业', 6: '可订阅' }
const TAG_CLASS = { 1: 'yixiang', 2: 'huoyue', 3: 'xuanzhong', 4: 'youzhi', 5: 'qiye', 6: 'dingyue' }

export default {
	data() {
		return {
			totalData: { browseNum: 0, downloadNum: 0, robbedNum: 0 }, // 顶部统计真实值
			displayTotal: { browseNum: 0, downloadNum: 0, robbedNum: 0 }, // 数字滚动动画的展示值
			list: [], // 线索列表
			page: 1, // 当前页码
			pageSize: 15, // 每页条数
			loadStatus: 'loadmore', // 加载状态：loadmore / loading / nomore
			refreshing: false, // 下拉刷新中
			loading: false, // 首次加载中
			activeDrop: '', // 当前展开的下拉：type / keyword / order / ''
			params: { type: 2, keyword: 0, order: 2 }, // 筛选参数
			typeArr: [{ label: '下载过的客户', value: 2 }, { label: '浏览过的客户', value: 1 }],
			keywordArr: [
				{ label: '全部', value: 0 },
				{ label: '高意向', value: 1 },
				{ label: '高活跃', value: 2 },
				{ label: '设计选中', value: 3 },
				{ label: '信息完整', value: 4 },
				{ label: '绑定企业', value: 5 },
				{ label: '可订阅', value: 6 }
			],
			orderArr: [{ label: '按时间排', value: 2 }, { label: '按价值排', value: 3 }, { label: '按活跃度排', value: 1 }],
			tagDicMap: TAG_DIC, // 标签文案字典
			tagClassMap: TAG_CLASS // 标签样式字典
		}
	},
	computed: {
		// ----------- 当前展开下拉对应的选项
		currentDropOptions() {
			const map = { type: this.typeArr, keyword: this.keywordArr, order: this.orderArr }
			return map[this.activeDrop] || []
		},
		// ----------- 类型下拉显示文案
		typeText() {
			const data = this.typeArr.find(item => item.value === this.params.type) || {}
			return data.label || '客户类型'
		},
		// ----------- 标签下拉显示文案
		keywordText() {
			const data = this.keywordArr.find(item => item.value === this.params.keyword) || {}
			return data.value === 0 ? '客户标签' : data.label
		},
		// ----------- 排序下拉显示文案
		orderText() {
			const data = this.orderArr.find(item => item.value === this.params.order) || {}
			return data.label || '排序'
		},
		// ----------- 时间轴分组（仅「按时间排」时按今天/昨天/本周/更早分组，其他排序不分组避免打乱顺序）
		groupedList() {
			if (this.params.order !== 2) return [{ label: '', items: this.list }]
			const groups = [] // 最终分组数组
			const map = {} // label 到分组的映射，避免重复建组
			this.list.forEach(item => {
				const label = this.getTimeGroup(item.lastDate)
				if (!map[label]) {
					map[label] = { label, items: [] }
					groups.push(map[label])
				}
				map[label].items.push(item)
			})
			return groups
		}
	},
	onShow() {
		// 进入页面刷新数据
		this.refreshList()
		this.fetchTotal()
	},
	methods: {
		getAvatarUrl,
		
		// ----------- 头像加载失败时回退默认头像（按性别区分）
		onAvatarError(item) {
			this.$set(item, '_avatarUrl', getAvatarUrl('', item.userSex))
		},
		// ----------- 切换下拉显示
		toggleDrop(key) {
			this.activeDrop = this.activeDrop === key ? '' : key
		},
		// ----------- 选择下拉项
		onDropPick(value) {
			this.params[this.activeDrop] = value
			this.activeDrop = ''
			this.refreshList()
		},
		// ----------- 重置并拉取第一页
		refreshList() {
			this.page = 1
			this.loadStatus = 'loadmore'
			this.fetchList()
		},
		// ----------- 下拉刷新
		onRefresh() {
			this.refreshing = true
			this.page = 1
			this.loadStatus = 'loadmore'
			Promise.all([this.fetchList(), this.fetchTotal()]).finally(() => {
				this.refreshing = false
			})
		},
		// ----------- 上拉加载更多
		onLoadMore() {
			if (this.loadStatus !== 'loadmore') return
			this.page += 1
			this.fetchList()
		},
		// ----------- 拉取线索列表
		async fetchList() {
			if (this.page === 1) this.loading = true
			this.loadStatus = 'loading'
			const params = {
				page: this.page,
				perPage: this.pageSize,
				type: this.params.type,
				order: this.params.order
			}
			// keyword 为 0 表示全部，不传
			if (this.params.keyword !== 0) params.keyword = this.params.keyword
			try {
				const res = await getClueList(params)
				const { list = [] } = res.data || {}
				this.list = this.page === 1 ? list : this.list.concat(list)
				// 不足一页或没有数据则标记没有更多
				if (list.length === 0 || list.length < this.pageSize) {
					this.loadStatus = 'nomore'
				} else {
					this.loadStatus = 'loadmore'
				}
			} catch (e) {
				this.loadStatus = 'nomore'
			} finally {
				this.loading = false
			}
		},
		// ----------- 拉取顶部统计
		async fetchTotal() {
			try {
				const res = await getClueTotal()
				if (res.code === 0) {
					const { browseNum = 0, downloadNum = 0, robbedNum = 0 } = res.data || {}
					this.totalData = { browseNum, downloadNum, robbedNum }
					this.animateTotal({ browseNum, downloadNum, robbedNum })
				}
			} catch (e) {
				// 静默处理，未登录等情况不报错
			}
		},
		// ----------- 数字滚动动画（easeOutCubic 缓动，从当前值滚到目标值）
		animateTotal(target) {
			const duration = 900 // 动画总时长 ms
			const from = { ...this.displayTotal } // 动画起始值
			const start = Date.now() // 动画开始时间戳
			const timer = setInterval(() => {
				// 计算进度并套用 easeOutCubic 缓动
				const p = Math.min((Date.now() - start) / duration, 1)
				const ease = 1 - Math.pow(1 - p, 3)
				this.displayTotal = {
					browseNum: Math.round(from.browseNum + (target.browseNum - from.browseNum) * ease),
					downloadNum: Math.round(from.downloadNum + (target.downloadNum - from.downloadNum) * ease),
					robbedNum: Math.round(from.robbedNum + (target.robbedNum - from.robbedNum) * ease)
				}
				if (p >= 1) clearInterval(timer)
			}, 30)
		},
		// ----------- 抢线索
		onRob(item) {
			uni.showModal({
				title: '提示',
				content: '确定要抢该客户线索吗？',
				confirmText: '确定',
				success: async (modalRes) => {
					if (!modalRes.confirm) return
					try {
						const res = await robClue({ id: item.id })
						if (res.code === 0) {
							uni.showToast({ icon: 'success', title: '抢线索成功' })
							this.refreshList()
							this.fetchTotal()
						}
					} catch (e) {
						// request 内部已统一弹 toast
					}
				}
			})
		},
		// ----------- 跳转线索详情
		goDetail(item) {
			uni.navigateTo({ url: `/pages-sub/clue/clue-detail?id=${item.id}` })
		},
		// ----------- 产品图地址处理
		getProdImg(logo) {
			if (!logo) return ''
			if (/http/.test(logo)) return logo
			return getProductImageUrl(logo)
		},
		// ----------- 数字千分位格式化
		formatNumber(num) {
			if (num === null || num === undefined) return '0'
			return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},
		// ----------- 计算时间轴分组标签
		getTimeGroup(timespan) {
			if (!timespan) return '更早'
			const time = new Date(String(timespan).replace(/-/g, '/')).getTime()
			if (isNaN(time)) return '更早'
			// 用「当天零点」为基准算相差几天，避免跨天判断偏差
			const zero = new Date()
			zero.setHours(0, 0, 0, 0)
			const dayDiff = Math.floor((zero.getTime() - time) / (24 * 60 * 60 * 1000))
			if (dayDiff < 0) return '今天'
			if (dayDiff === 0) return '昨天'
			if (dayDiff < 7) return '本周'
			if (dayDiff < 30) return '本月'
			return '更早'
		},
		// ----------- 时间差格式化（替代 dayjs）
		formatDiffTime(timespan) {
			if (!timespan) return ''
			const time = new Date(String(timespan).replace(/-/g, '/')).getTime()
			if (isNaN(time)) return ''
			const diff = Date.now() - time
			if (diff <= 60 * 1000) return '刚刚'
			if (diff <= 60 * 60 * 1000) return Math.round(diff / (60 * 1000)) + '分钟前'
			if (diff <= 24 * 60 * 60 * 1000) return Math.round(diff / (60 * 60 * 1000)) + '小时前'
			if (diff <= 15 * 24 * 60 * 60 * 1000) return Math.round(diff / (24 * 60 * 60 * 1000)) + '天前'
			const d = new Date(time)
			const pad = n => (n < 10 ? '0' + n : n)
			const now = new Date()
			if (d.getFullYear() === now.getFullYear()) {
				return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
			}
			return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
		}
	}
}
</script>

<style lang="scss" scoped>
// ----------- 柔和色板（低饱和，主色跟 tabBar 蓝色系保持一致）
$bg: #f5f6f8; // 页面底色
$line: #e6e9ee; // 分割线
$t1: #2f343b; // 主文字
$t2: #767c86; // 次文字
$t3: #a5abb4; // 弱文字
$blue: #146ff6; // 主色（亮蓝）
$blue-soft: #e7f0fe; // 主色浅底
$green: #6bb894; // 可跟进状态色

.clue-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $bg;

	// ----------- 顶部：浅蓝氛围底 + 图标统计卡
	.clue-header {
		padding: 32rpx 20rpx 24rpx;
		background: linear-gradient(180deg, #e3edfb 0%, #f5f6f8 100%);

		// 统计：图标小块 + 数字标签横排
		.header-stats {
			display: flex;
			align-items: center;
			padding: 28rpx 12rpx;
			background: #fff;
			border-radius: 24rpx;
			box-shadow: 0 6rpx 20rpx rgba(47, 52, 59, 0.06);

			.hs-item {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 14rpx;

				// 图标小块：跟数字同色系的浅底
				.hs-icon {
					width: 56rpx;
					height: 56rpx;
					border-radius: 16rpx;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 28rpx;
					flex-shrink: 0;

					&.ic-browse { background: #e8f0fd; }
					&.ic-download { background: #fdf1e2; }
					&.ic-robbed { background: #e7f6ee; }
				}

				.hs-text {
					display: flex;
					flex-direction: column;
					gap: 6rpx;

					.hs-num {
						font-size: 36rpx;
						font-weight: 700;
						line-height: 1;
						font-variant-numeric: tabular-nums;

						&.num-browse { color: #5b8def; }
						&.num-download { color: #f6a548; }
						&.num-robbed { color: #55b889; }
					}
					.hs-label {
						font-size: 20rpx;
						color: $t3;
					}
				}
			}
		}
	}

	// ----------- 筛选条：白色横条向上重叠头部，选中项淡蓝底
	.clue-filter {
		display: flex;
		margin: 0 24rpx;
		padding: 10rpx;
		background: #fff;
		border-radius: 16rpx;
		box-shadow: 0 6rpx 20rpx rgba(22, 48, 94, 0.1);
		position: relative;
		z-index: 2;

		.filter-chip {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8rpx;
			padding: 6rpx 0;
			border-radius: 12rpx;
			transition: background 0.2s ease;

			// 展开中 / 已选非默认值：淡蓝底 + 蓝字
			&.active,
			&.is-on {
				background: $blue-soft;

				.chip-text { color: $blue; font-weight: 600; }
				.chip-arrow { color: $blue; }
			}

			.chip-text {
				font-size: 25rpx;
				color: $t2;
				max-width: 150rpx;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
			.chip-arrow {
				font-size: 32rpx;
				color: $t3;
				transition: transform 0.2s ease;
				&.up { transform: rotate(180deg); }
			}
		}
	}

	// ----------- 下拉遮罩：层级在筛选条之下，不盖住筛选按钮
	.drop-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(47, 52, 59, 0.35);
		z-index: 1;
	}

	// ----------- 下拉面板：贴着筛选条下方展开
	.drop-panel {
		position: absolute;
		top: calc(100% + 12rpx);
		left: 0;
		right: 0;
		background: #fff;
		border-radius: 16rpx;
		box-shadow: 0 10rpx 30rpx rgba(47, 52, 59, 0.14);
		padding: 12rpx 0;
		z-index: 3;

		.drop-option {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin: 0 12rpx;
			padding: 24rpx 20rpx;
			border-radius: 12rpx;

			&.on {
				background: $blue-soft;

				.drop-option-label { color: $blue; font-weight: 600; }
			}

			.drop-option-main {
				display: flex;
				flex-direction: column;
				gap: 6rpx;

				.drop-option-label { font-size: 28rpx; color: $t1; }
				.drop-option-desc { font-size: 23rpx; color: $t2; }
			}

			.drop-option-check {
				font-size: 28rpx;
				color: $blue;
			}
		}
	}

	// ----------- 时间轴 Feed 滚动区
	.clue-scroll {
		flex: 1;
		min-height: 0;
		padding: 24rpx 32rpx 0;
		box-sizing: border-box;

		// Feed 容器
		.feed {
			padding-bottom: 20rpx;

			// 分组之间拉开间距
			.feed-group + .feed-group {
				margin-top: 12rpx;
			}

			// 时间分组头：分组名 + 客户数胶囊
			.group-head {
				display: flex;
				align-items: center;
				gap: 14rpx;
				padding: 8rpx 4rpx 22rpx;

				.group-label {
					font-size: 28rpx;
					font-weight: 700;
					color: $t1;
					letter-spacing: 2rpx;
				}
				.group-count {
					font-size: 20rpx;
					color: $blue;
					background: $blue-soft;
					padding: 4rpx 14rpx;
					border-radius: 999rpx;
				}
			}

			// Feed 单项
			.feed-item {
				margin-bottom: 24rpx;
			}
		}

		// ----------- 线索卡片
		.clue-card {
			background: #fff;
			border-radius: 22rpx;
			padding: 26rpx 24rpx;
			// 双层柔和阴影：近距离一层压边，远距离一层撑起浮起感（阴影带蓝调，跟头部呼应）
			box-shadow: 0 2rpx 6rpx rgba(22, 48, 94, 0.04), 0 10rpx 28rpx rgba(22, 48, 94, 0.07);
			transition: box-shadow 0.18s ease, transform 0.18s ease;

			&.clue-card-hover {
				transform: translateY(-2rpx);
				box-shadow: 0 4rpx 10rpx rgba(22, 48, 94, 0.06), 0 16rpx 34rpx rgba(22, 48, 94, 0.11);
			}

			// 第一行：头像 + 客户名 / 状态时间 + 抢线索
			.card-head {
				display: flex;
				align-items: center;
				gap: 16rpx;

				.card-avatar {
					width: 72rpx;
					height: 72rpx;
					border-radius: 50%;
					background: #f0f2f5;
					border: 2rpx solid #eef2f7;
					box-sizing: border-box;
					flex-shrink: 0;
				}

				.card-head-mid {
					flex: 1;
					min-width: 0;
					display: flex;
					flex-direction: column;
					gap: 6rpx;

					// 客户名放大加粗，作为卡片第一视觉重点
					.card-name {
						font-size: 34rpx;
						font-weight: 700;
						color: $t1;
						line-height: 1.15;
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
					}
					.card-sub {
						display: flex;
						align-items: center;
						gap: 8rpx;
						font-size: 21rpx;

						// 状态：圆点 + 文字，可跟进绿 / 已放弃灰
						.card-state {
							display: inline-flex;
							align-items: center;
							gap: 8rpx;
							color: $green;

							.card-state-dot {
								width: 10rpx;
								height: 10rpx;
								border-radius: 50%;
								background: $green;
							}

							&.is-giveup {
								color: $t3;

								.card-state-dot { background: #ccd2da; }
							}
						}
						.card-sub-sep { color: $t3; }
						.card-time { color: $t3; }
					}
				}

				// 抢线索：蓝色渐变 + 投影，作为卡片唯一操作重点
				.card-rob {
					flex-shrink: 0;
					padding: 14rpx 32rpx;
					border-radius: 999rpx;
					background: linear-gradient(135deg, #3d8bff 0%, #146ff6 100%);
					font-size: 24rpx;
					font-weight: 600;
					color: #fff;
					box-shadow: 0 6rpx 14rpx rgba(20, 111, 246, 0.35);
					transition: opacity 0.15s ease, box-shadow 0.15s ease;

					&.card-rob-hover {
						opacity: 0.88;
						box-shadow: 0 3rpx 8rpx rgba(20, 111, 246, 0.25);
					}
				}
			}

			// 第二行：下载强调胶囊 + 浏览灰字 + 标签，一行内排完
			.card-info {
				margin-top: 18rpx;
				display: flex;
				align-items: center;
				flex-wrap: wrap;
				gap: 12rpx;

				// 下载次数：最强意向行为，用淡蓝底 + 大数字突出
				.info-key {
					display: inline-flex;
					align-items: baseline;
					gap: 5rpx;
					padding: 6rpx 16rpx 7rpx;
					border-radius: 10rpx;
					background: $blue-soft;

					.info-key-num {
						font-size: 30rpx;
						font-weight: 700;
						color: $blue;
						line-height: 1;
						font-variant-numeric: tabular-nums;
					}
					.info-key-unit {
						font-size: 21rpx;
						color: $blue;
					}
				}

				// 浏览次数：次要信息，纯灰字不加底
				.info-browse {
					font-size: 22rpx;
					color: $t3;
				}
			}

			// 最近行为产品条
			.card-prod {
				margin-top: 18rpx;
				display: flex;
				align-items: center;
				padding: 14rpx 16rpx;
				background: #f7f9fc;
				border: 1rpx solid #eef1f6;
				border-radius: 14rpx;

				.card-prod-img {
					width: 44rpx;
					height: 44rpx;
					border-radius: 10rpx;
					background: #eceef1;
					flex-shrink: 0;
				}
				.card-prod-type {
					margin-left: 12rpx;
					font-size: 22rpx;
					color: $blue;
					flex-shrink: 0;
				}
				.card-prod-name {
					flex: 1;
					margin-left: 8rpx;
					font-size: 23rpx;
					color: $t2;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
			}
		}

		// ----------- 加载更多
		.clue-loadmore {
			display: flex;
			justify-content: center;
			padding: 16rpx 0 30rpx;

			.loadmore-loading {
				display: flex;
				align-items: center;
				gap: 12rpx;
				font-size: 24rpx;
				color: $t2;

				.loadmore-spinner {
					width: 26rpx;
					height: 26rpx;
					border-radius: 50%;
					border: 3rpx solid $line;
					border-top-color: $blue;
					animation: spin 0.8s linear infinite;
				}
			}
			.loadmore-end {
				font-size: 24rpx;
				color: $t3;
			}
		}

		// ----------- 空状态
	.clue-empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding-top: 130rpx;

			.clue-empty-img {
				width: 240rpx;
				height: 240rpx;
			}
			.clue-empty-title {
				margin-top: 28rpx;
				font-size: 28rpx;
				color: $t2;
			}
			.clue-empty-hint {
				margin-top: 12rpx;
				font-size: 24rpx;
				color: $t3;
			}
		}
	}
}

// ----------- 客户标签（低饱和柔和底色）
.client-tag {
	display: inline-block;
	text-align: center;
	border-radius: 8rpx;
	font-size: 21rpx;
	padding: 6rpx 14rpx;
	line-height: 1.5;

	&.yixiang { background: #fdeeee; color: #d9736f; }
	&.huoyue { background: #fdf2e8; color: #cf8b53; }
	&.xuanzhong { background: #fcf6e5; color: #bf9c47; }
	&.youzhi { background: #eaf7f0; color: #5bb98c; }
	&.qiye { background: #eaf2fd; color: #6288c4; }
	&.dingyue { background: #e8f5f4; color: #4f9d99; }
}

// ----------- 动画关键帧
@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
