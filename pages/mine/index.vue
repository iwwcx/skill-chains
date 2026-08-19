<template>
	<view class="mine-page">
		<text>我的</text>
	</view>
</template>

<script>
export default {
	data() {
		return {}
	},
	onShow() {
		// 未登录则跳转登录页
		const token = uni.getStorageSync('token')
		if (!token) {
			uni.redirectTo({ url: '/pages/common/login/index' })
		}
	}
}
</script>

<style lang="scss" scoped>
.mine-page {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100vh;
}
</style>
