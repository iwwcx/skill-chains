<template>
	<view class="clue-page">
		<!-- 顶部：editorial 账本式排版，巨号数字做主视觉 -->
		<view class="clue-header">
			<text class="header-eyebrow">CLUE OVERVIEW</text>
			<!-- 主指标：下载客户是最强意向行为，给最大字号 -->
			<view class="header-hero">
				<text class="hero-num">{{ formatNumber(displayTotal.downloadNum) }}</text>
				<text class="hero-label">下载客户</text>
			</view>
			<!-- 次级指标横排，发丝竖线分隔 -->
			<view class="header-subs">
				<view class="sub-item">
					<text class="sub-num">{{ formatNumber(displayTotal.browseNum) }}</text>
					<text class="sub-label">浏览客户</text>
				</view>
				<view class="sub-line"></view>
				<view class="sub-item">
					<text class="sub-num">{{ formatNumber(displayTotal.robbedNum) }}</text>
					<text class="sub-label">已抢客户</text>
				</view>
			</view>
		</view>

		<!-- 白色大圆角 sheet：筛选 + 列表都装在这里面 -->
		<view class="clue-sheet">
			<!-- 筛选：纯文字式 chip，选中底部蓝色短线 -->
			<view class="clue-filter">
				<view class="filter-chip" :class="{ active: activeDrop === 'type' }" @tap="toggleDrop('type')">
					<text class="chip-text">{{ typeText }}</text>
					<text class="chip-arrow" :class="{ up: activeDrop === 'type' }">▾</text>
					<view class="chip-bar" v-if="activeDrop === 'type'"></view>
				</view>
				<view class="filter-chip" :class="{ active: activeDrop === 'keyword', 'is-on': params.keyword !== 0 }" @tap="toggleDrop('keyword')">
					<text class="chip-text">{{ keywordText }}</text>
					<text class="chip-arrow" :class="{ up: activeDrop === 'keyword' }">▾</text>
					<view class="chip-bar" v-if="activeDrop === 'keyword' || params.keyword !== 0"></view>
				</view>
				<view class="filter-chip" :class="{ active: activeDrop === 'order' }" @tap="toggleDrop('order')">
					<text class="chip-text">{{ orderText }}</text>
					<text class="chip-arrow" :class="{ up: activeDrop === 'order' }">▾</text>
					<view class="chip-bar" v-if="activeDrop === 'order'"></view>
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

			<!-- 下拉遮罩：点击空白处关闭 -->
			<view v-if="activeDrop" class="drop-mask" @tap="activeDrop = ''"></view>

			<!-- 线索时间轴 Feed -->
			<scroll-view
				class="clue-scroll"
				scroll-y
				:show-scrollbar="false"
				:refresher-enabled="true"
				:refresher-triggered="refreshing"
				@refresherrefresh="onRefresh"
				@scrolltolower="onLoadMore"
				:lower-threshold="100"
			>
				<view v-if="list.length" class="feed">
					<view class="feed-group" v-for="group in groupedList" :key="group.label">
						<!-- 时间分组标题：蓝色账本标线 + 大字号组名 -->
						<view class="group-head" v-if="group.label">
							<view class="group-tick"></view>
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

								<!-- 第二行：下载大数字 + 浏览灰字 + 客户标签 -->
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
// ----------- 「线索账本」editorial 色板：纸白 + 墨 + 品牌蓝唯一强调
$paper: #f4f6fa; // 页面底色（冷调浅蓝灰）
$card: #ffffff; // sheet 白
$ink: #191c22; // 主文字（墨）
$t2: #6b7079; // 次文字
$t3: #a6abb4; // 弱文字
$line: rgba(25, 28, 34, 0.08); // 发丝线
$blue: #146ff6; // 品牌主色（唯一强调）
$blue-soft: #ebf2fe; // 主色浅底
$green: #3e9c6e; // 可跟进状态色

