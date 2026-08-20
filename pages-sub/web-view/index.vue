<template>
  <!-- 通用 web-view 预览页，直接展示传入的 url，用于 CAD 二维图纸/三维模型在线预览 -->
  <web-view v-if="show" :src="src"></web-view>
</template>

<script>
export default {
  data() {
    return {
      show: false, // 是否显示 web-view，等拿到 url 再渲染，避免 src 为空闪白
      src: '' // web-view 加载的地址
    }
  },
  onLoad(option) {
    // 直接用路由参数里的 url，不做 token 拼接，CAD 查看器自己处理鉴权
    this.src = decodeURIComponent(option.url || '')
    this.show = true
  }
}
</script>
