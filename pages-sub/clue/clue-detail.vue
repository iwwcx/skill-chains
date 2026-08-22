<!-- 客户主页（线索详情） -->
<template>
	<view class="client-home">
		<!-- 顶部客户信息区：深蓝渐变商务风 -->
		<view class="client-card">
			<!-- 装饰光斑 + 圆环，增加头部层次感 -->
			<view class="cc-glow glow-a"></view>
			<view class="cc-glow glow-b"></view>
			<view class="cc-ring ring-a"></view>
			<view class="cc-ring ring-b"></view>
			<!-- 斜向光束装饰，让头部更灵动 -->
			<view class="cc-streak streak-a"></view>
			<view class="cc-streak streak-b"></view>
			<view class="cc-main">
				<image class="cc-avatar" :src="avatarErr ? getAvatarUrl('', clueData.userSex) : getAvatarUrl(clueData.userLogo, clueData.userSex)" mode="aspectFill" @error="avatarErr = true" />
				<view class="cc-info">
					<text class="cc-name">{{ clueData.userName || '加载中...' }}</text>
					<text class="cc-company">{{ realContext('userCompanyName', 'compName') }}</text>
				</view>
				<!-- 状态标签：已抢线索可点击改状态，未抢不显示 -->
				<view v-if="isRobed" class="cc-status" @tap="showStatusPop = true">
					<text>{{ clueData.status }}</text>
					<text class="cc-status-arrow">›</text>
				</view>
			</view>

			<!-- 头部数据概览：玻璃拟态数据条 -->
			<view class="cc-stats">
				<view class="cc-stat">
					<text class="ccs-num">{{ clueData.browseCount || 0 }}</text>
					<text class="ccs-label">浏览</text>
				</view>
				<view class="cc-stat-divider"></view>
				<view class="cc-stat">
					<text class="ccs-num">{{ clueData.downloadCount || 0 }}</text>
					<text class="ccs-label">下载</text>
				</view>
				<view class="cc-stat-divider"></view>
				<view class="cc-stat">
					<text class="ccs-num">{{ recordList.length }}</text>
					<text class="ccs-label">跟进</text>
				</view>
			</view>
		</view>

		<!-- 操作栏：白色卡片向上重叠头部；已抢且是自己线索才显示全部，否则只显示抢线索 -->
		<view class="cc-actions" v-if="isRobed">
			<view class="ca-item" :class="{ disabled: !isSelf }" @tap="handleContact">
				<view class="ca-icon ca-icon-chat">💬</view>
				<text class="ca-text">在线沟通</text>
			</view>
			<view class="ca-item" :class="{ disabled: !isSelf }" @tap="handleAddRecord">
				<view class="ca-icon ca-icon-edit">✎</view>
				<text class="ca-text">写跟进</text>
			</view>
			<view class="ca-item" :class="{ disabled: !isSelf }" @tap="handlePhone">
				<view class="ca-icon ca-icon-phone">📞</view>
				<text class="ca-text">电话</text>
			</view>
			<view class="ca-item" :class="{ disabled: !isSelf && !isAdmin }" @tap="handleTransfer">
				<view class="ca-icon ca-icon-transfer">↗</view>
				<text class="ca-text">转交</text>
			</view>
		</view>

		<!-- Tabs：分段控件样式 -->
		<view class="tabs">
			<view class="tabs-track">
				<view class="tab" :class="{ active: tabIndex === 0 }" @tap="tabClick(0)">
					<text>客户动态</text>
					<text class="tab-count">{{ clueList.length }}</text>
				</view>
				<view class="tab" :class="{ active: tabIndex === 1 }" @tap="tabClick(1)">
					<text>跟进记录</text>
					<text class="tab-count">{{ recordList.length }}</text>
				</view>
				<view class="tab" :class="{ active: tabIndex === 2 }" @tap="tabClick(2)">
					<text>资料</text>
				</view>
			</view>
		</view>

		<!-- 内容区 -->
		<swiper :current="swiperIndex" @animationfinish="onSwiperChange" class="swiper-box">
			<!-- 客户动态 -->
			<swiper-item>
				<scroll-view class="tab-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="trendRefresh" @refresherrefresh="onTrendRefresh">
					<!-- 顶部小统计 -->
					<view class="trend-top">
						<view class="tt-filter" @tap="trendFilterShow = true">
							<text>{{ trendFilterLabel }}</text>
							<text class="tt-filter-arrow">▾</text>
						</view>
					</view>

					<!-- 动态时间轴 -->
					<view class="trend-list" v-if="filteredTrendList.length">
						<view class="trend-line"></view>
						<view class="trend-item" v-for="(item, index) in filteredTrendList" :key="index">
							<view class="trend-node" :class="{ 'is-download': item.type === 2 }"></view>
							<view class="trend-content">
								<view class="trend-head">
									<text class="trend-type" :class="{ 'is-download': item.type === 2 }">{{ item.type === 1 ? '浏览产品' : '下载产品' }}</text>
									<text class="trend-time">{{ item.date }}</text>
								</view>
								<view class="trend-prod">
									<image class="trend-prod-img" :src="getProdImg(item.prodLogo)" mode="aspectFill" />
									<text class="trend-prod-name">{{ item.prodName }}</text>
								</view>
							</view>
						</view>
					</view>
					<view v-else class="tab-empty">
						<text class="empty-icon">◎</text>
						<text class="empty-text">暂无客户动态</text>
					</view>

					<!-- 放弃按钮：自己抢的线索才能放弃 -->
					<view v-if="isSelf" class="trend-abandon" @tap="showAbandonPop = true">
						<text>放弃线索</text>
					</view>
				</scroll-view>
			</swiper-item>

			<!-- 跟进记录 -->
			<swiper-item>
				<scroll-view class="tab-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="recordRefresh" @refresherrefresh="onRecordRefresh">
					<view class="record-list" v-if="recordList.length">
						<view class="record-item" v-for="(item, index) in recordList" :key="index">
							<view class="record-left">
								<text class="record-date">{{ formatDate(item.createdAt) }}</text>
								<text class="record-time">{{ formatTime(item.createdAt) }}</text>
								<view class="record-bar" v-if="index !== recordList.length - 1"></view>
							</view>
							<view class="record-right" :class="{ 'is-notice': item.isTransfer === 1 || item.isTransfer === 2 }">
								<view class="record-row">
									<text class="record-label">状态</text>
									<text class="record-desc">{{ item.intention }}</text>
								</view>
								<view class="record-row">
									<text class="record-label">{{ recordContentLabel[item.isTransfer] || '记录' }}</text>
									<text class="record-desc">{{ item.content }}</text>
								</view>
								<view class="record-row">
									<text class="record-label">{{ recordNameLabel[item.isTransfer] || '跟进人' }}</text>
									<text class="record-desc">{{ item.followUserName }}</text>
								</view>
							</view>
						</view>
					</view>
					<view v-else class="tab-empty">
						<text class="empty-icon">◎</text>
						<text class="empty-text">暂无跟进记录</text>
					</view>
				</scroll-view>
			</swiper-item>

			<!-- 资料 -->
			<swiper-item>
				<scroll-view class="tab-scroll" scroll-y>
					<view class="info-list">
						<view class="info-sec-title">
							<text class="ist-bar"></text>
							<text>基本资料</text>
						</view>
						<view class="info-item">
							<text class="info-label">公司</text>
							<text class="info-value">{{ realContext('userCompanyName', 'compName') || '—' }}</text>
						</view>
						<view class="info-item">
							<text class="info-label">手机</text>
							<text class="info-value">{{ realContext('userPhone', 'phone') || '—' }}</text>
						</view>
						<view class="info-item">
							<text class="info-label">邮箱</text>
							<text class="info-value">{{ realContext('userEmail', 'eMail') || '—' }}</text>
						</view>
						<view class="info-item">
							<text class="info-label">区域</text>
							<text class="info-value">{{ regionText || '—' }}</text>
						</view>
					</view>

					<!-- 最近下载产品 -->
					<view v-if="clueUserInfo.downProdList && clueUserInfo.downProdList.length" class="info-prod-section">
						<view class="info-sec-title">
							<text class="ist-bar"></text>
							<text>最近下载产品</text>
						</view>
						<view class="info-prod-item" v-for="(item, idx) in clueUserInfo.downProdList" :key="idx">
							<text class="info-prod-name">{{ item.prodName }}</text>
							<text class="info-prod-company">{{ item.companyName }}</text>
						</view>
					</view>
				</scroll-view>
			</swiper-item>
		</swiper>

		<!-- 底部抢线索按钮：未被抢时显示 -->
		<view v-if="!isRobed" class="rob-bar">
			<view class="rob-btn" @tap="confirmRob">抢线索</view>
		</view>

		<!-- 状态更新弹窗 -->
		<view v-if="showStatusPop" class="pop-mask" @tap="showStatusPop = false">
			<view class="pop-panel" @tap.stop="">
				<view class="pop-title">
					<text>状态更新</text>
					<text class="pop-close" @tap="showStatusPop = false">✕</text>
				</view>
				<view
					class="pop-option"
					:class="{ on: item.text === clueData.status }"
					v-for="item in statusOptions"
					:key="item.id"
					@tap="onUpdateStatus(item.text)"
				>
					<text>{{ item.text }}</text>
					<text v-if="item.text === clueData.status" class="pop-check">✓</text>
				</view>
			</view>
		</view>

		<!-- 放弃线索弹窗 -->
		<view v-if="showAbandonPop" class="pop-mask" @tap="showAbandonPop = false">
			<view class="pop-panel" @tap.stop="">
				<view class="pop-title">
					<text>放弃的原因</text>
					<text class="pop-close" @tap="showAbandonPop = false">✕</text>
				</view>
				<textarea class="abandon-input" v-model="abandonReason" placeholder="请输入放弃原因" :maxlength="200" />
				<view class="abandon-btns">
					<view class="abandon-btn cancel" @tap="showAbandonPop = false">取消</view>
					<view class="abandon-btn confirm" @tap="onAbandon">确定</view>
				</view>
			</view>
		</view>

		<!-- 动态筛选弹窗 -->
		<view v-if="trendFilterShow" class="pop-mask" @tap="trendFilterShow = false">
			<view class="pop-panel" @tap.stop="">
				<view class="pop-title">
					<text>筛选动态</text>
					<text class="pop-close" @tap="trendFilterShow = false">✕</text>
				</view>
				<view
					class="pop-option"
					:class="{ on: item.value === trendFilterValue }"
					v-for="item in trendFilterOptions"
					:key="item.value"
					@tap="onTrendFilter(item)"
				>
					<text>{{ item.label }}</text>
					<text v-if="item.value === trendFilterValue" class="pop-check">✓</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getClueInfo, getClueUserInfo, getClueUserPhone, updateClueStatus, throwHighSeas, robClue } from '@/static/api/index.js'
