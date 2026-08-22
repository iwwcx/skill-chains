<!-- 客户主页（线索详情） -->
<template>
	<view class="client-home">
		<!-- 顶部客户信息区：浅色 editorial 排版 -->
		<view class="client-card">
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

		</view>

		<!-- 操作栏：整条白色胶囊，单字圆图标+文字横排，发丝竖线分隔；已抢才显示 -->
		<view class="cc-actions" v-if="isRobed">
			<view class="ca-item" :class="{ disabled: !isSelf }" @tap="handleContact">
				<view class="ca-chip">沟</view>
				<text class="ca-text">在线沟通</text>
			</view>
			<view class="ca-item" :class="{ disabled: !isSelf }" @tap="handleAddRecord">
				<view class="ca-chip">跟</view>
				<text class="ca-text">写跟进</text>
			</view>
			<view class="ca-item" :class="{ disabled: !isSelf }" @tap="handlePhone">
				<view class="ca-chip">电</view>
				<text class="ca-text">电话</text>
			</view>
			<view class="ca-item" :class="{ disabled: !isSelf && !isAdmin }" @tap="handleTransfer">
				<view class="ca-chip">转</view>
				<text class="ca-text">转交</text>
			</view>
		</view>

		<!-- Tabs：下划线式 -->
		<view class="tabs">
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

		<!-- 内容区 -->
		<swiper :current="swiperIndex" @animationfinish="onSwiperChange" class="swiper-box">
			<!-- 客户动态 -->
			<swiper-item>
				<scroll-view class="tab-scroll" scroll-y :show-scrollbar="false" :refresher-enabled="true" :refresher-triggered="trendRefresh" @refresherrefresh="onTrendRefresh">
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

				</scroll-view>
			</swiper-item>

			<!-- 跟进记录 -->
			<swiper-item>
				<scroll-view class="tab-scroll" scroll-y :show-scrollbar="false" :refresher-enabled="true" :refresher-triggered="recordRefresh" @refresherrefresh="onRecordRefresh">
					<view class="record-list" v-if="recordList.length">
						<view class="record-item" v-for="(item, index) in recordList" :key="index">
							<view class="record-left">
								<text class="record-date">{{ formatDate(item.createdAt) }}</text>
								<text class="record-time">{{ formatTime(item.createdAt) }}</text>
								<view class="record-bar" v-if="index !== recordList.length - 1"></view>
							</view>
							<view class="record-right" :class="{ 'is-notice': item.isTransfer === 1 || item.isTransfer === 2 }">
								<!-- 卡头：状态徽章 -->
								<view class="record-head">
									<text class="record-status">{{ item.intention }}</text>
								</view>
								<!-- 卡身：记录内容 -->
								<view class="record-body">
									<text class="record-body-label">{{ recordContentLabel[item.isTransfer] || '记录' }}</text>
									<text class="record-body-content">{{ item.content }}</text>
								</view>
								<!-- 卡脚：跟进人，发丝线隔开 -->
								<view class="record-foot">
									<text class="record-foot-text">{{ recordNameLabel[item.isTransfer] || '跟进人' }} · {{ item.followUserName }}</text>
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
				<scroll-view class="tab-scroll" scroll-y :show-scrollbar="false">
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

		<!-- 底部放弃线索按钮：已抢且是自己的线索时显示，红底白字固定底部 -->
		<view v-if="isRobed && isSelf" class="rob-bar">
			<view class="rob-btn rob-abandon" @tap="showAbandonPop = true">放弃线索</view>
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
import { startChat } from '@/im-message/api/index.js'
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
		// ----------- 在线沟通：先同步会话到服务端，再跳转单聊聊天页（与组织成员页 onStartChat 同一套）
		async handleContact() {
			if (!this.isSelf) {
				uni.showToast({ icon: 'none', title: '不是你的线索哦' })
				return
			}
			const dataId = String(this.clueData.userId || '') // 客户用户ID
			if (!dataId) {
				uni.showToast({ icon: 'none', title: '用户信息异常' })
				return
			}
			const name = this.clueData.userName || '' // 客户姓名
			const logo = this.clueData.userLogo || '' // 客户头像
			try {
				await startChat({ chatCategoryId: 20, chatDataId: dataId })
			} catch (e) {
				console.warn('同步会话失败:', e)
			}
			const key = `20:${dataId}` // 单聊会话标识
			uni.navigateTo({
				url: `/im-message/pages/chat/detail?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&logo=${encodeURIComponent(logo)}`
			})
		},
		// ----------- 写跟进：跳转写跟进页，带上线索id和当前状态回显
		handleAddRecord() {
			if (!this.isSelf) {
				uni.showToast({ icon: 'none', title: '不是你的线索哦' })
				return
			}
			uni.navigateTo({
				url: `/pages-sub/clue/add-follow-record?id=${this.id}&status=${encodeURIComponent(this.clueData.status || '')}`
			})
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
		// ----------- 转交：跳转团队成员选择页（自己的线索或管理员可转）
		handleTransfer() {
			if (!this.isSelf && !this.isAdmin) {
				uni.showToast({ icon: 'none', title: '无权操作' })
				return
			}
			uni.navigateTo({ url: `/pages-sub/clue/clue-transfer?id=${this.id}` })
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
// ----------- 「线索账本」editorial 色板（与全站一致）
$paper: #f4f6fa; // 页面底色（冷调浅蓝灰）
$card: #ffffff; // 卡片白
$ink: #191c22; // 主文字
$t2: #6b7079; // 次文字
$t3: #a6abb4; // 弱文字
$line: rgba(25, 28, 34, 0.08); // 发丝线
$blue: #146ff6; // 品牌主色
$blue-soft: #ebf2fe; // 主色浅底
$red: #c9543f; // 低饱和赭红

.client-home {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $paper;

	// ----------- 顶部客户信息区：浅色 editorial，品牌蓝极浅渐变落到底色
	.client-card {
		flex-shrink: 0;
		padding: 36rpx 36rpx 40rpx;
		background: linear-gradient(180deg, #e0ecfd 0%, rgba(244, 246, 250, 0) 100%);

		.cc-main {
			display: flex;
			align-items: center;
			gap: 24rpx;

			// 头像：大圆 + 白环 + 轻投影
			.cc-avatar {
				width: 120rpx;
				height: 120rpx;
				border-radius: 50%;
				background: #eceef1;
				border: 5rpx solid #fff;
				box-shadow: 0 10rpx 28rpx rgba(25, 28, 34, 0.1);
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
					font-size: 44rpx;
					font-weight: 700;
					letter-spacing: 3rpx;
					color: $ink;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
				.cc-company {
					font-size: 24rpx;
					color: $t2;
					letter-spacing: 1rpx;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
			}

			// 状态标签：蓝色描边胶囊，点击改状态
			.cc-status {
				flex-shrink: 0;
				display: inline-flex;
				align-items: center;
				gap: 6rpx;
				padding: 10rpx 22rpx;
				border-radius: 999rpx;
				background: $card;
				border: 1rpx solid rgba(20, 111, 246, 0.35);
				font-size: 23rpx;
				font-weight: 600;
				color: $blue;

				.cc-status-arrow {
					font-size: 24rpx;
					color: $blue;
				}
			}
		}

	}


	// ----------- 操作栏：整条白色胶囊，单元格发丝竖线分隔
	.cc-actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		margin: 4rpx 36rpx 0;
		background: $card;
		border-radius: 999rpx;
		box-shadow: 0 6rpx 20rpx rgba(25, 28, 34, 0.06);
		position: relative;
		z-index: 2;

		.ca-item {
			flex: 1;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10rpx;
			padding: 26rpx 0;
			transition: opacity 0.15s ease;

			// 单元格之间的发丝竖线（第一个不要）
			& + .ca-item::before {
				content: '';
				position: absolute;
				left: 0;
				top: 50%;
				transform: translateY(-50%);
				width: 1rpx;
				height: 36rpx;
				background: $line;
			}

			&:active {
				opacity: 0.55;
			}

			&.disabled {
				opacity: 0.3;
			}

			// 单字圆形图标：浅蓝底 + 蓝字，统一克制
			.ca-chip {
				width: 44rpx;
				height: 44rpx;
				border-radius: 50%;
				background: $blue-soft;
				color: $blue;
				font-size: 22rpx;
				font-weight: 600;
				display: flex;
				align-items: center;
				justify-content: center;
				line-height: 1;
			}
			.ca-text {
				font-size: 24rpx;
				font-weight: 500;
				color: $ink;
				letter-spacing: 1rpx;
			}
		}
	}

	// ----------- Tabs：下划线式
	.tabs {
		flex-shrink: 0;
		display: flex;
		padding: 0 36rpx;
		margin-top: 24rpx;
		border-bottom: 1rpx solid $line;

		.tab {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8rpx;
			padding: 26rpx 4rpx;
			margin-right: 56rpx;
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

				.tab-count {
					color: $blue;
				}
			}

			// 数字角标：纯文字，等宽数字
			.tab-count {
				font-size: 22rpx;
				color: $t3;
				font-variant-numeric: tabular-nums;
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

			// 隐藏滚动条但保留滚动
			&::-webkit-scrollbar {
				display: none;
				width: 0 !important;
			}
		}
	}

	// ----------- 客户动态
	.trend-top {
		display: flex;
		align-items: center;
		gap: 20rpx;
		padding: 28rpx 36rpx 8rpx;

		.tt-filter {
			display: inline-flex;
			align-items: center;
			gap: 6rpx;
			padding: 10rpx 22rpx;
			border-radius: 999rpx;
			background: $card;
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
		padding: 28rpx 36rpx 20rpx 76rpx;

		// 竖线更细更淡，降低存在感
		.trend-line {
			position: absolute;
			left: 51rpx;
			top: 44rpx;
			bottom: 40rpx;
			width: 1rpx;
			background: $line;
		}

		.trend-item {
			position: relative;
			margin-bottom: 28rpx;

			// 时间轴节点：实心小圆点
			.trend-node {
				position: absolute;
				left: -31rpx;
				top: 10rpx;
				width: 12rpx;
				height: 12rpx;
				border-radius: 50%;
				background: $blue;
				box-shadow: 0 0 0 6rpx rgba(20, 111, 246, 0.1);

				&.is-download {
					background: $red;
					box-shadow: 0 0 0 6rpx rgba(201, 84, 63, 0.1);
				}
			}

			.trend-content {
				background: $card;
				border-radius: 16rpx;
				padding: 24rpx;
				box-shadow: 0 4rpx 20rpx rgba(25, 28, 34, 0.04);

				.trend-head {
					display: flex;
					align-items: center;
					justify-content: space-between;

					// 动态类型：纯文字 + 前置小圆点，不套胶囊
					.trend-type {
						font-size: 23rpx;
						font-weight: 600;
						color: $blue;
						letter-spacing: 1rpx;

						&.is-download {
							color: $red;
						}
					}
					.trend-time {
						font-size: 21rpx;
						color: $t3;
						font-variant-numeric: tabular-nums;
					}
				}

				// 产品行：纸白内嵌行
				.trend-prod {
					margin-top: 18rpx;
					display: flex;
					align-items: center;
					gap: 16rpx;
					padding: 14rpx 18rpx;
					border-radius: 12rpx;
					background: #f5f7fa;

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
						color: $ink;
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
					}
				}
			}
		}
	}

	// 放弃按钮：鲜红底白字，固定在底部（复用 rob-bar / rob-btn 结构，只覆盖颜色）
	// 注意：.rob-btn 嵌套在 .rob-bar 里，编译后是 .rob-bar .rob-btn 且位置靠后，
	// 所以这里要用 .rob-bar .rob-btn.rob-abandon 三级选择器才能盖过蓝色
	.rob-bar .rob-btn.rob-abandon {
		background: #f53f3f;
		box-shadow: 0 10rpx 24rpx rgba(245, 63, 63, 0.32);
	}

	// ----------- 跟进记录
	.record-list {
		padding: 32rpx 36rpx 56rpx;

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
					color: $ink;
					line-height: 1.3;
					font-variant-numeric: tabular-nums;
				}
				.record-time {
					margin-top: 4rpx;
					font-size: 21rpx;
					color: $t3;
					font-variant-numeric: tabular-nums;
				}
				// 时间轴连接线
				.record-bar {
					flex: 1;
					margin: 14rpx 0 14rpx 50rpx;
					width: 1rpx;
					background: $line;
				}
			}

			// 右侧内容：精致的"记录单"卡片
			.record-right {
				flex: 1;
				min-width: 0;
				margin-bottom: 24rpx;
				padding: 24rpx 28rpx;
				background: $card;
				border-radius: 18rpx;
				border: 1rpx solid $line;
				box-shadow: 0 6rpx 20rpx rgba(25, 28, 34, 0.05);

				// 卡头：状态徽章胶囊
				.record-head {
					display: flex;
					align-items: center;

					.record-status {
						padding: 6rpx 20rpx;
						border-radius: 999rpx;
						background: $blue-soft;
						font-size: 22rpx;
						font-weight: 600;
						color: $blue;
						letter-spacing: 1rpx;
					}
				}

				// 卡身：小标签 + 内容正文
				.record-body {
					margin-top: 18rpx;

					.record-body-label {
						display: block;
						font-size: 21rpx;
						color: $t3;
						letter-spacing: 2rpx;
					}
					.record-body-content {
						display: block;
						margin-top: 8rpx;
						font-size: 27rpx;
						color: $ink;
						line-height: 1.6;
						word-break: break-all;
					}
				}

				// 卡脚：跟进人，发丝线隔开
				.record-foot {
					margin-top: 18rpx;
					padding-top: 16rpx;
					border-top: 1rpx solid $line;

					.record-foot-text {
						font-size: 22rpx;
						color: $t2;
						letter-spacing: 1rpx;
					}
				}

				// 转交/放弃记录高亮：赭红徽章 + 左侧标线
				&.is-notice {
					border-left: 4rpx solid $red;

					.record-head .record-status {
						background: #faecea;
						color: $red;
					}
					.record-body .record-body-content {
						color: $red;
					}
				}
			}
		}
	}

	// ----------- 资料tab
	.info-list {
		margin: 32rpx 24rpx 0;
		background: $card;
		border-radius: 20rpx;
		padding: 8rpx 32rpx 12rpx;
		box-shadow: 0 4rpx 20rpx rgba(25, 28, 34, 0.04);

		.info-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 32rpx 0;
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
				color: $ink;
				margin-left: 24rpx;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
		}
	}

	// 分区标题：蓝色账本标线 + 加粗文字
	.info-sec-title {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 28rpx 0 8rpx;
		font-size: 27rpx;
		font-weight: 700;
		color: $ink;
		letter-spacing: 2rpx;

		.ist-bar {
			width: 6rpx;
			height: 28rpx;
			border-radius: 3rpx;
			background: $blue;
		}
	}

	.info-prod-section {
		margin: 28rpx 24rpx 56rpx;
		background: $card;
		border-radius: 20rpx;
		padding: 8rpx 32rpx 12rpx;
		box-shadow: 0 4rpx 20rpx rgba(25, 28, 34, 0.04);

		.info-prod-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 24rpx 0;
			border-bottom: 1rpx solid $line;

			&:last-child {
				border-bottom: none;
			}

			.info-prod-name {
				flex: 1;
				font-size: 24rpx;
				color: $ink;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
				margin-right: 16rpx;
			}
			.info-prod-company {
				flex-shrink: 0;
				font-size: 22rpx;
				color: #676767;
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
			background: #eceef1;
			font-size: 64rpx;
			color: #b6bcc5;
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
		background: $card;
		border-top: 1rpx solid $line;

		.rob-btn {
			text-align: center;
			padding: 28rpx 0;
			border-radius: 999rpx;
			background: $blue;
			font-size: 30rpx;
			font-weight: 600;
			letter-spacing: 8rpx;
			color: #fff;
			box-shadow: 0 10rpx 24rpx rgba(20, 111, 246, 0.3);
		}
	}

	// ----------- 弹窗
	.pop-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(25, 28, 34, 0.45);
		z-index: 99;
		display: flex;
		align-items: flex-end;

		.pop-panel {
			width: 100%;
			background: $card;
			border-radius: 32rpx 32rpx 0 0;
			padding: 8rpx 0 calc(20rpx + env(safe-area-inset-bottom));

			.pop-title {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 34rpx 36rpx 24rpx;

				text:first-child {
					font-size: 32rpx;
					font-weight: 700;
					color: $ink;
					letter-spacing: 2rpx;
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
				padding: 30rpx 36rpx;
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
					color: $ink;
				}
				.pop-check {
					font-size: 28rpx;
					color: $blue;
				}
			}

			// 放弃弹窗的输入框
			.abandon-input {
				margin: 8rpx 36rpx 28rpx;
				width: calc(100% - 72rpx);
				height: 180rpx;
				background: $paper;
				border-radius: 14rpx;
				padding: 20rpx;
				font-size: 26rpx;
				color: $ink;
				box-sizing: border-box;
			}

			.abandon-btns {
				display: flex;
				gap: 20rpx;
				padding: 0 36rpx;

				.abandon-btn {
					flex: 1;
					text-align: center;
					padding: 24rpx 0;
					border-radius: 999rpx;
					font-size: 28rpx;

					&.cancel {
						background: #eef1f5;
						color: $t2;
					}
					&.confirm {
						background: $blue;
						font-weight: 600;
						color: #fff;
						box-shadow: 0 6rpx 16rpx rgba(20, 111, 246, 0.26);
					}
				}
			}
		}
	}
}
</style>