.clue-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $paper;

	// ----------- 顶部：editorial 账本式排版，品牌蓝极浅渐变落到页面底色
	.clue-header {
		padding: 0 36rpx 40rpx;
		background: linear-gradient(180deg, #e0ecfd 0%, rgba(244, 246, 250, 0) 100%);

		// 宽字距英文小标
		.header-eyebrow {
			font-size: 20rpx;
			font-weight: 600;
			color: $t3;
			letter-spacing: 8rpx;
		}

		// 主指标：68rpx 巨号等宽数字，全页视觉锚点
		.header-hero {
			display: flex;
			align-items: baseline;
			gap: 16rpx;
			margin-top: 20rpx;

			.hero-num {
				font-size: 68rpx;
				font-weight: 700;
				color: $ink;
				line-height: 1;
				font-variant-numeric: tabular-nums;
				letter-spacing: -1rpx;
			}
			.hero-label {
				font-size: 24rpx;
				color: $t2;
				letter-spacing: 2rpx;
			}
		}

		// 次级指标：小数字横排 + 发丝竖线
		.header-subs {
			display: flex;
			align-items: center;
			margin-top: 28rpx;

			.sub-item {
				display: flex;
				align-items: baseline;
				gap: 10rpx;

				.sub-num {
					font-size: 32rpx;
					font-weight: 700;
					color: $ink;
					font-variant-numeric: tabular-nums;
				}
				.sub-label {
					font-size: 22rpx;
					color: $t3;
				}
			}

			.sub-line {
				width: 1rpx;
				height: 24rpx;
				background: $line;
				margin: 0 32rpx;
			}
		}
	}

	// ----------- 白色大圆角 sheet：从页头下方托起所有内容
	.clue-sheet {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		background: $card;
		border-radius: 32rpx 32rpx 0 0;
		box-shadow: 0 -8rpx 32rpx rgba(25, 28, 34, 0.05);
		overflow: hidden;

		// 筛选条：纯文字 chip，选中底部蓝色短线
		.clue-filter {
			display: flex;
			flex-shrink: 0;
			border-bottom: 1rpx solid $line;
			position: relative;
			z-index: 2;

			.filter-chip {
				flex: 1;
				position: relative;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 8rpx;
				padding: 26rpx 0;

				// 展开中 / 已选非默认值：蓝字加粗
				&.active,
				&.is-on {
					.chip-text { color: $blue; font-weight: 600; }
					.chip-arrow { color: $blue; }
				}

				.chip-text {
					font-size: 26rpx;
					color: $t2;
					max-width: 160rpx;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
				.chip-arrow {
					font-size: 30rpx;
					color: $t3;
					transition: transform 0.2s ease;
					&.up { transform: rotate(180deg); }
				}

				// 选中态底部蓝色短线
				.chip-bar {
					position: absolute;
					bottom: -1rpx;
					left: 50%;
					transform: translateX(-50%);
					width: 48rpx;
					height: 4rpx;
					border-radius: 2rpx;
					background: $blue;
				}
			}
		}

		// 下拉遮罩
		.drop-mask {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(25, 28, 34, 0.35);
			z-index: 1;
		}

		// 下拉面板：悬浮式，脱离筛选条，完整圆角 + 展开动画
		.drop-panel {
			position: absolute;
			top: calc(100% + 16rpx);
			left: 16rpx;
			right: 16rpx;
			background: $card;
			border-radius: 20rpx;
			border: 1rpx solid $line;
			box-shadow: 0 20rpx 48rpx rgba(25, 28, 34, 0.14);
			padding: 12rpx;
			z-index: 3;
			animation: dropIn 0.18s ease;

			.drop-option {
				position: relative;
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 24rpx 20rpx 24rpx 30rpx;
				border-radius: 12rpx;
				transition: background 0.15s ease;

				// 选中态：浅蓝底 + 左侧蓝色账本标线 + 对勾
				&.on {
					background: $blue-soft;

					&::before {
						content: '';
						position: absolute;
						left: 12rpx;
						top: 50%;
						transform: translateY(-50%);
						width: 5rpx;
						height: 32rpx;
						border-radius: 3rpx;
						background: $blue;
					}

					.drop-option-label { color: $blue; font-weight: 600; }
				}

				.drop-option-main {
					display: flex;
					flex-direction: column;
					gap: 6rpx;

					.drop-option-label { font-size: 28rpx; color: $ink; }
					.drop-option-desc { font-size: 23rpx; color: $t2; }
				}

				// 对勾做成蓝色小圆点底，比裸字符精致
				.drop-option-check {
					width: 36rpx;
					height: 36rpx;
					border-radius: 50%;
					background: $blue;
					color: #fff;
					font-size: 22rpx;
					display: flex;
					align-items: center;
					justify-content: center;
					line-height: 1;
				}
			}
		}

		// ----------- 时间轴 Feed 滚动区
		.clue-scroll {
			flex: 1;
			min-height: 0;
			padding: 8rpx 32rpx 0;
			box-sizing: border-box;

			// 隐藏滚动条但保留滚动
			&::-webkit-scrollbar {
				display: none;
				width: 0 !important;
			}

			.feed {
				padding-bottom: 20rpx;
			}

			// 时间分组头：蓝色账本标线 + 大字号组名
			.group-head {
				display: flex;
				align-items: center;
				gap: 14rpx;
				padding: 36rpx 0 20rpx;

				.group-tick {
					width: 6rpx;
					height: 30rpx;
					border-radius: 3rpx;
					background: $blue;
				}
				.group-label {
					font-size: 34rpx;
					font-weight: 700;
					color: $ink;
					letter-spacing: 2rpx;
				}
				.group-count {
					font-size: 22rpx;
					color: $t3;
					font-variant-numeric: tabular-nums;
				}
			}

			// ----------- 线索条目：无卡片盒，发丝底线分隔
			.clue-card {
				padding: 28rpx 4rpx 30rpx;
				border-bottom: 1rpx solid $line;
				transition: opacity 0.15s ease;

				&.clue-card-hover {
					opacity: 0.6;
				}

				// 第一行：头像 + 客户名 / 状态时间 + 抢线索
				.card-head {
					display: flex;
					align-items: center;
					gap: 18rpx;

					.card-avatar {
						width: 80rpx;
						height: 80rpx;
						border-radius: 50%;
						background: #f0f2f5;
						flex-shrink: 0;
					}

					.card-head-mid {
						flex: 1;
						min-width: 0;
						display: flex;
						flex-direction: column;
						gap: 8rpx;

						// 客户名放大加粗，作为条目第一视觉重点
						.card-name {
							font-size: 34rpx;
							font-weight: 700;
							color: $ink;
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

					// 抢线索：品牌蓝实心胶囊，全条目唯一操作重点
					.card-rob {
						flex-shrink: 0;
						padding: 14rpx 32rpx;
						border-radius: 999rpx;
						background: $blue;
						font-size: 24rpx;
						font-weight: 600;
						color: #fff;
						letter-spacing: 1rpx;
						box-shadow: 0 6rpx 14rpx rgba(20, 111, 246, 0.28);
						transition: opacity 0.15s ease;

						&.card-rob-hover {
							opacity: 0.85;
						}
					}
				}

				// 第二行：下载大数字 + 浏览灰字 + 标签
				.card-info {
					margin-top: 20rpx;
					display: flex;
					align-items: center;
					flex-wrap: wrap;
					gap: 14rpx;

					// 下载次数：最强意向行为，蓝色大数字直接呈现，不套胶囊
					.info-key {
						display: inline-flex;
						align-items: baseline;
						gap: 6rpx;

						.info-key-num {
							font-size: 40rpx;
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

					// 浏览次数：次要信息，纯灰字
					.info-browse {
						font-size: 22rpx;
						color: $t3;
					}
				}

				// 最近行为产品条：纸白内嵌行
				.card-prod {
					margin-top: 20rpx;
					display: flex;
					align-items: center;
					padding: 14rpx 18rpx;
					background: #f5f7fa;
					border-radius: 12rpx;

					.card-prod-img {
						width: 44rpx;
						height: 44rpx;
						border-radius: 8rpx;
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
				padding: 24rpx 0 36rpx;

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
}

// ----------- 客户标签（描边式，比色块底更克制）
.client-tag {
	display: inline-block;
	text-align: center;
	border-radius: 8rpx;
	font-size: 20rpx;
	padding: 4rpx 12rpx;
	line-height: 1.5;
	background: #f0f2f5;
	color: $t2;

	&.yixiang { background: #faecea; color: #c96a5e; }
	&.huoyue { background: #faf0e4; color: #c08a4e; }
	&.xuanzhong { background: #f8f3e0; color: #a8893f; }
	&.youzhi { background: #e6f3ec; color: #3e9c6e; }
	&.qiye { background: $blue-soft; color: $blue; }
	&.dingyue { background: #e4f2f1; color: #4a8f8b; }
}

// ----------- 动画关键帧
@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

// 下拉面板展开：轻微上浮 + 淡入
@keyframes dropIn {
	from { opacity: 0; transform: translateY(-12rpx); }
	to { opacity: 1; transform: translateY(0); }
}
</style>