import { getProductImageUrl, getAvatarUrl } from '@/common/utils/index.js'

// ----------- 状态选项（与 skill-chain 保持一致）
const STATUS_OPTIONS = [
	{ id: 0, text: '未跟进' },
	{ id: 1, text: '有意向' },
	{ id: 2, text: '跟进中' },
	{ id: 4, text: '完结' },
	{ id: 5, text: '无效' },
	{ id: 6, text: '已成交' },
	{ id: 7, text: '复购' }
]

export default {
	data() {
		return {
			id: '', // 线索id
			clueData: {}, // 线索详情总数据
			clueList: [], // 客户动态列表
			recordList: [], // 跟进记录列表
			clueUserInfo: {}, // 客户资料其他信息
			realData: {}, // 真实手机/邮箱/公司数据
			userInfo: {}, // 当前登录用户信息
			tabIndex: 0, // 当前tab索引
			swiperIndex: 0, // swiper当前索引
			trendRefresh: false, // 动态下拉刷新中
			recordRefresh: false, // 跟进记录下拉刷新中
			showStatusPop: false, // 状态更新弹窗
			showAbandonPop: false, // 放弃弹窗
			abandonReason: '', // 放弃原因
			trendFilterShow: false, // 动态筛选弹窗
			trendFilterValue: '', // 动态筛选值：''全部 / 1浏览 / 2下载
			statusOptions: STATUS_OPTIONS, // 状态选项
			trendFilterOptions: [
				{ value: '', label: '全部' },
				{ value: 1, label: '浏览' },
				{ value: 2, label: '下载' }
			],
			recordContentLabel: { 1: '转交原因', 2: '放弃原因' }, // 跟进记录内容标签
			recordNameLabel: { 1: '转交人', 2: '放弃人' }, // 跟进记录人标签
			avatarErr: false // 头像加载失败标记
		}
	},
	computed: {
		// ----------- 线索是否已被抢（followUserId 有值表示已抢）
		isRobed() {
			return !!this.clueData.followUserId
		},
		// ----------- 是否为自己的线索
		isSelf() {
			return !!this.clueData.followUserId && this.clueData.followUserId === this.userInfo.userId
		},
		// ----------- 是否为管理员
		isAdmin() {
			return !!this.userInfo.isManager
		},
		// ----------- 动态筛选后列表
		filteredTrendList() {
			if (!this.trendFilterValue) return this.clueList
			return this.clueList.filter(item => item.type === this.trendFilterValue)
		},
		// ----------- 动态筛选显示文案
		trendFilterLabel() {
			const opt = this.trendFilterOptions.find(item => item.value === this.trendFilterValue)
			return opt ? opt.label : '全部'
		},
		// ----------- 区域文案
		regionText() {
			const { province, city, district } = this.clueUserInfo
			return (province || '') + (city || '') + (district || '')
		}
	},
	onLoad(options) {
		// 从路由参数拿 id
		this.id = options.id
		// 从本地存储拿用户信息
		this.userInfo = uni.getStorageSync('userInfo') || {}
	},
	onShow() {
		// 每次进入页面刷新数据
		this.init()
	},
	methods: {
		// 暴露给模板使用的工具函数
		getAvatarUrl,
		// ----------- 初始化
		init() {
			if (!this.id) return
			this.getDetail()
			this.getUserInfoData()
		},
		// ----------- 获取真实字段值（脱敏时用 realData 的值，否则用 clueData 的值）
		realContext(prop1, prop2) {
			const val1 = this.clueData[prop1]
			const val2 = this.realData[prop2]
			const real = val1 && String(val1).indexOf('*') === -1
			return this.isSelf ? (real ? val1 : val2 || val1) : val1
		},
		// ----------- 获取线索详情
		async getDetail() {
			try {
				const res = await getClueInfo({ id: this.id })
				const data = res.data || {}
				this.clueData = data
				this.clueList = data.clueList || []
				this.recordList = data.recordList || []
				// 拿真实手机/邮箱/公司
				this.getRealData()
			} catch (e) {
				// request 内部已统一弹 toast
			}
		},
		// ----------- 获取真实手机/邮箱/公司
		async getRealData() {
			try {
				const res = await getClueUserPhone({ id: this.id })
				this.realData = res.data || {}
			} catch (e) {
				// 静默处理
			}
		},
		// ----------- 获取客户资料其他信息
		async getUserInfoData() {
			try {
				const res = await getClueUserInfo({ id: this.id })
				this.clueUserInfo = res.data || {}
			} catch (e) {
				// 静默处理
			}
		},
		// ----------- tab 点击
		tabClick(index) {
			this.tabIndex = index
			this.swiperIndex = index
		},
		// ----------- swiper 滑动结束
		onSwiperChange(e) {
			const current = e.detail.current
			this.swiperIndex = current
			this.tabIndex = current
		},
		// ----------- 动态下拉刷新
		onTrendRefresh() {
			this.trendRefresh = true
			this.init()
			setTimeout(() => { this.trendRefresh = false }, 800)
		},
		// ----------- 跟进记录下拉刷新
		onRecordRefresh() {
			this.recordRefresh = true
			this.init()
			setTimeout(() => { this.recordRefresh = false }, 800)
		},
		// ----------- 动态筛选
		onTrendFilter(item) {
			this.trendFilterValue = item.value
			this.trendFilterShow = false
		},
		// ----------- 更新状态
		async onUpdateStatus(status) {
			try {
				await updateClueStatus({ id: this.id, status })
				uni.showToast({ icon: 'success', title: '更新成功' })
				this.showStatusPop = false
				this.getDetail()
			} catch (e) {
				// request 内部已统一弹 toast
			}
		},
		// ----------- 放弃线索
		async onAbandon() {
			const reason = this.abandonReason.trim()
			if (!reason) {
				uni.showToast({ icon: 'none', title: '请填写放弃原因' })
				return
			}
			try {
				await throwHighSeas({ id: this.id, content: reason })
				uni.showToast({ icon: 'success', title: '操作成功' })
				this.showAbandonPop = false
				this.abandonReason = ''
				setTimeout(() => uni.navigateBack(), 800)
			} catch (e) {
				// request 内部已统一弹 toast
			}
		},
		// ----------- 抢线索
		confirmRob() {
			uni.showModal({
				title: '提示',
				content: '确定要抢该客户线索吗？',
				confirmText: '确定',
				success: async (modalRes) => {
					if (!modalRes.confirm) return
					try {
						const res = await robClue({ id: this.id })
						if (res.code === 0) {
							uni.showToast({ icon: 'success', title: '抢线索成功' })
							this.init()
						}
					} catch (e) {
						// request 内部已统一弹 toast
					}
				}
			})
		},
		// ----------- 在线沟通
		handleContact() {
			if (!this.isSelf) {
				uni.showToast({ icon: 'none', title: '不是你的线索哦' })
				return
			}
			// TODO: 跳转 IM 聊天页，目标页待迁移
			uni.showToast({ icon: 'none', title: '功能开发中' })
		},
		// ----------- 写跟进
		handleAddRecord() {
			if (!this.isSelf) {
				uni.showToast({ icon: 'none', title: '不是你的线索哦' })
				return
			}
			// TODO: 跳转写跟进页，目标页待迁移
			uni.showToast({ icon: 'none', title: '功能开发中' })
		},
		// ----------- 打电话
		handlePhone() {
			if (!this.isSelf) {
				uni.showToast({ icon: 'none', title: '不是你的线索哦' })
				return
			}
			const phone = this.realContext('userPhone', 'phone')
			if (!phone || phone.indexOf('*') !== -1) {
				uni.showToast({ icon: 'none', title: '该客户已隐藏电话' })
				return
			}
			uni.makePhoneCall({ phoneNumber: phone })
		},
		// ----------- 转交
		handleTransfer() {
			if (!this.isSelf && !this.isAdmin) {
				uni.showToast({ icon: 'none', title: '无权操作' })
				return
			}
			// TODO: 跳转转交页，目标页待迁移
			uni.showToast({ icon: 'none', title: '功能开发中' })
		},
		// ----------- 产品图地址处理
		getProdImg(logo) {
			if (!logo) return ''
			if (/http/.test(logo)) return logo
			return getProductImageUrl(logo)
		},
		// ----------- 格式化日期（YYYY-MM-DD）
		formatDate(timespan) {
			if (!timespan) return ''
			const d = new Date(String(timespan).replace(/-/g, '/'))
			if (isNaN(d.getTime())) return ''
			const pad = n => (n < 10 ? '0' + n : n)
			return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
		},
		// ----------- 格式化时间（HH:mm:ss）
		formatTime(timespan) {
			if (!timespan) return ''
			const d = new Date(String(timespan).replace(/-/g, '/'))
			if (isNaN(d.getTime())) return ''
			const pad = n => (n < 10 ? '0' + n : n)
			return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
		}
	}
}
</script>

