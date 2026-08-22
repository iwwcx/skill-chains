<!-- 写跟进（新增线索跟进记录） -->
<template>
	<view class="record-page">
		<scroll-view class="record-scroll" scroll-y :show-scrollbar="false">
			<!-- 跟进方式 -->
			<view class="form-sec">
				<view class="sec-title">
					<text class="sec-bar"></text>
					<text>跟进方式</text>
				</view>
				<view class="chip-row">
					<view class="chip" :class="{ on: type === 1 }" @tap="type = 1">打电话</view>
					<view class="chip" :class="{ on: type === 2 }" @tap="type = 2">线上沟通</view>
				</view>
			</view>

			<!-- 状态 -->
			<view class="form-sec">
				<view class="sec-title">
					<text class="sec-bar"></text>
					<text>状态</text>
				</view>
				<view class="chip-row chip-row-wrap">
					<view class="chip" :class="{ on: status === item }" v-for="item in statusArr" :key="item" @tap="status = item">{{ item }}</view>
				</view>
			</view>

			<!-- 跟进记录 -->
			<view class="form-sec">
				<view class="sec-title">
					<text class="sec-bar"></text>
					<text>跟进记录</text>
				</view>
				<view class="content-box">
					<textarea class="content-input" v-model="content" placeholder="填写跟进信息" maxlength="1000" />
					<text class="content-count">{{ content.length }}/1000</text>
				</view>
			</view>
		</scroll-view>

		<!-- 底部提交按钮：固定 -->
		<view class="submit-bar">
			<view class="submit-btn" :class="{ disabled: submitting }" @tap="onSubmit">提交</view>
		</view>
	</view>
</template>

<script>
import { addFollowRecord } from '@/static/api/index.js'

// ----------- 可选跟进状态（与 skill-chain 保持一致；再访待跟是系统状态不让手选）
const STATUS_ARR = ['未跟进', '跟进中', '有意向', '无效', '完结', '已成交', '复购']

export default {
	data() {
		return {
			id: '', // 线索id
			type: 2, // 跟进方式：1=打电话 2=线上沟通
			status: '', // 跟进状态
			statusArr: STATUS_ARR, // 状态选项
			content: '', // 跟进内容
			submitting: false // 提交中状态（防重复提交）
		}
	},
	onLoad(options) {
		// 从路由参数拿 id 和当前状态（状态合法才回显选中）
		this.id = options.id || ''
		const status = options.status || ''
		if (this.statusArr.includes(status)) {
			this.status = status
		}
	},
	methods: {
		// ----------- 提交跟进记录
		async onSubmit() {
			if (this.submitting) return
			if (!this.status) {
				uni.showToast({ icon: 'none', title: '请选择状态' })
				return
			}
			if (!this.content.trim()) {
				uni.showToast({ icon: 'none', title: '跟进记录不能为空' })
				return
			}
			this.submitting = true
			try {
				const res = await addFollowRecord({
					id: this.id,
					intention: this.status,
					type: this.type,
					content: this.content.trim()
				})
				if (res.code === 0) {
					uni.showToast({ icon: 'success', title: '添加记录成功' })
					// 详情页 onShow 会自动 init 刷新，直接返回即可
					setTimeout(() => uni.navigateBack(), 800)
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

.record-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $paper;

	.record-scroll {
		flex: 1;
		min-height: 0;

		// 隐藏滚动条但保留滚动
		&::-webkit-scrollbar {
			display: none;
			width: 0 !important;
		}
	}

	// ----------- 表单区块：白卡
	.form-sec {
		margin: 24rpx 24rpx 0;
		padding: 28rpx 32rpx 32rpx;
		background: $card;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 20rpx rgba(25, 28, 34, 0.04);

		// 区块标题：蓝色账本标线 + 加粗文字
		.sec-title {
			display: flex;
			align-items: center;
			gap: 12rpx;
			font-size: 28rpx;
			font-weight: 700;
			color: $ink;
			letter-spacing: 2rpx;

			.sec-bar {
				width: 6rpx;
				height: 28rpx;
				border-radius: 3rpx;
				background: $blue;
			}
		}
	}

	// ----------- 选项 chip 行
	.chip-row {
		display: flex;
		margin-top: 26rpx;
		gap: 20rpx;

		&.chip-row-wrap {
			flex-wrap: wrap;
		}

		.chip {
			padding: 16rpx 36rpx;
			border-radius: 999rpx;
			background: #f4f6fa;
			border: 1rpx solid transparent;
			font-size: 26rpx;
			color: $t2;
			transition: all 0.15s ease;

			// 选中：浅蓝底 + 蓝字 + 蓝描边
			&.on {
				background: $blue-soft;
				border-color: rgba(20, 111, 246, 0.35);
				color: $blue;
				font-weight: 600;
			}
		}
	}

	// ----------- 跟进记录输入框
	.content-box {
		margin-top: 26rpx;
		background: #f4f6fa;
		border-radius: 14rpx;
		padding: 22rpx 24rpx;
		position: relative;

		.content-input {
			width: 100%;
			height: 240rpx;
			font-size: 28rpx;
			color: $ink;
			line-height: 1.6;
			box-sizing: border-box;
		}

		// 字数统计：右下角弱文字
		.content-count {
			position: absolute;
			right: 24rpx;
			bottom: 16rpx;
			font-size: 20rpx;
			color: $t3;
			font-variant-numeric: tabular-nums;
		}
	}

	// ----------- 底部提交栏：固定，蓝实心胶囊
	.submit-bar {
		flex-shrink: 0;
		padding: 20rpx 32rpx 30rpx;
		background: $card;
		border-top: 1rpx solid $line;

		.submit-btn {
			text-align: center;
			padding: 28rpx 0;
			border-radius: 999rpx;
			background: $blue;
			font-size: 30rpx;
			font-weight: 600;
			letter-spacing: 8rpx;
			color: #fff;
			box-shadow: 0 10rpx 24rpx rgba(20, 111, 246, 0.3);
			transition: opacity 0.15s ease;

			&:active {
				opacity: 0.85;
			}

			&.disabled {
				opacity: 0.6;
			}
		}
	}
}
</style>
