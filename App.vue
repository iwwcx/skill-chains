<script>
	import { RecentService } from '@/im-message/services/recent.js'
	import { normalizeUser } from '@/im-message/services/util.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 启动时归一化 storage 里的 userInfo（补大写字段别名），保证已登录的旧数据也能被 IM 模块正常使用
			try {
				const userInfo = uni.getStorageSync('userInfo')
				if (userInfo) uni.setStorageSync('userInfo', normalizeUser(userInfo))
			} catch (e) {}
			// App 启动延迟调一次接口校准消息 tab 未读角标（onLaunch 时 tabBar 还没渲染好，延迟 1.5 秒等 tabBar 就绪再设角标）
			setTimeout(() => {
				RecentService.refreshBadge()
			}, 1500)
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