<style lang="scss" scoped>
// ----------- 柔和色板（与列表页保持一致）
$bg: #f4f6fa;
$line: #edf0f5;
$t1: #1f2733;
$t2: #6b7380;
$t3: #a3aab6;
$blue: #146ff6;
$blue-soft: #eaf2fe;
$red: #e06560;

.client-home {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $bg;

	// ----------- 顶部客户信息区：深蓝渐变
	.client-card {
		position: relative;
		overflow: hidden;
		flex-shrink: 0;
		padding: 38rpx 32rpx 40rpx; // 底部多留空间，给操作卡向上重叠
		background: linear-gradient(155deg, #071e47 0%, #0c3a8c 48%, #1767e6 100%);

		// 装饰光斑：径向渐变圆，营造层次
		.cc-glow {
			position: absolute;
			border-radius: 50%;
			background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%);
			pointer-events: none;

			&.glow-a {
				width: 380rpx;
				height: 380rpx;
				top: -160rpx;
				right: -100rpx;
			}
			&.glow-b {
				width: 280rpx;
				height: 280rpx;
				bottom: -140rpx;
				left: -90rpx;
			}
		}

		// 装饰圆环：细描边同心圆，增加精致感
		.cc-ring {
			position: absolute;
			border-radius: 50%;
			border: 1rpx solid rgba(255, 255, 255, 0.14);
			pointer-events: none;

			&.ring-a {
				width: 300rpx;
				height: 300rpx;
				top: -110rpx;
				right: 60rpx;
			}
			&.ring-b {
				width: 180rpx;
				height: 180rpx;
				top: -50rpx;
				right: 120rpx;
				border-color: rgba(255, 255, 255, 0.22);
			}
		}

		// 斜向光束：细长的渐变条，斜切过头部
		.cc-streak {
			position: absolute;
			width: 140rpx;
			height: 420rpx;
			border-radius: 999rpx;
			background: linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 100%);
			transform: rotate(28deg);
			pointer-events: none;

			&.streak-a {
				top: -140rpx;
				right: 220rpx;
			}
			&.streak-b {
				width: 70rpx;
				top: -110rpx;
				right: 130rpx;
				background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
			}
		}

		.cc-main {
			position: relative;
			display: flex;
			align-items: center;
			gap: 24rpx;

			.cc-avatar {
				width: 112rpx;
				height: 112rpx;
				border-radius: 50%;
				background: rgba(255, 255, 255, 0.2);
				border: 4rpx solid rgba(255, 255, 255, 0.85);
				box-shadow: 0 0 0 8rpx rgba(255, 255, 255, 0.12), 0 10rpx 24rpx rgba(3, 16, 43, 0.35);
				box-sizing: border-box;
				flex-shrink: 0;
			}

			.cc-info {
				flex: 1;
				min-width: 0;
				display: flex;
				flex-direction: column;
				gap: 10rpx;

				.cc-name {
					font-size: 40rpx;
					font-weight: 700;
					letter-spacing: 1rpx;
					color: #fff;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
				.cc-company {
					font-size: 24rpx;
					color: rgba(255, 255, 255, 0.75);
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}

				// 区域标签：半透明胶囊 + 亮点
				.cc-region {
					display: flex;
					align-items: center;
					gap: 8rpx;
					align-self: flex-start;
					margin-top: 4rpx;
					padding: 4rpx 18rpx;
					border-radius: 999rpx;
					background: rgba(255, 255, 255, 0.14);
					font-size: 21rpx;
					color: rgba(255, 255, 255, 0.9);

					.cc-region-dot {
						width: 8rpx;
						height: 8rpx;
						border-radius: 50%;
						background: #8fd6ff;
						flex-shrink: 0;
					}
				}
			}

			// 状态标签：渐变底上用半透明白底 + 白字（玻璃拟态）
			.cc-status {
				flex-shrink: 0;
				display: inline-flex;
				align-items: center;
				gap: 6rpx;
				padding: 10rpx 24rpx;
				border-radius: 999rpx;
				background: rgba(255, 255, 255, 0.16);
				border: 1rpx solid rgba(255, 255, 255, 0.35);
				box-shadow: 0 4rpx 12rpx rgba(3, 16, 43, 0.2);
				font-size: 23rpx;
				color: #fff;

				.cc-status-arrow {
					font-size: 24rpx;
					color: rgba(255, 255, 255, 0.85);
				}
			}
		}

		// 头部数据概览：半透明玻璃拟态数据条
		.cc-stats {
			position: relative;
			margin-top: 28rpx;
			display: flex;
			align-items: center;
			padding: 16rpx 0;
			border-radius: 16rpx;
			background: rgba(255, 255, 255, 0.12);
			border: 1rpx solid rgba(255, 255, 255, 0.18);

			.cc-stat {
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 2rpx;

				.ccs-num {
					font-size: 30rpx;
					font-weight: 700;
					color: #fff;
				}
				.ccs-label {
					font-size: 20rpx;
					color: rgba(255, 255, 255, 0.65);
				}
			}

			// 数据之间的分隔竖线
			.cc-stat-divider {
				width: 1rpx;
				height: 32rpx;
				background: rgba(255, 255, 255, 0.2);
			}
		}
	}

	// ----------- 操作栏：白色卡片向上重叠头部
	.cc-actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		margin: -48rpx 24rpx 0;
		padding: 30rpx 0;
		background: #fff;
		border-radius: 24rpx;
		box-shadow: 0 10rpx 30rpx rgba(12, 40, 92, 0.12);
		position: relative;
		z-index: 2;

		.ca-item {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 12rpx;

			&.disabled {
				opacity: 0.35;
			}

			// 每个操作图标配独立的柔和渐变底色，更有品质感
			.ca-icon {
				width: 76rpx;
				height: 76rpx;
				border-radius: 50%;
				background: $blue-soft;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 32rpx;

				&.ca-icon-chat {
					background: linear-gradient(135deg, #e6f0ff 0%, #d4e5ff 100%);
				}
				&.ca-icon-edit {
					background: linear-gradient(135deg, #e5f8ef 0%, #d3f0e2 100%);
				}
				&.ca-icon-phone {
					background: linear-gradient(135deg, #fff2e2 0%, #ffe6c8 100%);
				}
				&.ca-icon-transfer {
					background: linear-gradient(135deg, #f0ebfd 0%, #e3d9fb 100%);
				}
			}
			.ca-text {
				font-size: 22rpx;
				color: #4a5160;
			}
		}
	}

	// ----------- Tabs：分段控件（灰色轨道 + 白色选中胶囊）
	.tabs {
		flex-shrink: 0;
		padding: 20rpx 24rpx 4rpx;

		.tabs-track {
			display: flex;
			padding: 6rpx;
			border-radius: 999rpx;
			background: #e7ebf1;
		}

		.tab {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8rpx;
			padding: 16rpx 0;
			border-radius: 999rpx;
			font-size: 26rpx;
			color: $t2;

			&.active {
				background: #fff;
				color: $t1;
				font-weight: 600;
				box-shadow: 0 4rpx 12rpx rgba(12, 40, 92, 0.12);

				.tab-count {
					background: $blue-soft;
					color: $blue;
				}
			}

			// 数字角标：小胶囊
			.tab-count {
				padding: 2rpx 12rpx;
				border-radius: 999rpx;
				background: rgba(255, 255, 255, 0.75);
				font-size: 20rpx;
				color: $t3;
			}
		}
	}

	// ----------- swiper 内容区
	.swiper-box {
		flex: 1;
		min-height: 0;

		.tab-scroll {
			height: 100%;
			box-sizing: border-box;
		}
	}

	// ----------- 客户动态
	.trend-top {
		display: flex;
		align-items: center;
		gap: 20rpx;
		padding: 24rpx 32rpx 12rpx;

		.tt-filter {
			display: inline-flex;
			align-items: center;
			gap: 6rpx;
			padding: 10rpx 22rpx;
			border-radius: 999rpx;
			background: #fff;
			border: 1rpx solid $line;
			font-size: 23rpx;
			color: $t2;

			.tt-filter-arrow {
				font-size: 18rpx;
				color: $t3;
			}
		}
	}

	// 动态时间轴
	.trend-list {
		position: relative;
		padding: 24rpx 32rpx 20rpx 72rpx;

		// 竖线更细更淡，降低存在感
		.trend-line {
			position: absolute;
			left: 47rpx;
			top: 40rpx;
			bottom: 40rpx;
			width: 2rpx;
			background: linear-gradient(180deg, #dde4ee 0%, #eef1f5 100%);
		}

		.trend-item {
			position: relative;
			margin-bottom: 24rpx;

			// 时间轴节点：外发光圆点
			.trend-node {
				position: absolute;
				left: -32rpx;
				top: 8rpx;
				width: 18rpx;
				height: 18rpx;
				border-radius: 50%;
				background: #fff;
				border: 4rpx solid $blue;
				box-shadow: 0 0 0 6rpx rgba(20, 111, 246, 0.12);
				box-sizing: border-box;

				&.is-download {
					border-color: $red;
					box-shadow: 0 0 0 6rpx rgba(224, 101, 96, 0.12);
				}
			}

			.trend-content {
				background: #fff;
				border-radius: 20rpx;
				padding: 22rpx 24rpx;
				box-shadow: 0 2rpx 6rpx rgba(12, 40, 92, 0.04), 0 10rpx 24rpx rgba(12, 40, 92, 0.06);

				.trend-head {
					display: flex;
					align-items: center;
					justify-content: space-between;

					// 动态类型：彩色徽章
					.trend-type {
						font-size: 22rpx;
						font-weight: 600;
						color: $blue;
						background: $blue-soft;
						padding: 6rpx 20rpx;
						border-radius: 999rpx;

						&.is-download {
							color: $red;
							background: #fdeceb;
						}
					}
					.trend-time {
						font-size: 21rpx;
						color: $t3;
					}
				}

				// 产品行：浅灰内嵌面板，层次更清晰
				.trend-prod {
					margin-top: 16rpx;
					display: flex;
					align-items: center;
					gap: 16rpx;
					padding: 14rpx 16rpx;
					border-radius: 14rpx;
					background: #f6f8fb;

					.trend-prod-img {
						width: 64rpx;
						height: 64rpx;
						border-radius: 10rpx;
						background: #eceef1;
						flex-shrink: 0;
					}
					.trend-prod-name {
						flex: 1;
						font-size: 24rpx;
						color: $t1;
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
					}
				}
			}
		}
	}

	// 放弃按钮：白底红字描边，弱化但醒目
	.trend-abandon {
		margin: 8rpx 32rpx 48rpx;
		text-align: center;
		padding: 24rpx 0;
		border-radius: 16rpx;
		background: #fff;
		border: 1rpx solid #f3d4d2;
		font-size: 25rpx;
		color: $red;
	}

	// ----------- 跟进记录
	.record-list {
		padding: 28rpx 32rpx 48rpx;

		.record-item {
			display: flex;

			.record-left {
				flex-shrink: 0;
				width: 168rpx;
				display: flex;
				flex-direction: column;

				.record-date {
					font-size: 25rpx;
					font-weight: 600;
					color: $t1;
					line-height: 1.3;
				}
				.record-time {
					margin-top: 4rpx;
					font-size: 21rpx;
					color: $t3;
				}
				// 时间轴连接线
				.record-bar {
					flex: 1;
					margin: 14rpx 0 14rpx 50rpx;
					width: 2rpx;
					background: linear-gradient(180deg, #dde4ee 0%, #eef1f5 100%);
				}
			}

			// 右侧内容做成白卡片，更像"记录单"
			.record-right {
				flex: 1;
				min-width: 0;
				margin-bottom: 24rpx;
				padding: 22rpx 24rpx;
				background: #fff;
				border-radius: 20rpx;
				box-shadow: 0 2rpx 6rpx rgba(12, 40, 92, 0.04), 0 10rpx 24rpx rgba(12, 40, 92, 0.06);

				.record-row {
					display: flex;

					& + .record-row {
						margin-top: 10rpx;
					}

					.record-label {
						flex-shrink: 0;
						width: 104rpx;
						font-size: 23rpx;
						color: $t3;
						text-align: right;
						margin-right: 16rpx;
						line-height: 1.5;
					}
					.record-desc {
						flex: 1;
						font-size: 23rpx;
						color: $t1;
						line-height: 1.5;
					}
				}

				// 转交/放弃记录高亮：浅红底卡片
				&.is-notice {
					background: #fdf4f3;

					.record-label,
					.record-desc {
						color: $red;
					}
				}
			}
		}
	}

	// ----------- 资料tab
	.info-list {
		margin: 28rpx 32rpx 0;
		background: #fff;
		border-radius: 20rpx;
		padding: 8rpx 28rpx 12rpx;
		box-shadow: 0 2rpx 6rpx rgba(12, 40, 92, 0.04), 0 10rpx 24rpx rgba(12, 40, 92, 0.06);

		.info-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 30rpx 0;
			border-bottom: 1rpx solid $line;

			&:last-child {
				border-bottom: none;
			}

			.info-label {
				font-size: 26rpx;
				color: $t2;
			}
			.info-value {
				flex: 1;
				text-align: right;
				font-size: 26rpx;
				font-weight: 500;
				color: $t1;
				margin-left: 24rpx;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
		}
	}

	// 分区标题：蓝色渐变竖条 + 加粗文字
	.info-sec-title {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 24rpx 0 8rpx;
		font-size: 27rpx;
		font-weight: 600;
		color: $t1;

		.ist-bar {
			width: 8rpx;
			height: 28rpx;
			border-radius: 4rpx;
			background: linear-gradient(180deg, #4a9bff 0%, #146ff6 100%);
		}
	}

	.info-prod-section {
		margin: 24rpx 32rpx 48rpx;
		background: #fff;
		border-radius: 20rpx;
		padding: 8rpx 28rpx 12rpx;
		box-shadow: 0 2rpx 6rpx rgba(12, 40, 92, 0.04), 0 10rpx 24rpx rgba(12, 40, 92, 0.06);

		.info-prod-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 22rpx 0;
			border-bottom: 1rpx solid $line;

			&:last-child {
				border-bottom: none;
			}

			.info-prod-name {
				flex: 1;
				font-size: 24rpx;
				color: $t1;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
				margin-right: 16rpx;
			}
			.info-prod-company {
				flex-shrink: 0;
				font-size: 22rpx;
				color: $t3;
				max-width: 240rpx;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
		}
	}

	// ----------- 空状态
	.tab-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 150rpx;

		.empty-icon {
			width: 140rpx;
			height: 140rpx;
			border-radius: 50%;
			background: #ecf0f6;
			font-size: 64rpx;
			color: #c3cbd8;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.empty-text {
			margin-top: 22rpx;
			font-size: 26rpx;
			color: $t3;
		}
	}

	// ----------- 底部抢线索
	.rob-bar {
		flex-shrink: 0;
		padding: 20rpx 32rpx;
		background: #fff;
		box-shadow: 0 -4rpx 16rpx rgba(12, 40, 92, 0.06);

		.rob-btn {
			text-align: center;
			padding: 28rpx 0;
			border-radius: 999rpx;
			background: linear-gradient(135deg, #4a9bff 0%, #146ff6 100%);
			font-size: 30rpx;
			font-weight: 600;
			letter-spacing: 6rpx;
			color: #fff;
			box-shadow: 0 10rpx 24rpx rgba(20, 111, 246, 0.35);
		}
	}

	// ----------- 弹窗
	.pop-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(20, 28, 40, 0.45);
		z-index: 99;
		display: flex;
		align-items: flex-end;

		.pop-panel {
			width: 100%;
			background: #fff;
			border-radius: 32rpx 32rpx 0 0;
			padding: 8rpx 0 calc(20rpx + env(safe-area-inset-bottom));

			.pop-title {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 30rpx 32rpx 20rpx;

				text:first-child {
					font-size: 30rpx;
					font-weight: 600;
					color: $t1;
				}
				.pop-close {
					font-size: 32rpx;
					color: $t3;
				}
			}

			.pop-option {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 28rpx 32rpx;
				border-top: 1rpx solid $line;

				&.on {
					text:first-child {
						color: $blue;
						font-weight: 600;
					}
					.pop-check {
						color: $blue;
					}
				}

				text:first-child {
					font-size: 28rpx;
					color: $t1;
				}
				.pop-check {
					font-size: 28rpx;
					color: $blue;
				}
			}

			// 放弃弹窗的输入框
			.abandon-input {
				margin: 8rpx 32rpx 24rpx;
				width: calc(100% - 64rpx);
				height: 180rpx;
				background: $bg;
				border-radius: 14rpx;
				padding: 20rpx;
				font-size: 26rpx;
				color: $t1;
				box-sizing: border-box;
			}

			.abandon-btns {
				display: flex;
				gap: 16rpx;
				padding: 0 32rpx;

				.abandon-btn {
					flex: 1;
					text-align: center;
					padding: 24rpx 0;
					border-radius: 999rpx;
					font-size: 28rpx;

					&.cancel {
						background: $bg;
						color: $t2;
					}
					&.confirm {
						background: linear-gradient(135deg, #4a9bff 0%, #146ff6 100%);
						color: #fff;
						box-shadow: 0 6rpx 16rpx rgba(20, 111, 246, 0.28);
					}
				}
			}
		}
	}
}
</style>
