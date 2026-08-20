<template>
  <view class="chat-root">
    <view class="chat-page" :class="{ 'chat-page-ready': pageReady }">
      <!-- 自定义导航栏：白色背景 + 底部细线，群聊标题做成可点击按钮带 ⓘ 图标 -->
      <view class="chat-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="chat-navbar-inner">
          <!-- 左侧返回：用 CSS border 画箭头，比字符精致 -->
          <view class="chat-navbar-back" @tap="goBack">
            <view class="chat-navbar-back-arrow"></view>
          </view>
          <!-- 标题：群聊/单聊都用品牌蓝色文字提示可点击，群聊显示"群名(N)" -->
          <view
            v-if="categoryId === '52'"
            class="chat-navbar-title-btn"
            @tap="onTitleTap"
          >
            <text class="chat-navbar-title chat-navbar-title-link" :style="{ maxWidth: titleMaxWidth + 'px' }">{{ interlocutorName || '聊天' }}</text>
            <text class="chat-navbar-title-count">({{ groupMemberCount }})</text>
          </view>
          <view v-else class="chat-navbar-title-btn" @tap="onTitleTap">
            <text class="chat-navbar-title chat-navbar-title-link" :style="{ maxWidth: titleMaxWidth + 'px' }">{{ interlocutorName || '聊天' }}</text>
          </view>
        </view>
      </view>
      <!-- 消息列表区域 -->
      <scroll-view
        class="chat-content"
        scroll-y
        :scroll-into-view="scrollToId"
        :scroll-with-animation="scrollWithAnimation"
        @scrolltoupper="loadMore"
        @touchstart="onListTouchStart"
        @tap="onContentTap"
      >
        <!-- 内容包裹层，用于测量内容总高度 -->
        <view class="chat-content-scroll">
        <!-- 加载更多提示 -->
        <!-- <view v-if="hasMore" class="load-more-tip">
          <text class="load-more-text">加载更多...</text>
        </view> -->

        <!-- 消息列表 -->
        <template v-for="(msg, index) in messageList">
          <!-- 时间分割线线 -->
          <view v-if="msg.ShowTime" :key="'time-' + msg.MsgID" class="time-divider">
            <text class="time-divider-text">{{ formatMsgTime(msg.MsgTime) }}</text>
          </view>

          <!-- 撤回提示 -->
          <view v-if="msg.IsRevoke" :key="'msg-revoke-' + msg.MsgID" class="msg-revoke-tip">
            <text>{{ msg.RevokeText }}</text>
          </view>

          <!-- 对方消息 -->
          <view :key="'msg-left-' + msg.MsgID" class="msg-row msg-row-left" v-else-if="msg.SendUserID !== myUserId">
            <image
              class="msg-avatar"
              :src="getLeftAvatar(msg)"
              mode="aspectFill"
              @error="onAvatarLoadError('u' + msg.SendUserID)"
              @tap="onAvatarTap(msg)"
              @longpress.stop="onAvatarLongPress(msg)"
            />
            <view class="msg-content-col">
              <text v-if="categoryId === '52' && groupMembers[msg.SendUserID]" class="msg-sender-name">{{ groupMembers[msg.SendUserID].UserName }}</text>
              <view :id="'msg-bubble-' + index" class="msg-bubble msg-bubble-left" :class="{ 'msg-bubble-image': msg.MsgType === 2, 'msg-bubble-link': msg.MsgType === 21, 'msg-bubble-file': msg.MsgType === 7, 'msg-bubble-inquiry': msg.MsgType === 31, 'msg-bubble-quote': msg.MsgType === 32 }" @longpress.stop.prevent="onMsgLongPress(msg, index)">
                <!-- ------------------ 图片（lazy-load 懒加载，可视区外的图片不加载，减少进入页面时的解码卡顿） ---------------- -->
                <image v-if="msg.MsgType === 2" class="msg-image" :class="{ 'msg-image-landscape': msg.ImageWidth > msg.ImageHeight }" :src="msg.LocalImage || msg.ImageUrl" mode="widthFix" lazy-load @load="onImageLoad($event, msg)" @tap="previewImage(msg)" />
                <!-- ------------------ 语音 ---------------- -->
                <view v-else-if="msg.MsgType === 8" class="msg-audio" :class="{ playing: playingAudioId === msg.MsgID }" @tap.stop="toggleAudio(msg)">
                  <view class="audio-wave"><text></text><text></text><text></text><text></text><text></text></view>
                  <text class="audio-duration">{{ msg.AudioDuration }}″</text>
                </view>
                <!-- ------------------ 文件 ---------------- -->
                <view v-else-if="msg.MsgType === 7" class="msg-file-card" @tap.stop="onFileTap(msg)">
                  <view class="file-card-icon" :class="getFileIconClass(msg.FileName)"><text>{{ getFileExt(msg.FileName).slice(0, 4) }}</text></view>
                  <view class="file-card-info">
                    <text class="file-card-name">{{ msg.FileName }}</text>
                    <text class="file-card-size">{{ formatFileSize(msg.FileSize) }}</text>
                  </view>
                </view>
                <!-- ------------------ 链接卡片 ---------------- -->
                <view v-else-if="msg.MsgType === 21" class="msg-link-card" @tap.stop="onLinkTap(msg)">
                  <text class="link-card-header">分享链接</text>
                  <view class="link-card-body">
                    <image v-if="msg.LinkLogo" class="link-card-logo" :src="msg.LinkLogo" mode="aspectFill" />
                    <view v-else class="link-card-logo-placeholder"><text>📦</text></view>
                    <view class="link-card-info">
                      <text class="link-card-title">{{ msg.LinkTitle }}</text>
                      <text class="link-card-url">{{ msg.LinkUrl }}</text>
                    </view>
                  </view>
                </view>
                <!-- ------------------ 询价卡片 ---------------- -->
                <view v-else-if="msg.MsgType === 31" class="msg-inquiry-card" @tap.stop="onInquiryTap(msg)">
                  <view class="inquiry-card-header">
                    <text class="inquiry-card-icon">🔔</text>
                    <text class="inquiry-card-title">您有新的询价单待查看</text>
                  </view>
                  <view class="inquiry-card-body">
                    <text class="inquiry-card-highlight">{{ parseInquiryCard(msg).title || '询价单' }}</text>
                    <view class="inquiry-card-row" v-if="parseInquiryCard(msg).model">
                      <text class="inquiry-card-label">产品型号</text>
                      <text class="inquiry-card-value">{{ parseInquiryCard(msg).model }}</text>
                    </view>
                    <view class="inquiry-card-row" v-if="parseInquiryCard(msg).quantity">
                      <text class="inquiry-card-label">采购数量</text>
                      <text class="inquiry-card-value inquiry-card-value-strong">{{ parseInquiryCard(msg).quantity }}</text>
                    </view>
                    <view class="inquiry-card-row" v-if="parseInquiryCard(msg).deliveryTime">
                      <text class="inquiry-card-label">交货时间</text>
                      <text class="inquiry-card-value">{{ parseInquiryCard(msg).deliveryTime }}</text>
                    </view>
                    <view class="inquiry-card-row" v-if="parseInquiryCard(msg).location">
                      <text class="inquiry-card-label">交货地点</text>
                      <text class="inquiry-card-value">{{ parseInquiryCard(msg).location }}</text>
                    </view>
                    <view class="inquiry-card-row" v-if="parseInquiryCard(msg).contact">
                      <text class="inquiry-card-label">联系人</text>
                      <text class="inquiry-card-value">{{ parseInquiryCard(msg).contact }}</text>
                    </view>
                  </view>
                  <view class="inquiry-card-footer"><text class="inquiry-card-footer-text">点击查看询价详情</text></view>
                </view>
                <!-- ------------------ 报价卡片 ---------------- -->
                <view v-else-if="msg.MsgType === 32" class="msg-quote-card" @tap.stop="onQuoteTap(msg)">
                  <view class="quote-card-header">
                    <text class="quote-card-icon">📢</text>
                    <text class="quote-card-title">您有新的报价单待查看</text>
                  </view>
                  <view class="quote-card-body">
                    <text class="quote-card-highlight">{{ parseQuoteCard(msg).quoteTitle || '报价单' }}</text>
                    <view class="quote-card-row" v-if="parseQuoteCard(msg).company">
                      <text class="quote-card-label">报价企业</text>
                      <text class="quote-card-value">{{ parseQuoteCard(msg).company }}</text>
                    </view>
                    <view class="quote-card-row" v-if="parseQuoteCard(msg).product">
                      <text class="quote-card-label">产品型号</text>
                      <text class="quote-card-value">{{ parseQuoteCard(msg).product }}</text>
                    </view>
                    <view class="quote-card-row" v-if="parseQuoteCard(msg).quantity">
                      <text class="quote-card-label">数量</text>
                      <text class="quote-card-value quote-card-value-strong">{{ parseQuoteCard(msg).quantity }}</text>
                    </view>
                    <view class="quote-card-row" v-if="parseQuoteCard(msg).deliveryTime">
                      <text class="quote-card-label">交货时间</text>
                      <text class="quote-card-value">{{ parseQuoteCard(msg).deliveryTime }}</text>
                    </view>
                    <view class="quote-card-row" v-if="parseQuoteCard(msg).location">
                      <text class="quote-card-label">交货地点</text>
                      <text class="quote-card-value">{{ parseQuoteCard(msg).location }}</text>
                    </view>
                    <view class="quote-card-row" v-if="parseQuoteCard(msg).contact">
                      <text class="quote-card-label">联系人</text>
                      <text class="quote-card-value">{{ parseQuoteCard(msg).contact }}</text>
                    </view>
                  </view>
                  <view class="quote-card-footer"><text class="quote-card-footer-text">请及时去<text style="color: red;font-weight: 500;">大国工匠客户端</text>处理报价</text></view>
                </view>
                <!-- ------------------ 引用回复正文 ---------------- -->
                <text v-else-if="msg.MsgType === 22" class="msg-text"><text v-for="(seg, i) in msg.TextSegments" :key="i" :class="{ 'msg-at-text': seg.isAt }">{{ seg.text }}</text></text>
                <!-- ------------------ 文本 ---------------- -->
                <text v-else class="msg-text"><text v-for="(seg, i) in msg.TextSegments" :key="i" :class="{ 'msg-at-text': seg.isAt }">{{ seg.text }}</text></text>
              </view>
              <!-- ------------------ 引用参考（气泡外部） ---------------- -->
              <view v-if="msg.MsgType === 22" class="msg-quote-ref-box">
                <text class="msg-quote-ref-author">{{ msg.QuoteAuthor }}：</text>
                <text class="msg-quote-ref-text">{{ msg.QuoteText }}</text>
              </view>
            </view>
          </view>

          <!-- 自己消息 -->
          <view :key="'msg-right-' + msg.MsgID" class="msg-row msg-row-right" v-else>
            <view class="msg-content-col">
              <view class="msg-bubble-wrap-right">
                <!-- 已读/未读标记（仅单聊，群聊和通知不显示） -->
                <text v-if="showReadStatus(msg)" class="msg-read-status" :class="{ 'msg-read-unread': msg.IsRead !== 1 }">{{ msg.IsRead === 1 ? '已读' : '未读' }}</text>
                <view :id="'msg-bubble-' + index" class="msg-bubble msg-bubble-right" :class="{ 'msg-bubble-image': msg.MsgType === 2, 'msg-bubble-link': msg.MsgType === 21, 'msg-bubble-file': msg.MsgType === 7, 'msg-bubble-inquiry': msg.MsgType === 31, 'msg-bubble-quote': msg.MsgType === 32 }" @longpress.stop.prevent="onMsgLongPress(msg, index)">
                  <!-- ------------------ 图片 ---------------- -->
                  <image v-if="msg.MsgType === 2" class="msg-image" :class="{ 'msg-image-landscape': msg.ImageWidth > msg.ImageHeight }" :src="msg.LocalImage || msg.ImageUrl" mode="widthFix" lazy-load @load="onImageLoad($event, msg)" @tap="previewImage(msg)" />
                  <!-- ------------------ 语音 ---------------- -->
                  <view v-else-if="msg.MsgType === 8" class="msg-audio" :class="{ playing: playingAudioId === msg.MsgID }" @tap.stop="toggleAudio(msg)">
                    <view class="audio-wave"><text></text><text></text><text></text><text></text><text></text></view>
                    <text class="audio-duration">{{ msg.AudioDuration }}″</text>
                  </view>
                  <!-- ------------------ 文件 ---------------- -->
                  <view v-else-if="msg.MsgType === 7" class="msg-file-card" @tap.stop="onFileTap(msg)">
                    <view class="file-card-icon" :class="getFileIconClass(msg.FileName)"><text>{{ getFileExt(msg.FileName).slice(0, 4) }}</text></view>
                    <view class="file-card-info">
                      <text class="file-card-name">{{ msg.FileName }}</text>
                      <text class="file-card-size">{{ formatFileSize(msg.FileSize) }}</text>
                    </view>
                  </view>
                  <!-- ------------------ 链接卡片 ---------------- -->
                  <view v-else-if="msg.MsgType === 21" class="msg-link-card" @tap.stop="onLinkTap(msg)">
                    <text class="link-card-header">分享链接</text>
                    <view class="link-card-body">
                      <image v-if="msg.LinkLogo" class="link-card-logo" :src="msg.LinkLogo" mode="aspectFill" />
                      <view v-else class="link-card-logo-placeholder"><text>📦</text></view>
                      <view class="link-card-info">
                        <text class="link-card-title">{{ msg.LinkTitle }}</text>
                        <text class="link-card-url">{{ msg.LinkUrl }}</text>
                      </view>
                    </view>
                  </view>
                  <!-- ------------------ 询价卡片 ---------------- -->
                  <view v-else-if="msg.MsgType === 31" class="msg-inquiry-card" @tap.stop="onInquiryTap(msg)">
                    <view class="inquiry-card-header">
                      <text class="inquiry-card-icon">🔔</text>
                      <text class="inquiry-card-title">您有新的询价单待查看</text>
                    </view>
                    <view class="inquiry-card-body">
                      <text class="inquiry-card-highlight">{{ parseInquiryCard(msg).title || '询价单' }}</text>
                      <view class="inquiry-card-row" v-if="parseInquiryCard(msg).model">
                        <text class="inquiry-card-label">产品型号</text>
                        <text class="inquiry-card-value">{{ parseInquiryCard(msg).model }}</text>
                      </view>
                      <view class="inquiry-card-row" v-if="parseInquiryCard(msg).quantity">
                        <text class="inquiry-card-label">采购数量</text>
                        <text class="inquiry-card-value inquiry-card-value-strong">{{ parseInquiryCard(msg).quantity }}</text>
                      </view>
                      <view class="inquiry-card-row" v-if="parseInquiryCard(msg).deliveryTime">
                        <text class="inquiry-card-label">交货时间</text>
                        <text class="inquiry-card-value">{{ parseInquiryCard(msg).deliveryTime }}</text>
                      </view>
                      <view class="inquiry-card-row" v-if="parseInquiryCard(msg).location">
                        <text class="inquiry-card-label">交货地点</text>
                        <text class="inquiry-card-value">{{ parseInquiryCard(msg).location }}</text>
                      </view>
                      <view class="inquiry-card-row" v-if="parseInquiryCard(msg).contact">
                        <text class="inquiry-card-label">联系人</text>
                        <text class="inquiry-card-value">{{ parseInquiryCard(msg).contact }}</text>
                      </view>
                    </view>
                    <view class="inquiry-card-footer"><text class="inquiry-card-footer-text">点击查看询价详情</text></view>
                  </view>
                  <!-- ------------------ 报价卡片 ---------------- -->
                  <view v-else-if="msg.MsgType === 32" class="msg-quote-card" @tap.stop="onQuoteTap(msg)">
                    <view class="quote-card-header">
                      <text class="quote-card-icon">📢</text>
                      <text class="quote-card-title">您有新的报价单待查看</text>
                    </view>
                    <view class="quote-card-body">
                      <text class="quote-card-highlight">{{ parseQuoteCard(msg).quoteTitle || '报价单' }}</text>
                      <view class="quote-card-row" v-if="parseQuoteCard(msg).company">
                        <text class="quote-card-label">报价企业</text>
                        <text class="quote-card-value">{{ parseQuoteCard(msg).company }}</text>
                      </view>
                      <view class="quote-card-row" v-if="parseQuoteCard(msg).product">
                        <text class="quote-card-label">产品型号</text>
                        <text class="quote-card-value">{{ parseQuoteCard(msg).product }}</text>
                      </view>
                      <view class="quote-card-row" v-if="parseQuoteCard(msg).quantity">
                        <text class="quote-card-label">数量</text>
                        <text class="quote-card-value quote-card-value-strong">{{ parseQuoteCard(msg).quantity }}</text>
                      </view>
                      <view class="quote-card-row" v-if="parseQuoteCard(msg).deliveryTime">
                        <text class="quote-card-label">交货时间</text>
                        <text class="quote-card-value">{{ parseQuoteCard(msg).deliveryTime }}</text>
                      </view>
                      <view class="quote-card-row" v-if="parseQuoteCard(msg).location">
                        <text class="quote-card-label">交货地点</text>
                        <text class="quote-card-value">{{ parseQuoteCard(msg).location }}</text>
                      </view>
                      <view class="quote-card-row" v-if="parseQuoteCard(msg).contact">
                        <text class="quote-card-label">联系人</text>
                        <text class="quote-card-value">{{ parseQuoteCard(msg).contact }}</text>
                      </view>
                    </view>
                    <view class="quote-card-footer"><text class="quote-card-footer-text">请及时去<text style="color: red;font-weight: 500;">大国工匠客户端</text>处理报价</text></view>
                  </view>
                  <!-- ------------------ 引用回复正文 ---------------- -->
                  <text v-else-if="msg.MsgType === 22" class="msg-text"><text v-for="(seg, i) in msg.TextSegments" :key="i" :class="{ 'msg-at-text': seg.isAt }">{{ seg.text }}</text></text>
                  <!-- ------------------ 文本 ---------------- -->
                  <text v-else class="msg-text"><text v-for="(seg, i) in msg.TextSegments" :key="i" :class="{ 'msg-at-text': seg.isAt }">{{ seg.text }}</text></text>
                </view>
              </view>
              <!-- ------------------ 引用参考（气泡外部） ---------------- -->
              <view v-if="msg.MsgType === 22" class="msg-quote-ref-box">
                <text class="msg-quote-ref-author">{{ msg.QuoteAuthor }}：</text>
                <text class="msg-quote-ref-text">{{ msg.QuoteText }}</text>
              </view>
            </view>
            <image class="msg-avatar" :src="getMyAvatar()" mode="aspectFill" @error="onAvatarLoadError('my')" @tap="onMyAvatarTap" />
          </view>
        </template>

        <!-- 底部占位 -->
        <view class="msg-bottom-anchor" id="msg-bottom"></view>
        </view>
      </scroll-view>

      <!-- 底部输入框-->
      <view class="chat-footer" :style="{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 'px' : '' }">
        <!-- 引用预览条 -->
        <view v-if="quoteMessage" class="quote-preview-bar">
          <view class="quote-preview-content">
            <text class="quote-preview-author">{{ quoteAuthor }}</text>
            <text class="quote-preview-text">：{{ quoteText }}</text>
          </view>
          <view class="quote-preview-close" @tap="clearQuote"><text>✕</text></view>
        </view>
        <view class="footer-input-row">
          <!-- 语音和键盘切换按钮 -->
          <view class="footer-tool-btn" @tap="toggleVoiceMode">
            <image v-if="!isVoiceMode" class="footer-tool-icon" src="https://img2cdn.global-dsc.cn/dgzz_img/icon/voice-message.png" mode="aspectFit" />
            <image v-else class="footer-tool-icon" src="https://prodimg.global-dsc.cn/e3/a54800/9d984f/e86d96/f15815/001637" mode="aspectFit" />
          </view>

          <!-- 文本输入框（auto-height 随内容自动增高，最多约5行） -->
          <textarea
            v-if="!isVoiceMode"
            class="footer-input"
            v-model="inputText"
            placeholder-class="footer-input-placeholder"
            confirm-type="send"
            :focus="isFocus"
            :adjust-position="false"
            :hold-keyboard="true"
            :maxlength="-1"
            :show-confirm-bar="false"
            auto-height
            disable-default-padding
            @focus="onInputFocus"
            @blur="onInputBlur"
            @confirm="onSend"
          />

          <!-- 微信式按住说话按钮 -->
          <view
            v-else
            class="hold-talk-btn"
            :class="{ pressing: isVoicePressing, canceling: recordCancelHint }"
            @touchstart.stop.prevent="onVoiceTouchStart"
            @touchmove.stop.prevent="onVoiceTouchMove"
            @touchend.stop.prevent="onVoiceTouchEnd"
            @touchcancel.stop.prevent="onVoiceTouchCancel"
          >
            <text>{{ isVoicePressing ? (recordCancelHint ? '松开手指，取消发送' : '松开发送') : '按住说话' }}</text>
          </view>

          <!-- 表情按钮 -->
          <view class="footer-tool-btn" @tap="toggleEmotion">
            <image class="footer-tool-icon" src="https://img2cdn.global-dsc.cn/dgzz_img/icon/emotion.png" mode="aspectFit" />
          </view>

          <!-- 发送按钮或更多按钮 -->
          <view v-if="inputText.trim() && !isVoiceMode" class="footer-send-btn" @tap="onSend">
            <text class="footer-send-text">发送</text>
          </view>
          <view v-else class="footer-tool-btn" @tap="toggleMore">
            <image class="footer-tool-icon" src="https://img2cdn.global-dsc.cn/dgzz_img/icon/add-one.png" mode="aspectFit" />
          </view>
        </view>

        <!-- 更多操作面板 -->
        <view class="footer-panel" :class="{ 'panel-open': showMore }">
          <view class="panel-grid">
            <view class="panel-item" @tap="onPickImage('album')">
              <view class="panel-icon-wrap">
                <image class="panel-icon-img" src="https://img2cdn.global-dsc.cn/dgzz_img/icon/chat-picture.png" mode="aspectFit" />
              </view>
              <text class="panel-label">相册</text>
            </view>
            <view class="panel-item" @tap="onPickImage('camera')">
              <view class="panel-icon-wrap">
                <image class="panel-icon-img" src="https://img2cdn.global-dsc.cn/dgzz_img/icon/chat-camera.png" mode="aspectFit" />
              </view>
              <text class="panel-label">拍照</text>
            </view>
            <view class="panel-item" @tap="onPickFile">
              <view class="panel-icon-wrap">
                <image class="panel-icon-img" src="https://prodimg.global-dsc.cn/a6/bee035/a2417f/b9ce14/380aa1/07d1cb" mode="aspectFit" />
              </view>
              <text class="panel-label">文件</text>
            </view>
            <view class="panel-item" @tap="onSendProduct">
              <view class="panel-icon-wrap">
                <image class="panel-icon-img" src="https://img2cdn.global-dsc.cn/dgzz_img/icon/chat-product.png" mode="aspectFit" />
              </view>
              <text class="panel-label">发产品</text>
            </view>
          </view>
        </view>

        <!-- @群成员面板 -->
        <view class="footer-panel at-panel" :class="{ 'panel-open': showAtPanel }">
          <scroll-view class="at-scroll" scroll-y>
            <!-- @全体成员，有关键字过滤时不匹配就隐藏 -->
            <view v-if="!atKeyword || '全体成员'.indexOf(atKeyword) > -1" class="at-item" @tap="onAtMemberTap({ UserName: '全体成员' })">
              <view class="at-avatar at-all-avatar"><text>全</text></view>
              <text class="at-name">全体成员</text>
            </view>
            <view class="at-item" v-for="member in atMemberList" :key="member.UserID" @tap="onAtMemberTap(member)">
              <image class="at-avatar" :src="getMemberAvatar(member)" mode="aspectFill" @error="onAvatarLoadError('u' + member.UserID)" />
              <text class="at-name">{{ member.UserName }}</text>
            </view>
            <view v-if="!atMemberList.length" class="at-empty">没有匹配的群成员</view>
          </scroll-view>
        </view>

        <!-- 表情面板 -->
        <view class="footer-panel emotion-panel" :class="{ 'panel-open': showEmotion }">
          <scroll-view class="emotion-scroll" scroll-y>
            <view class="emotion-grid">
              <view
                class="emotion-item"
                v-for="emo in emotionList"
                :key="emo"
                @tap="onEmotionTap(emo)"
              >
                <text class="emotion-text">{{ emo }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 微信式录音状态浮层 -->
      <view v-if="isRecording" class="record-mask" :class="{ canceling: recordCancelHint }">
        <view class="record-card">
          <view class="record-wave"><text></text><text></text><text></text><text></text><text></text></view>
          <text class="record-title">{{ recordCancelHint ? '松开手指，取消发送' : '正在录音 ' + recordSeconds + '″' }}</text>
          <text class="record-tip">{{ recordCancelHint ? '手指移回下方可继续录音' : '上滑取消，松开发送' }}</text>
        </view>
      </view>

      <!-- 微信式长按操作菜单 -->
      <view v-if="actionMenuVisible" class="msg-action-mask" @tap="hideActionMenu">
        <view class="msg-action-popup" :class="{ 'msg-action-popup-below': actionMenuBelow }" :style="{ left: actionMenuX + 'px', top: actionMenuY + 'px' }">
          <view class="msg-action-arrow"></view>
          <view class="msg-action-rows">
            <!-- 第一行：复制、删除、转发、引用 -->
            <view class="msg-action-row">
              <view class="msg-action-item" @tap.stop="onActionCopy">
                <text class="msg-action-icon">📋</text>
                <text class="msg-action-label">复制</text>
              </view>
              <view class="msg-action-divider"></view>
              <view class="msg-action-item" @tap.stop="onActionDelete">
                <text class="msg-action-icon">🗑️</text>
                <text class="msg-action-label">删除</text>
              </view>
              <view class="msg-action-divider"></view>
              <view class="msg-action-item" @tap.stop="onActionForward">
                <text class="msg-action-icon">🔗</text>
                <text class="msg-action-label">转发</text>
              </view>
              <view class="msg-action-divider"></view>
              <view class="msg-action-item" @tap.stop="onActionQuote">
                <text class="msg-action-icon">💬</text>
                <text class="msg-action-label">引用</text>
              </view>
            </view>
            <!-- 第二行：撤回（仅自己发的且30分钟内） -->
            <template v-if="canRevoke(actionMenuTarget)">
              <view class="msg-action-row">
                <view class="msg-action-item" @tap.stop="onActionRevoke">
                  <text class="msg-action-icon">↩️</text>
                  <text class="msg-action-label">撤回</text>
                </view>
              </view>
            </template>
          </view>
        </view>
      </view>

      <!-- 转发联系人弹窗 -->
      <view v-if="forwardVisible" class="forward-mask" @tap="hideForwardPopup">
        <view class="forward-sheet" @tap.stop="">
          <view class="forward-header">
            <text class="forward-title">选择联系人</text>
            <text class="forward-close" @tap="hideForwardPopup">✕</text>
          </view>
          <scroll-view scroll-y class="forward-list">
            <view v-if="forwardLoading" class="forward-empty"><text>加载中...</text></view>
            <view v-else-if="!forwardContacts.length" class="forward-empty"><text>暂无最近联系人</text></view>
            <view v-for="item in forwardContacts" :key="item.ID" class="forward-item" @tap="onForwardSelect(item)">
              <image class="forward-avatar" :src="getForwardAvatar(item)" mode="aspectFill" />
              <text class="forward-name">{{ item.SessionName }}</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 转发确认弹窗 -->
      <view v-if="forwardConfirmVisible" class="forward-confirm-mask" @tap="onForwardCancel">
        <view class="forward-confirm-dialog" @tap.stop="">
          <text class="forward-confirm-title">确认转发</text>
          <text class="forward-confirm-desc">将消息发送给"{{ forwardTarget ? forwardTarget.SessionName : '' }}"？</text>
          <view class="forward-confirm-btns">
            <text class="forward-confirm-btn forward-confirm-cancel" @tap="onForwardCancel">取消</text>
            <text class="forward-confirm-btn forward-confirm-ok" @tap="onForwardConfirm">确定</text>
          </view>
        </view>
      </view>

      <!-- 报价卡片温馨提示弹窗 -->
      <view v-if="quoteTipVisible" class="quote-tip-mask" @tap="closeQuoteTip">
        <view class="quote-tip-dialog" @tap.stop="">
          <view class="quote-tip-icon">💡</view>
          <text class="quote-tip-title">温馨提示</text>
          <view class="quote-tip-content">
            <text>请及时去 </text>
            <text class="quote-tip-highlight">大国工匠客户端</text>
            <text> 处理报价</text>
          </view>
          <view class="quote-tip-btn" @tap="closeQuoteTip">我知道了</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getRecordList, saveRecordByClient, getGroupUserList, saveDocumentLife, getDocFileInfo, getFile3DView, getFile2DView, getChatList, removeRecord } from '../../api/index.js'
import request from '../../api/request.js'
import { IMService } from '../../services/im.js'
import { MessageService } from '../../services/message.js'
import { RecentService } from '../../services/recent.js'
import { formatProductImage } from '../../libs/image.js'
import { getProductImageUrlChat } from '@/common/utils/index.js'

export default {
  data() {
    return {
      interlocutorKey: '',  // 会话标识 "CategoryId:DataId"
      categoryId: '',  // 会话类型ID
      dataId: '',  // 对方ID
      interlocutorName: '',  // 会话名称
      interlocutorLogo: '',  // 会话头像
      defaultAvatar: 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png',  // 默认头像
      myAvatar: 'https://img2cdn.global-dsc.cn/dgzz_img/8520f53eeff21f5a388f30b67e54e287.png',  // 我的头像（静态占位）
      myUserId: '',  // 当前用户ID
      avatarErrorMap: {},  // 头像加载失败的记录表，失败过的 key 直接用默认头像
      messageList: [],  // 消息列表
      inputText: '',  // 输入内容
      isFocus: false,  // 输入框聚焦状态
      keyboardHeight: 0,  // 键盘高度（px），用于手动顶起 footer
      showMore: false,  // 显示更多面板
      showEmotion: false,  // 显示表情面板
      showAtPanel: false,  // 显示 @群成员面板
      atKeyword: '',  // @ 后面输入的搜索关键字
      hasMore: false,  // 是否有更多历史消息
      loading: false,  // 加载中状态
      pageReady: false,  // 页面是否就绪（首次加载完成后淡入）
      firstScrolling: false,  // 首次加载滚动窗口期，期间图片加载完成需要重新滚到底部
      scrollToId: 'msg-bottom',  // 滚动目标锚点ID
      scrollWithAnimation: false,  // 是否使用滚动动画，首次加载关闭
      isVoiceMode: false,  // 是否切换到按住说话模式
      isVoicePressing: false,  // 是否正在按住语音按钮
      recordCancelHint: false,  // 当前松手是否需要取消发送
      recordStartY: 0,  // 按下语音按钮时的纵向坐标
      isRecording: false,  // 是否正在录音
      recordSeconds: 0,  // 当前录音秒数
      playingAudioId: '',  // 当前播放中的语音消息ID
      groupMembers: {},  // 群成员映射表 { UserID: { UserName, UserLogo } }
      emotionList: [
        '😀', '😄', '😁', '😆', '😂', '🤣', '😏', '😅', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', 
        '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', 
        '🥱', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
        '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', 
        '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢',
        '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', 
        '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
      ],  // 表情列表
      actionMenuVisible: false,  // 是否显示长按操作菜单
      actionMenuX: 0,  // 操作菜单水平位置
      actionMenuY: 0,  // 操作菜单垂直位置
      actionMenuBelow: false,  // 菜单是否显示在气泡下方
      actionMenuTarget: null,  // 当前操作菜单对应的消息
      quoteMessage: null,  // 当前引用的消息对象
      quoteText: '',  // 引用预览文本
      quoteAuthor: '',  // 引用消息的发送者名称
      forwardVisible: false,  // 是否显示转发联系人弹窗
      forwardContacts: [],  // 最近联系人列表
      forwardTarget: null,  // 选中的转发目标
      forwardConfirmVisible: false,  // 是否显示转发确认弹窗
      forwardLoading: false,  // 联系人列表加载中
      forwardSending: false,  // 转发消息发送中
      forwardMessage: null,  // 待转发的原始消息
      statusBarHeight: 20,  // 状态栏高度（px），自定义导航栏顶部占位用
      menuRight: 95,  // 右上角胶囊左侧预留宽度（px），标题避开胶囊用
      titleMaxWidth: 200,  // 导航栏标题最大宽度（px），超出省略号
      quoteTipVisible: false  // 报价卡片温馨提示弹窗显示状态
    }
  },
  async onLoad(options) {
    // 自定义导航栏：算状态栏高度和右上角胶囊位置，三个点按钮和标题都要避开胶囊
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 20  // 状态栏高度
    const screenWidth = sysInfo.windowWidth || sysInfo.screenWidth || 375  // 屏幕宽度
    const menuBtn = uni.getMenuButtonBoundingClientRect ? uni.getMenuButtonBoundingClientRect() : null  // 胶囊位置信息
    if (menuBtn) {
      this.menuRight = screenWidth - menuBtn.left + 8  // 胶囊左边缘到屏幕右边的距离 + 间距
    }
    // 标题最大宽度：屏幕宽减去左侧返回区和右侧胶囊区
    this.titleMaxWidth = screenWidth - this.menuRight - 110

    // 从路由参数中解构出会话标识、对方名称、对方头像（跳转时做了 encodeURIComponent 编码，这里解码还原）
    const { key, name, logo } = options
    this.interlocutorKey = decodeURIComponent(key || '')  // 会话标识，格式 "CategoryId:DataId"
    this.interlocutorName = decodeURIComponent(name || '')  // 对方昵称，用于导航栏标题
    const rawLogo = decodeURIComponent(logo || '')  // 对方头像原始路径（列表页传的是未格式化的 SessionLogo）
    this.interlocutorLogo = rawLogo ? getProductImageUrlChat(rawLogo) : ''  // 对方头像URL，需格式化成完整地址才能加载

    // 解析 key 获取 categoryId 和 dataId
    const parts = this.interlocutorKey.split(':')
    this.categoryId = parts[0] || ''
    this.dataId = parts[1] || ''

    // 获取当前用户ID和头像
    const userInfo = uni.getStorageSync('userInfo') || {}
    this.myUserId = String(userInfo.UserID || '')
    // 设置我的头像：有 UserLogo 就用格式化后的真实头像，没有则按性别回退默认头像
    if (userInfo.UserLogo) {
      this.myAvatar = getProductImageUrlChat(userInfo.UserLogo)
    } else if (userInfo.UserSex == 2) {
      this.myAvatar = 'https://img2cdn.global-dsc.cn/dgzz_img/6842d00b7f7db24082ed4f59f2bba02a.png'
    }

    // 如果是群聊，先加载群成员列表（撤回提示需要用到成员名）
    if (this.categoryId === '52') {
      await this.loadGroupMembers()
    }

    // 加载聊天记录
    this.loadMessages()

    // 登录 IM 并订阅本会话实时消息（失败有重连机制，这里静默处理）
    IMService.login().catch(() => {})
    this._messageHandler = (event) => this.onRealtimeMessage(event)  // 实时消息回调引用，取消订阅时用
    MessageService.subscribe(this.interlocutorKey, this._messageHandler)
    RecentService.setCurrentChat(this.interlocutorKey)
    // 清空本会话未读数并给对方发已读回执
    RecentService.read(this.interlocutorKey)

    // ----------- 监听群信息更新（群详情页修改群名后实时同步导航栏标题）
    this._groupInfoUpdateHandler = (data) => {
      if (data && String(data.groupId) === String(this.dataId) && data.name) {
        this.interlocutorName = data.name
      }
    }
    uni.$on('groupInfoUpdate', this._groupInfoUpdateHandler)

    // ----------- 监听键盘高度变化，手动控制 footer 位置
    this._keyboardHandler = (res) => {
      this.keyboardHeight = res.height || 0
      // 键盘弹起或收起时都滚动到底部，保证最新消息可见
      this.scrollToBottom()
    }
    uni.onKeyboardHeightChange(this._keyboardHandler)
  },
  onShow() {
    // 从发产品等子页面返回时，增量拉取最新消息（首次进入时 onLoad 的加载还没完成，跳过）
    if (this._loaded) {
      this.loadNewMessages()
    }
  },
  onUnload() {
    // 取消实时消息订阅
    MessageService.unsubscribe(this.interlocutorKey, this._messageHandler)
    // 离开前再次清空未读数：聊天期间收到的新消息服务端仍计为未读，这里调 resetChat 同步服务端
    RecentService.read(this.interlocutorKey)
    RecentService.clearCurrentChat()
    // 取消群信息更新监听
    if (this._groupInfoUpdateHandler) {
      uni.$off('groupInfoUpdate', this._groupInfoUpdateHandler)
    }
    // 取消键盘高度监听
    if (this._keyboardHandler) {
      uni.offKeyboardHeightChange(this._keyboardHandler)
    }
    // 离开聊天页时清理录音计时器，避免计时器继续运行
    if (this._recordTimer) clearInterval(this._recordTimer)
    // 还在录音时按取消处理，防止离开页面后自动发送
    if (this._recorderManager && this.isRecording) {
      this._cancelRecording = true
      this._recorderManager.stop()
    }
    // 销毁语音播放器，释放系统音频资源
    if (this._audioContext) this._audioContext.destroy()
  },
  watch: {
    // ----------- 监听输入内容，群聊里输入 @ 弹出群成员选择面板
    inputText(text) {
      if (this.categoryId !== '52') { this.showAtPanel = false; return }  // 仅群聊支持
      const atIndex = text.lastIndexOf('@')  // 最后一个 @ 的位置
      if (atIndex === -1) { this.showAtPanel = false; return }
      const tail = text.slice(atIndex + 1)  // @ 后面输入的内容
      if (/\s/.test(tail)) { this.showAtPanel = false; return }  // @名字 已完成（后面有空格），收起面板
      this.atKeyword = tail
      this.showAtPanel = true
    }
  },
  computed: {
    // ----------- 群成员总数（groupMembers 是 { UserID: {...} } 映射表）
    groupMemberCount() {
      return Object.keys(this.groupMembers).length
    },
    // ----------- 可 @ 的群成员列表（排除自己，按关键字过滤）
    atMemberList() {
      const list = []  // 过滤后的群成员列表
      Object.keys(this.groupMembers).forEach((id) => {
        if (String(id) === String(this.myUserId)) return  // 不 @ 自己
        const member = this.groupMembers[id]  // 群成员信息
        if (!this.atKeyword || (member.UserName || '').indexOf(this.atKeyword) > -1) {
          list.push({ UserID: id, UserName: member.UserName, UserLogo: member.UserLogo })
        }
      })
      return list
    }
  },
  methods: {
    getProductImageUrlChat,

    // ----------- 点击 @面板 里的群成员，把 @名字 填入输入框
    onAtMemberTap(member) {
      const atIndex = this.inputText.lastIndexOf('@')  // 最后一个 @ 的位置
      this.inputText = this.inputText.slice(0, atIndex) + '@' + member.UserName.trim() + ' '  // 替换掉 @和关键字
      this.showAtPanel = false
      this.atKeyword = ''
      this.isFocus = false  // 先重置焦点状态，确保再次聚焦能触发
      this.$nextTick(() => {
        this.isFocus = true
      })
    },

    // ----------- 获取左侧对方消息头像，加载失败过的用默认头像
    getLeftAvatar(msg) {
      if (this.avatarErrorMap['u' + msg.SendUserID]) return this.defaultAvatar
      const member = this.groupMembers[msg.SendUserID]  // 群成员信息
      return (member && member.UserLogo) || this.interlocutorLogo || this.defaultAvatar
    },

    // ----------- 获取右侧我的头像，加载失败过用默认头像
    getMyAvatar() {
      return this.avatarErrorMap['my'] ? this.defaultAvatar : this.myAvatar
    },

    // ----------- 根据发送者ID获取展示名（群聊查群成员名片，单聊用对方昵称）
    getSenderName(senderId) {
      if (String(senderId) === String(this.myUserId)) return '您'  // 自己发的显示"您"
      // 群聊：优先用群成员的名片/昵称
      if (this.categoryId === '52') {
        const member = this.groupMembers[senderId]  // 群成员信息
        if (member && member.UserName) return member.UserName
      }
      return this.interlocutorName || '对方'  // 单聊用对方昵称，兜底"对方"
    },

    // ----------- 获取 @ 面板群成员头像，加载失败过用默认头像
    getMemberAvatar(member) {
      if (this.avatarErrorMap['u' + member.UserID]) return this.defaultAvatar
      return member.UserLogo || this.defaultAvatar
    },

    // ----------- 头像加载失败时记录到 avatarErrorMap，后续渲染用默认头像
    onAvatarLoadError(key) {
      this.$set(this.avatarErrorMap, key, true)
    },

    // ----------- 点击对方头像，跳转个人信息页
    onAvatarTap(msg) {
      if (this._avatarLongPressed) {  // 长按触发的 tap 不跳转
        this._avatarLongPressed = false
        return
      }
      if (!msg || !msg.SendUserID) return  // 没有发送者信息不处理
      const userId = String(msg.SendUserID)  // 目标用户ID
      const member = this.groupMembers[userId]  // 群成员信息（群聊才有）
      const userName = (member && member.UserName) || this.interlocutorName || ''  // 用户名称
      const userLogo = (member && member.UserLogo) || this.interlocutorLogo || ''  // 用户头像
      uni.navigateTo({
        url: `/im-message/pages/user/info?userId=${userId}&name=${encodeURIComponent(userName)}&logo=${encodeURIComponent(userLogo)}`
      })
    },

    // ----------- 点击自己的头像，跳转个人信息页
    onMyAvatarTap() {
      const userInfo = uni.getStorageSync('userInfo') || {}
      const userName = userInfo.UserName || userInfo.NickName || ''
      const userLogo = userInfo.UserLogo || ''
      uni.navigateTo({
        url: `/im-message/pages/user/info?userId=${this.myUserId}&name=${encodeURIComponent(userName)}&logo=${encodeURIComponent(userLogo)}`
      })
    },

    // ----------- 长按群成员头像，把 @Ta 插入输入框（仅群聊）
    onAvatarLongPress(msg) {
      if (this.categoryId !== '52') return  // 仅群聊支持 @
      const member = this.groupMembers[msg.SendUserID]  // 被长按的群成员
      if (!member || !member.UserName) return
      this._avatarLongPressed = true  // 标记本次是长按，阻止 tap 跳群信息页
      this.inputText += '@' + member.UserName.trim() + ' '  // 输入框追加 @名字 和空格，名字去空格
      this.isVoiceMode = false
      this.isFocus = false  // 先重置焦点状态，确保已经是聚焦态时也能再次触发聚焦
      this.$nextTick(() => {
        this.isFocus = true
      })
    },

    // ----------- 返回上一页（自定义导航栏返回按钮）
    goBack() {
      uni.navigateBack()
    },

    // ----------- 点击导航栏标题（群聊进群详情，单聊进个人信息）
    onTitleTap() {
      if (this.categoryId === '52') {
        this.goGroupInfo()
      } else {
        this.goUserInfo()
      }
    },

    // ----------- 跳转个人信息页（单聊点击标题）
    goUserInfo() {
      if (!this.dataId) return
      uni.navigateTo({
        url: `/im-message/pages/user/info?userId=${this.dataId}&name=${encodeURIComponent(this.interlocutorName)}&logo=${encodeURIComponent(this.interlocutorLogo)}`
      })
    },

    // ----------- 点击消息区域，收起所有面板和键盘
    onContentTap() {
      if (this.showMore || this.showEmotion) {
        this.showMore = false
        this.showEmotion = false
      }
      this.showAtPanel = false
      if (this.isFocus) {
        this.isFocus = false
        this.keyboardHeight = 0
        uni.hideKeyboard()
      }
    },

    // ----------- 跳转群详情页（群成员列表）
    goGroupInfo() {
      uni.navigateTo({
        url: `/im-message/pages/group/info?groupId=${this.dataId}&name=${encodeURIComponent(this.interlocutorName)}&logo=${encodeURIComponent(this.interlocutorLogo)}`
      })
    },

    // ----------- 加载群成员列表
    async loadGroupMembers() {
      try {
        const res = await getGroupUserList({ groupId: this.dataId })
        const list = res.Data || res.data || []
        const members = {}
        list.forEach((item) => {
          members[String(item.UserID)] = {
            UserName: item.UserNameInGroup || item.UserName || '',
            UserLogo: item.UserLogo ? getProductImageUrlChat(item.UserLogo) : ''
          }
        })
        this.groupMembers = members
      } catch (e) {
        console.error('加载群成员失败:', e)
      }
    },

    // ----------- 加载聊天记录
    async loadMessages() {
      if (!this.categoryId || !this.dataId) return
      this.loading = true
      try {
        const res = await getRecordList({
          categoryId: this.categoryId,
          dataId: this.dataId,
          msgId: 0,
          pageSize: 18
        })
        // 兼容两种返回格式
        const list = res.List || (res.Data && res.Data.List) || []
        const hasMore = res.HasMore !== undefined ? res.HasMore : (res.Data && res.Data.HasMore) || false

        // 接口返回的是倒序（最新在前），需要反转为正序（最早在前）
        list.reverse()

        // 处理消息：解码HTML实体、设置时间显示、解析消息文本
        this.processMessages(list)

        this.messageList = list
        this.hasMore = hasMore
        this._loaded = true  // 首次加载完成标记，onShow 用它判断是否需要增量加载

        // 滚动到底部（首次加载不用动画），滚动完成后再显示页面避免闪烁
        // 开启首次滚动窗口期，期间图片加载完成会重新滚到底部，避免图片撑高后底部消息被遮住
        this.firstScrolling = true
        this._userTouched = false  // 用户是否已手动滑动列表，滑动后停止首次加载的强制滚动
        this.$nextTick(() => {
          this.scrollToBottom()
          // scrollToBottom 内部有 50ms 延迟才定位，等定位完成后再淡入显示页面，进页面就直接停在底部，看不到滚动过程
          setTimeout(() => {
            this.pageReady = true
          }, 110)
        })
        // 首次加载后少量重试滚动，应对图片陆续加载撑高导致底部消息被遮住
        // 200ms 间隔重试 5 次，覆盖约 1 秒（图片加载完成时 onImageLoad 也会补滚，这里不用刷太多次，避免卡顿）
        this.retryScrollToBottom(5, 200)
        // 1.5 秒后关闭首次滚动窗口期，之后收发消息的滚动才启用动画（首次加载期间全部瞬移，跟微信一样）
        setTimeout(() => {
          this.firstScrolling = false
          this.scrollWithAnimation = true
        }, 1500)
      } catch (e) {
        console.error('加载聊天记录失败:', e)
        this.pageReady = true  // 加载失败也要显示页面，避免一直白屏
      } finally {
        this.loading = false
      }
    },

    // ----------- 增量加载最新消息（从子页面返回时调用）
    async loadNewMessages() {
      if (!this.categoryId || !this.dataId || this.loading || !this.messageList.length) return
      try {
        const res = await getRecordList({
          categoryId: this.categoryId,
          dataId: this.dataId,
          msgId: 0,
          pageSize: 18
        })
        const list = res.List || (res.Data && res.Data.List) || []  // 最新一页消息（倒序）
        if (!list.length) return
        list.reverse()
        this.processMessages(list)
        // 过滤掉本地已有的消息（本地刚发的消息和服务端记录 domain 相同；对不上标识的按发送者+内容+时间兜底判重）
        const newMessages = list.filter((m) => !this.isMsgExist(m))
        if (!newMessages.length) return
        // 第一条新消息的时间分割线要和现有最后一条比较
        const lastMessage = this.messageList[this.messageList.length - 1]  // 追加前最后一条消息
        if (lastMessage && newMessages[0].MsgTime) {
          newMessages[0].ShowTime = this.timeDiffMinutes(newMessages[0].MsgTime, lastMessage.MsgTime) >= 4
        }
        this.messageList = this.messageList.concat(newMessages)
        this.scrollToBottom()
      } catch (e) {
        console.error('增量加载消息失败:', e)
      }
    },

    // ----------- 加载更多历史消息
    async loadMore() {
      if (!this.hasMore || this.loading || this.messageList.length === 0) return
      this.loading = true
      try {
        // 取当前最早的消息ID作为游标
        const firstMsg = this.messageList[0]
        const msgId = -parseInt(String(firstMsg.MsgID)) || 0

        const res = await getRecordList({
          categoryId: this.categoryId,
          dataId: this.dataId,
          msgId: msgId,
          pageSize: 18
        })
        const list = res.List || (res.Data && res.Data.List) || []
        const hasMore = res.HasMore !== undefined ? res.HasMore : (res.Data && res.Data.HasMore) || false

        // 历史消息也是倒序返回，反转为正序
        list.reverse()
        this.processMessages(list)

        // 插入到列表头部
        this.messageList.unshift(...list)
        this.hasMore = hasMore

        // 找到加载前第一条消息在插入后的新位置（撤回消息没有气泡锚点，往后找第一条有气泡的）
        let anchorIndex = list.length  // 加载前第一条消息的新下标
        while (anchorIndex < this.messageList.length && this.isRevokeMsg(this.messageList[anchorIndex])) {
          anchorIndex++
        }
        // 关闭动画，把视口锚定回原来的消息，避免加载后滚动位置跳变
        this.scrollWithAnimation = false
        this.scrollToId = ''
        this.$nextTick(() => {
          this.scrollToId = 'msg-bubble-' + anchorIndex
          this.$nextTick(() => {
            this.scrollWithAnimation = true  // 恢复滚动动画
          })
        })
      } catch (e) {
        console.error('加载更多失败:', e)
      } finally {
        this.loading = false
      }
    },

    // ----------- 处理消息列表：解码HTML实体、设置时间显示标记、解析显示文本
    processMessages(messages) {
      let lastTime = ''
      messages.forEach((msg) => {
        // 自己发的消息 IsRead 兜底：服务端对对方未读的历史消息会返回 null/缺失，统一按未读处理
        if (String(msg.SendUserID) === String(this.myUserId) && (msg.IsRead === undefined || msg.IsRead === null)) {
          msg.IsRead = 0
        }
        // 解码 HTML 实体
        if (msg.MsgText) {
          msg.MsgText = msg.MsgText
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
        }
        // 解析图片消息的线上地址，兼容参考项目的 <m_img,url:地址> 格式
        const imageMatch = String(msg.MsgText || '').match(/<m_img,(?:url:)?([^>]+)>/i)  // 图片消息匹配结果
        if (imageMatch) {
          msg.MsgType = 2
          let imgPath = imageMatch[1].split(',')[0]  // 图片路径，可能是完整URL或相对路径
          // 完整URL直接使用
          if (/^https?:\/\//i.test(imgPath)) {
            msg.ImageUrl = imgPath
          } else if (imgPath.startsWith('big-engineer')) {
            // PC端发送的图片，去掉 big-engineer 前缀拼 prodimg 域名
            msg.ImageUrl = 'https://prodimg.global-dsc.cn' + imgPath.replace('big-engineer', '') + '?x-oss-process=image/resize,w_400'
          } else {
            // 其他相对路径，直接拼 prodimg 域名
            msg.ImageUrl = 'https://prodimg.global-dsc.cn' + (imgPath.startsWith('/') ? imgPath : '/' + imgPath) + '?x-oss-process=image/resize,w_400'
          }
          msg.ImageWidth = Number(msg.ImageWidth) || 0  // 图片原始宽度
          msg.ImageHeight = Number(msg.ImageHeight) || 0  // 图片原始高度
        }
        if (msg.MsgType === 2) {
          msg.ImageWidth = Number(msg.ImageWidth) || 0  // 图片原始宽度
          msg.ImageHeight = Number(msg.ImageHeight) || 0  // 图片原始高度
        }
        // 解析语音消息，格式为 <m_audio,bucket/key,时长>
        const audioMatch = String(msg.MsgText || '').match(/<m_audio,([^,>]+),([^>]+)>/i)  // 语音消息匹配结果
        if (audioMatch) {
          msg.MsgType = 8
          msg.AudioPath = audioMatch[1]
          msg.AudioDuration = Math.max(1, Math.ceil(Number(audioMatch[2]) || 1))
        }
        // 解析文件消息，格式为 <m_file,110:ID:LifeVersion:CreateUser,size,encodedName,priv>
        const fileMatch = String(msg.MsgText || '').match(/<m_file,([^,>]+),([^,>]*),([^,>]*),([^>]*)>/i)  // 文件消息匹配结果
        if (fileMatch) {
          msg.MsgType = 7
          msg.FilePath = fileMatch[1]  // 文件路径，格式 110:ID:LifeVersion:CreateUser
          msg.FileSize = Number(fileMatch[2]) || 0  // 文件大小（字节）
          msg.FileName = decodeURIComponent(fileMatch[3] || '')  // 文件名
          msg.FilePriv = fileMatch[4] || '0'  // 是否私有文件
        }
        // 解析链接消息，格式为 <m_link,url,title,logo,desc>
        const linkMatch = String(msg.MsgText || '').match(/<m_link,([^,>]*),([^,>]*),([^,>]*),([^>]*)>/i)  // 链接消息匹配结果
        if (linkMatch) {
          msg.MsgType = 21
          msg.LinkUrl = decodeURIComponent(linkMatch[1] || '')  // 链接地址
          msg.LinkTitle = decodeURIComponent(linkMatch[2] || '')  // 链接标题
          msg.LinkLogo = formatProductImage(decodeURIComponent(linkMatch[3] || ''))  // 链接图片
        }
        // 解析撤回消息提示，格式为 <m_revoke,原消息domain>
        const revokeMatch = String(msg.MsgText || '').match(/^<m_revoke,([^>]*)>$/i)  // 撤回消息匹配结果
        if (revokeMatch) {
          msg.IsRevoke = true  // 标记为撤回提示
          msg.RevokeText = this.getSenderName(msg.SendUserID) + '撤回了一条消息'  // 撤回提示文案，群聊显示具体成员名
        }
        // 解析引用消息，格式为 <m_quote,作者,编码后的引用文本>回复内容</m_quote>
        const quoteMatch = String(msg.MsgText || '').match(/^<m_quote,([^,>]+),([^>]*)>([\s\S]*)<\/m_quote>$/i)  // 引用消息匹配结果
        if (quoteMatch) {
          msg.MsgType = 22  // 引用消息类型
          msg.QuoteAuthor = quoteMatch[1]  // 被引用消息的作者
          msg.QuoteText = decodeURIComponent(quoteMatch[2] || '')  // 被引用的消息内容
          msg.ReplyText = quoteMatch[3] || ''  // 回复内容
          msg.DisplayText = msg.ReplyText  // 显示文本为回复内容
        }
        if (!msg.DisplayText) {
          // 解析显示文本（将特殊消息标签转为可读文字）
          msg.DisplayText = this.parseDisplayText(msg.MsgText)
        }
        // 识别询价卡片消息：文本以【您有新的询价单待查看】开头时渲染成可点击卡片
        if (String(msg.DisplayText || '').indexOf('【您有新的询价单待查看】') === 0) {
          msg.MsgType = 31 // 询价卡片消息类型
          // 询价ID：优先取后端追加的 InquiryId 字段，其次从文本里匹配 询价ID/询价单号 后面的数字
          const idMatch = String(msg.DisplayText || '').match(/(?:询价ID|询价单号|ID)\s*[:：]?\s*(\d+)/)
          msg.InquiryId = msg.InquiryId || (idMatch ? idMatch[1] : '') // 询价单ID，后端尚未加时为空
        }
        // 识别报价卡片消息：文本以【您有新的报价单待查看】开头时渲染成可点击卡片
        if (String(msg.DisplayText || '').indexOf('【您有新的报价单待查看】') === 0) {
          msg.MsgType = 32 // 报价卡片消息类型
          // 询价ID：优先取后端追加的 InquiryId 字段，其次从文本里匹配 询价ID 后面的数字（用于跳转询价详情）
          const idMatch = String(msg.DisplayText || '').match(/询价ID\s*[:：]?\s*(\d+)/)
          msg.InquiryId = msg.InquiryId || (idMatch ? idMatch[1] : '') // 询价单ID，用于跳转详情
        }
        // 把文本按 @名字 切成片段，@部分渲染成橙色
        msg.TextSegments = this.parseAtSegments(msg.DisplayText)
        // 时间显示：首条消息或与上一条间隔超过4分钟时显示
        if (msg.MsgTime && (!lastTime || this.timeDiffMinutes(msg.MsgTime, lastTime) >= 4)) {
          msg.ShowTime = true
        }
        lastTime = msg.MsgTime
      })
    },

    // ----------- 图片加载完成
    onImageLoad(event, msg) {
      // 获取图片原始尺寸
      const imageInfo = event && event.detail ? event.detail : {}  // 图片加载信息
      const imageWidth = Number(imageInfo.width) || 0  // 图片原始宽度
      const imageHeight = Number(imageInfo.height) || 0  // 图片原始高度
      if (!imageWidth || !imageHeight) return
      msg.ImageWidth = imageWidth
      msg.ImageHeight = imageHeight
      // 首次加载滚动窗口期内，图片撑高后重新滚到底部，避免底部消息被遮住（用户已手动滑动则不再强制滚动）
      if (this.firstScrolling && !this._userTouched) this.scrollToBottom()
    },

    // ----------- 首次加载后多次重试滚动，应对图片陆续加载撑高的情况
    retryScrollToBottom(times, delay) {
      if (times <= 0 || this._userTouched) return
      setTimeout(() => {
        if (this._userTouched) return  // 用户已开始手动滑动，停止强制滚动，避免吃掉第一次滑动
        this.scrollToBottom()
        this.retryScrollToBottom(times - 1, delay)
      }, delay)
    },

    // ----------- 把文本按 @名字 切成片段，@部分渲染成橙色
    parseAtSegments(text) {
      const segments = []  // 文本片段列表 { text, isAt }
      const reg = /@([^\s@]+)\s*/g  // @名字 匹配规则：@开头，名字不含空格，后面跟空格
      let lastIndex = 0  // 上次匹配结束位置
      let match = null  // 当前匹配结果
      while ((match = reg.exec(text)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ text: text.slice(lastIndex, match.index), isAt: false })
        }
        segments.push({ text: match[0], isAt: true })
        lastIndex = reg.lastIndex
      }
      if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex), isAt: false })
      }
      return segments
    },

    // ----------- 解析消息文本为可读内
    parseDisplayText(text) {
      if (!text) return ''
      // 引用消息：提取 </m_quote> 前的回复内容
      const quoteMatch = text.match(/^<m_quote,[^>]*>([\s\S]*)<\/m_quote>$/i)
      if (quoteMatch) return quoteMatch[1] || ''
      // 纯文本消息直接返
      if (!/^<m_/.test(text)) return text
      // 特殊消息类型转为占位文字
      return text
        .replace(/<m_ico,[^>]*>/g, '[表情]')
        .replace(/<m_img,[^>]*>/g, '[图片]')
        .replace(/<m_file,[^>]*>/g, '[文件]')
        .replace(/<m_audio,[^>]*>/g, '[语音]')
        .replace(/<m_video,[^>]*>/g, '[视频]')
        .replace(/<m_link,[^>]*>/g, '[链接]')
        .replace(/<m_data,[^>]*>/g, '[分享]')
        .replace(/<m_quote,[^>]*>/g, '[引用消息]')
        .replace(/<m_tip,[^>]*>/g, '')
        .replace(/<m_shake>/g, '[窗口抖动]')
        .replace(/<m_revoke,[^>]*>/g, '[撤回了一条消息]')
    },

    // ----------- 判断消息是否已被撤回
    isRevokeMsg(msg) {
      return msg.IsRevoke || /^<m_revoke,[^>]*>$/i.test(String(msg.MsgText || ''))
    },

    // ----------- 判断消息是否可撤回（仅自己发的、30 分钟内的消息显示撤回按钮）
    canRevoke(msg) {
      if (!msg || String(msg.SendUserID) !== String(this.myUserId)) return false  // 非本人消息不能撤回
      const msgTime = new Date(msg.MsgTime).getTime()  // 消息发送时间戳
      if (!msgTime || Date.now() - msgTime > 30 * 60 * 1000) return false  // 超过30分钟不显示撤回按钮
      return true
    },

    // ----------- 长按消息气泡弹出微信式操作菜单
    onMsgLongPress(msg, index) {
      if (this.isRevokeMsg(msg)) return  // 已撤回的消息不再显示菜单
      this.actionMenuTarget = msg  // 记录当前要操作的消息
      const selector = '#msg-bubble-' + index  // 气泡选择器
      uni.createSelectorQuery().in(this).select(selector).boundingClientRect((rect) => {
        if (!rect) return
        const systemInfo = uni.getSystemInfoSync()
        const rpxToPx = (rpx) => rpx * systemInfo.windowWidth / 750  // rpx 转 px
        const firstRowCount = 4  // 第一行固定4个按钮：复制+删除+转发+引用
        const hasSecondRow = this.canRevoke(msg)  // 第二行：撤回（仅自己发的且30分钟内）
        const popupWidth = rpxToPx(firstRowCount * 116 + 16)  // 菜单宽度，按第一行按钮数自适应
        const popupHeight = rpxToPx(hasSecondRow ? 108 * 2 + 8 : 108)  // 菜单高度：有撤回时两行，否则一行
        const arrowSize = rpxToPx(12)  // 箭头高度 12rpx
        const gap = rpxToPx(20)  // 箭头尖端与气泡的间距 20rpx
        let left = rect.left + rect.width / 2 - popupWidth / 2
        left = Math.max(20, Math.min(left, systemInfo.windowWidth - popupWidth - 20))
        // 默认显示在气泡上方；若上方空间不足则翻转到气泡下方
        const aboveTop = rect.top - popupHeight - arrowSize - gap
        const belowTop = rect.bottom + gap - arrowSize
        this.actionMenuBelow = aboveTop < 20
        this.actionMenuX = left
        this.actionMenuY = this.actionMenuBelow ? belowTop : aboveTop
        this.actionMenuVisible = true
      }).exec()
    },

    // ----------- 隐藏长按操作菜单
    hideActionMenu() {
      this.actionMenuVisible = false
      this.actionMenuTarget = null
    },

    // ----------- 点击菜单复制
    onActionCopy() {
      const target = this.actionMenuTarget
      this.hideActionMenu()
      if (!target) return
      const text = target.DisplayText || target.MsgText || ''
      if (!text) return
      uni.setClipboardData({
        data: text,
        success: () => uni.showToast({ title: '已复制', icon: 'none' })
      })
    },

    // ----------- 点击菜单引用
    onActionQuote() {
      const target = this.actionMenuTarget
      this.hideActionMenu()
      if (!target) return
      const text = target.DisplayText || target.MsgText || ''
      if (!text) return
      const member = this.groupMembers[target.SendUserID]  // 群聊发送者信息
      this.quoteMessage = target  // 记录被引用的消息
      this.quoteText = text  // 引用预览文本
      this.quoteAuthor = String(target.SendUserID) === String(this.myUserId) ? '我' : ((member && member.UserName) || this.interlocutorName || '对方')  // 引用作者名，群聊取发送者昵称
      this.inputText = ''  // 清空输入框，等待用户输入回复内容
      this.isVoiceMode = false
      this.isFocus = false  // 先重置焦点状态，确保已经是聚焦态时也能再次触发聚焦
      this.$nextTick(() => {
        this.isFocus = true
      })
    },

    // ----------- 清除引用
    clearQuote() {
      this.quoteMessage = null
      this.quoteText = ''
      this.quoteAuthor = ''
    },

    // ----------- 点击菜单撤回
    onActionRevoke() {
      const target = this.actionMenuTarget
      this.hideActionMenu()
      if (target) this.revokeMessage(target)
    },

    // ----------- 点击菜单删除该条聊天记录
    async onActionDelete() {
      const target = this.actionMenuTarget  // 先保存引用，hideActionMenu 会清空
      this.hideActionMenu()
      if (!target) return
      const msgId = target.MsgID  // 消息ID
      if (!msgId) return
      uni.showModal({
        title: '删除消息',
        content: '确定删除这条消息吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await removeRecord(msgId)  // 调用服务端删除接口
            // 从本地消息列表中移除
            const idx = this.messageList.findIndex(m => m.MsgID === msgId)
            if (idx !== -1) {
              this.messageList.splice(idx, 1)
            }
            uni.showToast({ title: '已删除', icon: 'none' })
          } catch (e) {
            console.error('[Chat] 删除消息失败:', e)
            uni.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      })
    },

    // ----------- 点击菜单转发，打开联系人弹窗
    async onActionForward() {
      const target = this.actionMenuTarget  // 先保存引用，hideActionMenu 会清空
      this.hideActionMenu()
      if (!target) return
      this.forwardMessage = target  // 记录待转发的原始消息
      this.forwardVisible = true
      this.forwardLoading = true
      this.forwardContacts = []
      try {
        const res = await getChatList()
        const list = res.data || res.Data || []  // 兼容不同响应层级
        // 排除当前会话，不能转发给自己
        this.forwardContacts = list.filter(item => {
          const itemKey = item.SessionCategoryID + ':' + item.SessionDataID
          return itemKey !== this.interlocutorKey
        })
      } catch (e) {
        console.error('获取联系人列表失败:', e)
        uni.showToast({ title: '获取联系人列表失败', icon: 'none' })
      } finally {
        this.forwardLoading = false
      }
    },

    // ----------- 选择转发联系人，弹出二次确认
    onForwardSelect(contact) {
      this.forwardTarget = contact  // 选中的联系人
      this.forwardConfirmVisible = true
    },

    // ----------- 确认转发，把原始消息内容发送给选中的联系人
    async onForwardConfirm() {
      const msg = this.forwardMessage  // 待转发的原始消息
      const contact = this.forwardTarget  // 选中的联系人
      if (!msg || !contact || this.forwardSending) return
      this.forwardSending = true
      try {
        const msgText = msg.MsgText  // 原始消息的协议格式内容
        const domain = this.generateGuid()  // 转发消息的唯一标识
        const isGroup = String(contact.SessionCategoryID) === '52'  // 是否群聊
        const recvDataId = String(contact.SessionDataID)  // 接收者ID
        // 通过 IM SDK 实时发送给目标联系人
        await IMService.send(recvDataId, msgText, domain, isGroup)
        // 保存消息记录到服务端
        await saveRecordByClient({
          RecvDataID: recvDataId,
          SessionCategoryID: String(contact.SessionCategoryID),
          MsgText: msgText,
          Domain: domain
        })
        // 更新目标联系人的会话列表最新消息
        const targetKey = String(contact.SessionCategoryID) + ':' + String(contact.SessionDataID)
        RecentService.new_message(targetKey, {
          MsgText: msgText,
          MsgTime: this.formatNow(),
          SendUserID: this.myUserId,
          Domain: domain,
          IsMe: true
        })
        uni.showToast({ title: '已转发', icon: 'success' })
        this.hideForwardPopup()
      } catch (e) {
        console.error('转发失败:', e)
        uni.showToast({ title: '转发失败', icon: 'none' })
      } finally {
        this.forwardSending = false
      }
    },

    // ----------- 取消转发确认
    onForwardCancel() {
      this.forwardConfirmVisible = false
      this.forwardTarget = null
    },

    // ----------- 关闭转发弹窗，清理所有状态
    hideForwardPopup() {
      this.forwardVisible = false
      this.forwardConfirmVisible = false
      this.forwardTarget = null
      this.forwardContacts = []
      this.forwardMessage = null
    },

    // ----------- 获取转发联系人头像
    getForwardAvatar(item) {
      if (item.SessionCategoryID == 52) {
        return 'https://prodimg.global-dsc.cn/24/3c15e1/a543d0/c6cedf/cdac30/8568ba'  // 群聊默认头像
      }
      return item.SessionLogo ? getProductImageUrlChat(item.SessionLogo) : this.defaultAvatar
    },

    // ----------- 撤回消息
    async revokeMessage(msg) {
      const msgTime = new Date(msg.MsgTime).getTime()  // 消息发送时间戳
      if (Date.now() - msgTime > 30 * 60 * 1000) {  // 超过30分钟禁止撤回
        uni.showToast({ title: '只能撤回30分钟之内的消息', icon: 'none' })
        return
      }
      if (String(msg.SendUserID) !== String(this.myUserId)) {  // 非本人发送的消息不能撤回
        uni.showToast({ title: '只能撤回自己发送的消息', icon: 'none' })
        return
      }
      const oldDomain = msg.Domain || msg.MsgID  // 被撤回消息的原始 domain
      const newDomain = this.generateGuid()  // 撤回提示消息的新 domain
      const revokeText = '<m_revoke,' + oldDomain + '>'  // 撤回消息协议格式
      try {
        await this.sendToPeer(revokeText, newDomain)  // 先通过 IM SDK 实时通知对端撤回
        await saveRecordByClient({
          RecvDataID: this.dataId,
          SessionCategoryID: this.categoryId,
          MsgText: revokeText,
          Domain: newDomain
        })
        // 本地把原消息替换为撤回提示，和 big-engineer 项目 MessageService.revoke 逻辑一致
        msg.MsgText = revokeText
        msg.MsgID = newDomain
        msg.Domain = newDomain
        msg.IsRevoke = true
        msg.RevokeText = '您撤回了一条消息'
        msg.MsgType = 0
        // 同步会话列表：如果撤回的是最后一条消息，更新列表预览
        RecentService.revoke_message(this.interlocutorKey, oldDomain)
      } catch (e) {
        console.error('撤回消息失败:', e)
        uni.showToast({ title: '撤回失败', icon: 'none' })
      }
    },

    // ----------- 计算两个时间相差的分钟数
    timeDiffMinutes(time1, time2) {
      const d1 = new Date(time1).getTime()
      const d2 = new Date(time2).getTime()
      return Math.abs(d1 - d2) / (1000 * 60)
    },

    // ----------- 判断消息是否已在列表中（实时推送和增量加载可能重复拿到同一条消息）
    isMsgExist(msg) {
      return this.messageList.some((m) => {
        if (msg.Domain && String(m.Domain) === String(msg.Domain)) return true  // domain 精确匹配
        if (msg.MsgID && String(m.MsgID) === String(msg.MsgID)) return true  // MsgID 精确匹配
        // 兜底判重：仅当双方都没有 Domain 和 MsgID 时才按 发送者+内容+5秒内 判断（PC端等发的可能没带 domain）
        if (msg.Domain || msg.MsgID || m.Domain || m.MsgID) return false  // 有唯一标识的消息不走内容兜底
        const timeDiff = Math.abs(new Date(m.MsgTime).getTime() - new Date(msg.MsgTime).getTime())  // 两条消息的时间差（毫秒）
        return String(m.SendUserID) === String(msg.SendUserID) && m.MsgText === msg.MsgText && timeDiff < 5000
      })
    },

    // ----------- 处理实时消息事件（新消息/撤回/已读回执）
    onRealtimeMessage(event) {
      if (event.type === 'message') {
        // 新消息：解析展示字段后追加到列表底部
        const message = event.message  // 新消息对象
        this.processMessages([message])
        // 已存在的消息直接跳过，防止和增量加载重复追加
        if (this.isMsgExist(message)) return
        // 与上一条消息间隔小于4分钟时不重复显示时间分割线
        const lastMessage = this.messageList[this.messageList.length - 1]  // 当前最后一条消息
        message.ShowTime = !lastMessage || this.timeDiffMinutes(message.MsgTime, lastMessage.MsgTime) >= 4
        this.messageList.push(message)
        this.scrollToBottom()
        // 单聊收到对方消息时回发已读回执，让对方的未读标记变为已读
        if (this.categoryId === '20' && String(message.SendUserID) !== String(this.myUserId)) {
          IMService.send(String(this.dataId), '<m_read,' + this.interlocutorKey + '>', this.generateGuid(), false).catch((e) => {
            console.warn('发送已读回执失败:', e)
          })
        }
      } else if (event.type === 'revoke') {
        // 撤回：把目标消息替换为撤回提示
        const target = this.messageList.find((msg) => msg.Domain === event.domain)  // 被撤回的消息
        if (target) {
          target.MsgText = '<m_revoke,' + event.domain + '>'
          target.IsRevoke = true
          target.RevokeText = this.getSenderName(event.sender) + '撤回了一条消息'
          target.MsgType = 0
        }
      } else if (event.type === 'read') {
        // 已读回执：把自己发的消息都标记为已读
        this.messageList.forEach((msg) => {
          if (String(msg.SendUserID) === String(this.myUserId)) {
            msg.IsRead = 1
          }
        })
      }
    },

    // ----------- 通过 IM SDK 实时发送消息给对端（失败抛错由调用方处理）
    async sendToPeer(msgText, domain) {
      await IMService.send(String(this.dataId), msgText, domain, this.categoryId === '52')
    },

    // ----------- 格式化消息时间显示
    formatMsgTime(timeStr) {
      if (!timeStr) return ''
      const msgDate = new Date(timeStr)
      const now = new Date()
      const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const msgZero = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate())
      const diffDay = Math.floor((nowZero - msgZero) / (1000 * 60 * 60 * 24))
      const pad = n => (n < 10 ? '0' + n : n)
      const hms = pad(msgDate.getHours()) + ':' + pad(msgDate.getMinutes())
      if (diffDay === 0) return hms
      if (diffDay === 1) return '昨天 ' + hms
      if (diffDay < 7) {
        const weekArr = ['日', '一', '二', '三', '四', '五', '六']
        return '星期' + weekArr[msgDate.getDay()] + ' ' + hms
      }
      return pad(msgDate.getMonth() + 1) + '-' + pad(msgDate.getDate()) + ' ' + hms
    },

    // ----------- 新发送的消息根据与上一条的时间差决定是否显示时间分割线
    setShowTimeForNew(msg) {
      const lastMessage = this.messageList[this.messageList.length - 1]  // 当前最后一条消息
      msg.ShowTime = !lastMessage || this.timeDiffMinutes(msg.MsgTime, lastMessage.MsgTime) >= 4
    },

    // ----------- 发送消息
    async onSend() {
      const text = this.inputText.trim()
      if (!text) return
      // 如果有引用，拼接为 <m_quote,作者,编码后的引用文本>回复内容</m_quote> 格式
      let sendText = text
      let displayText = text
      if (this.quoteMessage) {
        const encodedQuote = encodeURIComponent(this.quoteText)
        sendText = '<m_quote,' + this.quoteAuthor + ',' + encodedQuote + '>' + text + '</m_quote>'
      }
      // 生成消息唯一标识
      const domain = this.generateGuid()
      // 本地先插入消息
      const msg = {
        MsgID: domain,
        MsgText: sendText,
        DisplayText: displayText,
        MsgTime: this.formatNow(),
        SendUserID: this.myUserId,
        Domain: domain,
        IsMe: true,
        State: -1,
        IsRead: 0  // 已读状态，对方已读回执到达后更新
      }
      // 如果有引用，设置引用相关字段用于本地展示
      if (this.quoteMessage) {
        msg.MsgType = 22
        msg.QuoteAuthor = this.quoteAuthor
        msg.QuoteText = this.quoteText
        msg.ReplyText = text
      }
      // 本地消息也要按 @名字 切片段，否则气泡渲染为空
      msg.TextSegments = this.parseAtSegments(msg.DisplayText)
      this.setShowTimeForNew(msg)  // 与上一条消息间隔超过1分钟时显示时间分割线
      this.messageList.push(msg)
      RecentService.new_message(this.interlocutorKey, msg)  // 同步会话列表的最后一条消息
      this.inputText = ''
      this.clearQuote()
      this.scrollToBottom()
      // 调用接口发送
      try {
        await this.sendToPeer(sendText, domain)  // 先通过 IM SDK 实时送达对端
        await saveRecordByClient({
          RecvDataID: this.dataId,
          SessionCategoryID: this.categoryId,
          MsgText: sendText,
          Domain: domain
        })
        msg.State = 1
      } catch (e) {
        console.error('发送消息失败:', e)
        msg.State = 0
        uni.showToast({ title: '发送失败，请重新发送', icon: 'none' })
      }
    },

    // ----------- 用户手指按下消息列表，停止首次加载的强制滚动
    onListTouchStart() {
      // 首次加载期间会多次强制滚到底部，用户一上手就停掉，避免第一次上滑被拉回底部
      this._userTouched = true
      this.firstScrolling = false
    },

    // ----------- 滚动到底部（scroll-into-view 锚点定位）
    scrollToBottom() {
      this.scrollToId = ''
      this.$nextTick(() => {
        setTimeout(() => {
          this.scrollToId = 'msg-bottom'
        }, 50)
      })
    },

    // ----------- 生成 GUID
    generateGuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    },

    // ----------- 格式化当前时间
    formatNow() {
      const d = new Date()
      const pad = n => (n < 10 ? '0' + n : n)
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    },

    // ----------- 输入框聚焦
    onInputFocus() {
      this.isFocus = true
      this.isVoiceMode = false
      this.showMore = false
      this.showEmotion = false
    },

    // ----------- 输入框失焦（hold-keyboard 开启后，点发送按钮不会触发 blur，键盘保持弹起；点消息列表等会手动调 hideKeyboard 收起）
    onInputBlur() {
      this.isFocus = false
      // 延迟重置 keyboardHeight，等键盘收起动画完成
      setTimeout(() => {
        if (!this.isFocus) {
          this.keyboardHeight = 0
        }
      }, 100)
    },

    // ----------- 切换语音和键盘输入模式
    toggleVoiceMode() {
      this.isVoiceMode = !this.isVoiceMode
      this.showMore = false
      this.showEmotion = false
      this.isVoicePressing = false
      this.recordCancelHint = false
      // 切到语音模式时收起键盘，切回文本模式时自动聚焦输入框
      if (this.isVoiceMode) {
        this.isFocus = false
        this.keyboardHeight = 0
        uni.hideKeyboard()
        return
      }
      this.$nextTick(() => {
        this.isFocus = true
      })
    },

    // ----------- 按下语音按钮开始录音
    onVoiceTouchStart(event) {
      const touch = event.touches && event.touches[0]  // 当前按下位置
      this.recordStartY = touch ? touch.clientY : 0
      this.recordCancelHint = false
      this.isVoicePressing = true
      this.startRecording()
    },

    // ----------- 按住语音按钮移动，判断是否上滑取消
    onVoiceTouchMove(event) {
      const touch = event.touches && event.touches[0]  // 当前手指位置
      if (!touch || !this.recordStartY) return
      this.recordCancelHint = this.recordStartY - touch.clientY > 70
    },

    // ----------- 松开语音按钮，根据滑动状态发送或取消
    onVoiceTouchEnd() {
      const cancelled = this.recordCancelHint  // 松开时是否处于取消区域
      this.isVoicePressing = false
      this.stopRecording(cancelled)
      this.recordCancelHint = false
    },

    // ----------- 系统打断触摸时取消本次录音
    onVoiceTouchCancel() {
      this.isVoicePressing = false
      this.recordCancelHint = false
      this.stopRecording(true)
    },

    // ----------- 切换表情面板
    toggleEmotion() {
      // 如果当前键盘弹起，先收键盘再展示面板，避免跳动
      if (this.isFocus) {
        this.isFocus = false
        uni.hideKeyboard()
        this.keyboardHeight = 0
        // 延迟等键盘收起后再开面板
        setTimeout(() => {
          this.isVoiceMode = false
          this.showEmotion = !this.showEmotion
          this.showMore = false
          // 面板展开动画需要 0.22s，等动画结束后再滚动
          setTimeout(() => this.scrollToBottom(), 250)
        }, 150)
        return
      }
      this.isVoiceMode = false
      this.showEmotion = !this.showEmotion
      this.showMore = false
      // 面板展开动画需要 0.22s，等动画结束后再滚动
      setTimeout(() => this.scrollToBottom(), 250)
    },

    // ----------- 切换更多面板
    toggleMore() {
      // 如果当前键盘弹起，先收键盘再展示面板，避免跳动
      if (this.isFocus) {
        this.isFocus = false
        uni.hideKeyboard()
        this.keyboardHeight = 0
        // 延迟等键盘收起后再开面板
        setTimeout(() => {
          this.showMore = !this.showMore
          this.showEmotion = false
          // 面板展开动画需要 0.22s，等动画结束后再滚动
          setTimeout(() => this.scrollToBottom(), 250)
        }, 150)
        return
      }
      this.showMore = !this.showMore
      this.showEmotion = false
      // 面板展开动画需要 0.22s，等动画结束后再滚动
      setTimeout(() => this.scrollToBottom(), 250)
    },

    // ----------- 选择表情
    onEmotionTap(emo) {
      // 将表情追加到输入框，由用户自己决定是否发送
      this.inputText += emo
    },

    // ----------- 选择并发送图片
    onPickImage(source) {
      uni.chooseImage({
        count: 9,
        sizeType: ['original', 'compressed'],
        sourceType: [source],
        success: async (res) => {
          const paths = res.tempFilePaths || []  // 用户选中的图片临时路径
          this.showMore = false
          for (const path of paths) {
            await this.sendLocalImage(path)
          }
        },
        fail: (error) => {
          if (!String(error.errMsg || '').includes('cancel')) {
            uni.showToast({ title: '选择图片失败', icon: 'none' })
          }
        }
      })
    },

    // ----------- 上传并发送本地图片
    async sendLocalImage(filePath) {
      const domain = this.generateGuid()  // 本次图片消息唯一标识
      const msg = {
        MsgID: domain,
        MsgType: 2,
        MsgText: '<m_img,local:' + filePath + '>',
        DisplayText: '[图片]',
        LocalImage: filePath,
        MsgTime: this.formatNow(),
        SendUserID: this.myUserId,
        Domain: domain,
        IsMe: true,
        State: -1,
        IsRead: 0,  // 已读状态，对方已读回执到达后更新
        ImageWidth: 0,  // 图片原始宽度
        ImageHeight: 0  // 图片原始高度
      }  // 先插入列表展示的本地图片消息
      this.setShowTimeForNew(msg)  // 与上一条消息间隔超过1分钟时显示时间分割线
      this.messageList.push(msg)
      this.scrollToBottom()
      try {
        uni.showLoading({ title: '正在发送中...', mask: true })
        const contentType = this.getImageContentType(filePath)  // 当前图片类型
        const fileKey = await this.getImageKey(filePath)  // OBS 文件唯一 key
        const signatureRes = await request({
          url: '/obs/putUrlSignature',
          method: 'post',
          params: { category: 50, key: fileKey, priv: false },
          apiKey: 'profitapi'
        })  // OBS 临时凭证响应
        const signature = signatureRes.data || signatureRes.Data || signatureRes  // 兼容接口不同响应层级
        const options = signature.options || signature.Options  // OBS 上传参数
        const credential = signature.credential || signature.Credential  // OBS 临时访问凭证
        if (!options || !credential) throw new Error('OBS上传凭证无效')
        await this.uploadImageToObs(filePath, contentType, options, credential)
        const displayDomain = String(options.displayDomain || '').replace(/\/$/, '')  // 图片公开访问域名
        if (!displayDomain) throw new Error('图片访问地址无效')
        const imageUrl = displayDomain + '/' + options.key  // 图片最终公开地址
        const msgText = '<m_img,url:' + imageUrl + '>'  // 与参考项目一致的图片消息格式
        await this.sendToPeer(msgText, domain)  // 先通过 IM SDK 实时送达对端
        await saveRecordByClient({
          RecvDataID: this.dataId,
          SessionCategoryID: this.categoryId,
          MsgText: msgText,
          Domain: domain
        })
        msg.MsgText = msgText
        msg.ImageUrl = imageUrl
        msg.State = 1
        RecentService.new_message(this.interlocutorKey, msg)  // 同步会话列表的最后一条消息
      } catch (error) {
        console.error('发送图片失败:', error)
        msg.State = 0
        uni.showToast({ title: error.message || '发送图片失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    // ----------- 上传图片到 OBS（小程序通过 POST 表单上传）
    async uploadImageToObs(filePath, contentType, options, credential) {
      await this.uploadImageByForm(filePath, contentType, options, credential)
    },

    // ----------- 小程序通过 POST 表单上传图片到 OBS
    uploadImageByForm(filePath, contentType, options, credential) {
      const bucket = options.bucket  // OBS 桶名称
      const key = options.key  // OBS 文件路径
      const token = credential.securitytoken  // OBS 临时安全令牌
      const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString()  // 上传凭证过期时间
      const conditions = [
        { bucket },
        { key },
        { 'content-type': contentType },
        { 'x-obs-security-token': token }
      ]  // OBS 上传限制条件
      const policyText = JSON.stringify({ expiration, conditions })  // OBS 原始 Policy
      const policy = this.bytesToBase64(this.utf8ToBytes(policyText))  // Base64 编码后的 Policy
      const signatureBytes = this.hmacSha1(this.utf8ToBytes(policy), this.utf8ToBytes(credential.secret))  // Policy 签名结果
      const signature = this.bytesToBase64(signatureBytes)  // OBS 表单签名
      const domain = String(options.domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '')  // OBS 服务域名
      const uploadDomain = domain.indexOf(bucket + '.') === 0 ? domain : bucket + '.' + domain  // OBS 桶上传域名
      return new Promise((resolve, reject) => {
        uni.uploadFile({
          url: 'https://' + uploadDomain,
          filePath,
          name: 'file',
          formData: {
            key,
            AccessKeyId: credential.access,
            policy,
            signature,
            'content-type': contentType,
            'x-obs-security-token': token
          },
          success: (res) => {
            if ([200, 201, 204].includes(Number(res.statusCode))) {
              resolve(res)
              return
            }
            reject(new Error('OBS上传失败，状态码：' + res.statusCode + (res.data ? '，' + res.data : '')))
          },
          fail: reject
        })
      })
    },

    // ----------- 字符串转 UTF-8 字节数组
    utf8ToBytes(value) {
      const text = unescape(encodeURIComponent(String(value)))  // UTF-8 二进制字符串
      const bytes = []  // UTF-8 字节数组
      for (let index = 0; index < text.length; index++) {
        bytes.push(text.charCodeAt(index))
      }
      return bytes
    },

    // ----------- 字节数组转 Base64
    bytesToBase64(bytes) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'  // Base64 字符表
      let result = ''  // Base64 编码结果
      for (let index = 0; index < bytes.length; index += 3) {
        const first = bytes[index]  // 第一个字节
        const second = index + 1 < bytes.length ? bytes[index + 1] : 0  // 第二个字节
        const third = index + 2 < bytes.length ? bytes[index + 2] : 0  // 第三个字节
        const value = (first << 16) | (second << 8) | third  // 三字节组合值
        result += chars[(value >>> 18) & 63]
        result += chars[(value >>> 12) & 63]
        result += index + 1 < bytes.length ? chars[(value >>> 6) & 63] : '='
        result += index + 2 < bytes.length ? chars[value & 63] : '='
      }
      return result
    },

    // ----------- 计算 HMAC-SHA1
    hmacSha1(messageBytes, keyBytes) {
      let key = keyBytes.slice()  // HMAC 使用的密钥字节
      if (key.length > 64) key = this.sha1(key)
      while (key.length < 64) key.push(0)
      const innerKey = key.map(item => item ^ 0x36)  // HMAC 内层密钥
      const outerKey = key.map(item => item ^ 0x5c)  // HMAC 外层密钥
      return this.sha1(outerKey.concat(this.sha1(innerKey.concat(messageBytes))))
    },

    // ----------- 计算 SHA1 字节摘要
    sha1(bytes) {
      const words = []  // SHA1 原始数据块
      const bitLength = bytes.length * 8  // 原始数据位数
      for (let index = 0; index < bytes.length; index++) {
        words[index >> 2] = (words[index >> 2] || 0) | (bytes[index] << (24 - (index % 4) * 8))
      }
      words[bitLength >> 5] = (words[bitLength >> 5] || 0) | (0x80 << (24 - bitLength % 32))
      words[((bitLength + 64 >> 9) << 4) + 15] = bitLength
      let h0 = 0x67452301  // SHA1 摘要分量一
      let h1 = 0xefcdab89  // SHA1 摘要分量二
      let h2 = 0x98badcfe  // SHA1 摘要分量三
      let h3 = 0x10325476  // SHA1 摘要分量四
      let h4 = 0xc3d2e1f0  // SHA1 摘要分量五
      for (let offset = 0; offset < words.length; offset += 16) {
        const block = []  // 当前 SHA1 扩展数据块
        let a = h0  // 当前轮分量一
        let b = h1  // 当前轮分量二
        let c = h2  // 当前轮分量三
        let d = h3  // 当前轮分量四
        let e = h4  // 当前轮分量五
        for (let round = 0; round < 80; round++) {
          if (round < 16) {
            block[round] = words[offset + round] || 0
          } else {
            const value = block[round - 3] ^ block[round - 8] ^ block[round - 14] ^ block[round - 16]  // 扩展块临时值
            block[round] = (value << 1) | (value >>> 31)
          }
          let logic = 0  // 当前轮逻辑运算结果
          let constant = 0  // 当前轮常量
          if (round < 20) {
            logic = (b & c) | (~b & d)
            constant = 0x5a827999
          } else if (round < 40) {
            logic = b ^ c ^ d
            constant = 0x6ed9eba1
          } else if (round < 60) {
            logic = (b & c) | (b & d) | (c & d)
            constant = 0x8f1bbcdc
          } else {
            logic = b ^ c ^ d
            constant = 0xca62c1d6
          }
          const temp = ((((a << 5) | (a >>> 27)) + logic + e + constant + block[round]) | 0)  // 当前轮计算结果
          e = d
          d = c
          c = (b << 30) | (b >>> 2)
          b = a
          a = temp
        }
        h0 = (h0 + a) | 0
        h1 = (h1 + b) | 0
        h2 = (h2 + c) | 0
        h3 = (h3 + d) | 0
        h4 = (h4 + e) | 0
      }
      const result = []  // SHA1 最终字节摘要
      ;[h0, h1, h2, h3, h4].forEach((value) => {
        result.push((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255)
      })
      return result
    },

    // ----------- 获取图片上传 key
    getImageKey(filePath) {
      return new Promise((resolve) => {
        const fallbackKey = this.generateGuid().replace(/-/g, '')  // 不支持文件摘要时使用的随机 key
        if (typeof uni.getFileInfo !== 'function') {
          resolve(fallbackKey)
          return
        }
        uni.getFileInfo({
          filePath,
          digestAlgorithm: 'md5',
          success: (res) => resolve(res.digest || fallbackKey),
          fail: () => resolve(fallbackKey)
        })
      })
    },

    // ----------- 获取图片 ContentType
    getImageContentType(filePath) {
      const ext = String(filePath).split(/[?#]/)[0].split('.').pop().toLowerCase()  // 图片文件后缀
      const types = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        bmp: 'image/bmp',
        webp: 'image/webp'
      }  // 图片后缀与 ContentType 对照表
      return types[ext] || 'image/jpeg'
    },

    // ----------- 预览图片
    previewImage(msg) {
      const urls = this.messageList.filter(item => item.MsgType === 2).map(item => item.LocalImage || item.ImageUrl).filter(Boolean)  // 当前会话全部图片地址
      const current = msg.LocalImage || msg.ImageUrl  // 当前点击的图片地址
      uni.previewImage({ current, urls })
    },

    // ----------- 获取录音权限
    ensureRecordPermission() {
      // 微信小程序录音前需要先申请麦克风权限
      return new Promise((resolve, reject) => {
        uni.authorize({
          scope: 'scope.record',
          success: resolve,
          fail: () => {
            // 用户拒绝授权时，引导用户前往小程序设置手动开启
            uni.showModal({
              title: '需要麦克风权限',
              content: '请在设置中允许使用麦克风后再发送语音',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) uni.openSetting()
              }
            })
            reject(new Error('未获得麦克风权限'))
          }
        })
      })
    },

    // ----------- 开始录音
    async startRecording() {
      // 已经处于录音状态时不重复创建录音任务
      if (this.isRecording) return
      try {
        // 先拿到麦克风权限，首次授权期间如果已经松手则不再启动录音
        await this.ensureRecordPermission()
        if (!this.isVoicePressing) return
        if (typeof uni.getRecorderManager !== 'function') throw new Error('当前运行端不支持录音')
        // 开始录音前停止正在播放的语音，避免录进去播放声音
        if (this._audioContext) {
          this._audioContext.stop()
          this.playingAudioId = ''
        }
        const recorderManager = uni.getRecorderManager()  // uni-app 全局录音管理器
        this._recorderManager = recorderManager
        this._cancelRecording = false
        // 录音管理器是全局单例，先移除旧监听，避免第二次录音重复发送
        if (typeof recorderManager.offStart === 'function') recorderManager.offStart()
        if (typeof recorderManager.offStop === 'function') recorderManager.offStop()
        if (typeof recorderManager.offError === 'function') recorderManager.offError()
        // 系统真正开始录音后显示录音浮层，并启动秒数计时
        recorderManager.onStart(() => {
          // 录音真正启动前已经松手时立即取消，避免首次授权后意外录音
          if (!this.isVoicePressing) {
            this._cancelRecording = true
            recorderManager.stop()
            return
          }
          this.isRecording = true
          this.recordSeconds = 0
          this.showMore = false
          this._recordTimer = setInterval(() => {
            this.recordSeconds = Math.min(60, this.recordSeconds + 1)
          }, 1000)
        })
        // 停止录音后清理状态，再根据取消状态决定是否上传
        recorderManager.onStop(async (res) => {
          if (this._recordTimer) clearInterval(this._recordTimer)
          this._recordTimer = null
          this.isRecording = false
          this.isVoicePressing = false
          const cancelled = this._cancelRecording  // 本次录音是否被用户取消
          this._cancelRecording = false
          // 用户点了取消时直接结束，不上传也不发送消息
          if (cancelled) return
          const duration = Math.max(1, Math.ceil(Number(res.duration || 0) / 1000))  // 录音时长，单位秒
          // 没有临时文件或录音不足一秒时，不发送无效语音
          if (!res.tempFilePath || Number(res.duration || 0) < 1000) {
            uni.showToast({ title: '录音时间太短', icon: 'none' })
            return
          }
          // 录音有效时，将临时 MP3 文件上传并发送给对方
          await this.sendAudioMessage(res.tempFilePath, duration)
        })
        // 录音异常时关闭浮层并清理计时器
        recorderManager.onError((error) => {
          if (this._recordTimer) clearInterval(this._recordTimer)
          this._recordTimer = null
          this.isRecording = false
          console.error('录音失败:', error)
          uni.showToast({ title: '录音失败', icon: 'none' })
        })
        // 使用适合聊天语音的单声道 MP3 参数，最长录制 60 秒
        recorderManager.start({
          duration: 60000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: 'mp3'
        })
      } catch (error) {
        console.error('开始录音失败:', error)
      }
    },

    // ----------- 停止或取消录音
    stopRecording(cancelled) {
      // 先保存用户是取消还是发送，录音稍后启动时也能正确识别取消状态
      this._cancelRecording = cancelled
      // 录音管理器不存在或当前没有录音时，不执行停止操作
      if (!this._recorderManager || !this.isRecording) return
      this._recorderManager.stop()
    },

    // ----------- 上传并发送语音消息
    async sendAudioMessage(filePath, duration) {
      const domain = this.generateGuid()  // 本次语音消息唯一标识
      const msg = {
        MsgID: domain,
        MsgType: 8,
        MsgText: '<m_audio,local:' + filePath + '>',
        DisplayText: '[语音]',
        LocalAudio: filePath,
        AudioDuration: duration,
        MsgTime: this.formatNow(),
        SendUserID: this.myUserId,
        Domain: domain,
        IsMe: true,
        State: -1,
        IsRead: 0  // 已读状态，对方已读回执到达后更新
      }  // 先插入聊天列表的本地语音消息
      // 先展示本地语音气泡，让用户不用等待上传完成
      this.setShowTimeForNew(msg)  // 与上一条消息间隔超过1分钟时显示时间分割线
      this.messageList.push(msg)
      this.scrollToBottom()
      try {
        uni.showLoading({ title: '正在发送中...', mask: true })
        const fileKey = await this.getImageKey(filePath)  // 语音文件上传 key
        const signatureRes = await request({
          url: '/obs/putUrlSignature',
          method: 'post',
          params: { category: 50, key: fileKey, priv: false },
          apiKey: 'profitapi'
        })  // OBS 临时凭证响应
        const signature = signatureRes.data || signatureRes.Data || signatureRes  // OBS 签名信息
        const options = signature.options || signature.Options  // OBS 上传参数
        const credential = signature.credential || signature.Credential  // OBS 临时访问凭证
        if (!options || !credential) throw new Error('OBS上传凭证无效')
        // 使用现有 OBS 上传能力，把录音临时文件上传为音频文件
        await this.uploadImageToObs(filePath, 'audio/mpeg', options, credential)
        const displayDomain = String(options.displayDomain || '').replace(/\/$/, '')  // 语音公开访问域名
        if (!displayDomain) throw new Error('语音访问地址无效')
        const audioPath = displayDomain + '/' + options.key  // 可以直接播放的语音公开地址
        const msgText = '<m_audio,' + audioPath + ',' + duration + '>'  // 语音消息标准格式
        await this.sendToPeer(msgText, domain)  // 先通过 IM SDK 实时送达对端
        // 保存标准语音消息，对方会根据公开地址和时长展示、播放
        await saveRecordByClient({
          RecvDataID: this.dataId,
          SessionCategoryID: this.categoryId,
          MsgText: msgText,
          Domain: domain
        })
        // 上传和消息保存成功后，把本地气泡更新成线上语音消息
        msg.MsgText = msgText
        msg.AudioPath = audioPath
        msg.State = 1
        RecentService.new_message(this.interlocutorKey, msg)  // 同步会话列表的最后一条消息
      } catch (error) {
        console.error('发送语音失败:', error)
        msg.State = 0
        uni.showToast({ title: error.message || '发送语音失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    // ----------- 播放或停止语音消息
    async toggleAudio(msg) {
      // 当前语音正在播放时，再次点击就暂停播放
      if (this.playingAudioId === msg.MsgID && this._audioContext) {
        this._audioContext.pause()
        this.playingAudioId = ''
        return
      }
      // 当前播放器播放过这条语音时，重置进度后直接复用，不重复下载
      if (this._audioContext && this._audioMessageId === msg.MsgID) {
        const audioContext = this._audioContext  // 需要重新播放的语音播放器
        audioContext.stop()
        setTimeout(() => {
          if (this._audioContext !== audioContext) return
          this.playingAudioId = msg.MsgID
          audioContext.play()
        }, 50)
        return
      }
      // 切换到其他语音前销毁旧播放器，避免两条语音同时播放
      if (this._audioContext) {
        this._audioContext.destroy()
        this._audioContext = null
      }
      try {
        this.playingAudioId = msg.MsgID
        const audioSource = this.getAudioRemoteUrl(msg)  // 远程语音地址，InnerAudioContext 直接播放
        const audioContext = uni.createInnerAudioContext()  // 当前语音播放器
        this._audioContext = audioContext
        this._audioMessageId = msg.MsgID
        audioContext.autoplay = false
        audioContext.loop = false
        // 播放结束后只清理动画状态，不自动循环播放
        audioContext.onEnded(() => {
          if (this._audioContext !== audioContext) return
          this.playingAudioId = ''
        })
        // 暂停或停止时同步关闭语音波形动画
        audioContext.onPause(() => {
          if (this._audioContext === audioContext) this.playingAudioId = ''
        })
        audioContext.onStop(() => {
          if (this._audioContext === audioContext) this.playingAudioId = ''
        })
        // 播放异常时恢复气泡状态并提示用户
        audioContext.onError((error) => {
          if (this._audioContext !== audioContext) return
          console.error('播放语音失败:', error)
          this.playingAudioId = ''
          uni.showToast({ title: '语音播放失败', icon: 'none' })
        })
        audioContext.src = audioSource
        audioContext.play()
      } catch (error) {
        console.error('下载语音失败:', error)
        this.playingAudioId = ''
        uni.showToast({ title: '语音加载失败', icon: 'none' })
      }
    },

    // ----------- 获取语音远程地址
    getAudioRemoteUrl(msg) {
      const audioPath = String(msg.AudioPath || '')  // 消息中保存的语音路径
      return audioPath.indexOf('http') === 0
        ? audioPath
        : 'https://big-engineer.oss-cn-hangzhou.aliyuncs.com/' + audioPath.replace(/^[^/]+\//, '')  // 兼容历史 bucket/key 格式
    },

    // ----------- 将旧格式产品URL统一转成 product-detail 格式（参考 big-engineer 项目）
    transformProductDetailUrl(url) {
      // 格式1: /product/detail/数字?version=数字
      const regex1 = /(^https:\/\/big-engineer\.global-dsc\.cn)?\/product\/detail\/(\d+)\?version=(\d+)/
      // 格式2: /?id=数字&version=数字
      const regex2 = /(^https:\/\/big-engineer\.global-dsc\.cn)?\/\?id=(\d+)&version=(\d+)/
      let productId = ''  // 产品ID
      let version = ''  // 版本号
      let domain = 'https://big-engineer.global-dsc.cn'  // 域名
      const match1 = url.match(regex1)
      if (match1) {
        domain = match1[1] || domain
        productId = match1[2]
        version = match1[3]
      } else {
        const match2 = url.match(regex2)
        if (match2) {
          domain = match2[1] || domain
          productId = match2[2]
          version = match2[3]
        }
      }
      // 匹配成功则返回统一格式
      if (productId && version) {
        return domain + '/product-detail/?id=' + productId + '&version=' + version
      }
      // 非产品页面返回原URL
      return url
    },

    // ----------- 点击链接卡片跳转
    onLinkTap(msg) {
      if (!msg.LinkUrl) return
      // 先统一URL格式，再判断是否产品详情链接
      const resultUrl = this.transformProductDetailUrl(msg.LinkUrl)
      // 产品详情链接跳转到小程序原生页面
      if (resultUrl.indexOf('product-detail') > -1) {
        const idMatch = resultUrl.match(/[?&]id=(\d+)/)  // 产品ID匹配结果
        const prodId = idMatch ? idMatch[1] : ''  // 提取的产品ID
        if (prodId) {
          uni.navigateToMiniProgram({
            appId: 'wx795238050c6d6512',
            path: '/pagesCurrency/pages/product-detail/index?prodId=' + prodId
          })
          return
        }
      }
      // 非产品链接用webview打开
      uni.navigateTo({ url: '/pages-sub/web-view/index?url=' + encodeURIComponent(msg.LinkUrl) })
    },

    // ----------- 解析询价卡片消息文本，提取各字段用于卡片展示
    parseInquiryCard(msg) {
      const text = String(msg.DisplayText || msg.MsgText || '') // 询价消息原始文本
      // 按行分割，逐行匹配 "字段名：值"，值两边的【】去掉
      const lines = text.split(/[\n\r]+/) // 文本按换行拆成的行列表
      const map = {} // 字段名 -> 值 的映射
      lines.forEach(line => {
        const m = line.match(/^\s*([^：:\n]+?)\s*[:：]\s*(.+?)\s*$/)
        if (m) {
          const key = m[1].trim() // 字段名
          const val = m[2].trim().replace(/[【】]/g, '') // 字段值，去掉首尾【】
          map[key] = val
        }
      })
      return {
        title: map['询价标题'] || '', // 询价标题
        inquiryId: map['询价ID'] || '', // 询价ID，用于跳转详情页
        model: map['产品名称及型号'] || '', // 产品名称及型号
        quantity: map['预计采购数量'] || '', // 预计采购数量
        deliveryTime: map['要求交货时间'] || '', // 要求交货时间
        location: map['交货地点'] || '', // 交货地点
        contact: map['联系人'] || '' // 联系人
      }
    },

    // ----------- 点击询价卡片跳转到询价详情页
    onInquiryTap(msg) {
      // 优先用后端字段，没有则从消息文本解析询价ID
      const inquiryId = msg.InquiryId || this.parseInquiryCard(msg).inquiryId || ''
      if (!inquiryId) {
        uni.showToast({ title: '询价ID缺失，暂无法查看详情', icon: 'none' })
        return
      }
      uni.navigateTo({ url: '/im-message/pages/inquiry/detail?id=' + inquiryId })
    },

    // ----------- 解析报价卡片消息文本，提取各字段用于卡片展示
    parseQuoteCard(msg) {
      const text = String(msg.DisplayText || msg.MsgText || '') // 报价消息原始文本
      // 按行分割，逐行匹配 "字段名：值"，值两边的【】去掉
      const lines = text.split(/[\n\r]+/) // 文本按换行拆成的行列表
      const map = {} // 字段名 -> 值 的映射
      lines.forEach(line => {
        const m = line.match(/^\s*([^：:\n]+?)\s*[:：]\s*(.+?)\s*$/)
        if (m) {
          const key = m[1].trim() // 字段名
          const val = m[2].trim().replace(/[【】]/g, '') // 字段值，去掉首尾【】
          map[key] = val
        }
      })
      return {
        inquiryId: map['询价ID'] || '', // 询价ID，用于跳转详情页
        quoteId: map['报价ID'] || '', // 报价ID
        quoteTitle: map['报价标题'] || '', // 报价标题，作为卡片高亮标题
        company: map['报价企业'] || '', // 报价企业
        product: map['交货产品名称型号'] || '', // 交货产品名称型号
        quantity: map['数量'] || '', // 数量
        deliveryTime: map['交货时间'] || '', // 交货时间
        location: map['交货地点'] || '', // 交货地点
        contact: map['联系人'] || '' // 联系人
      }
    },

    // ----------- 点击报价卡片弹出温馨提示（不跳详情，提示去大国工匠客户端处理）
    onQuoteTap(msg) {
      this.quoteTipVisible = true
    },

    // ----------- 关闭报价卡片温馨提示弹窗
    closeQuoteTip() {
      this.quoteTipVisible = false
    },

    // ----------- 判断是否显示已读/未读状态（仅单聊，群聊和通知不显示）
    showReadStatus(msg) {
      // 群聊和通知不显示已读未读
      if (this.categoryId === '52' || this.categoryId === '54') return false
      // 只显示自己发的消息的已读未读状态
      if (String(msg.SendUserID) !== String(this.myUserId)) return false
      // 撤回消息不显示
      if (msg.IsRevoke) return false
      // 其余情况都显示，IsRead !== 1 时一律按未读展示
      return true
    },

    // ----------- 跳转发产品页面
    onSendProduct() {
      this.showMore = false
      const params = [
        'key=' + encodeURIComponent(this.interlocutorKey),
        'name=' + encodeURIComponent(this.interlocutorName),
        'logo=' + encodeURIComponent(this.interlocutorLogo)
      ].join('&')
      uni.navigateTo({ url: '/im-message/pages/product/index?' + params })
    },

    // ----------- 选择文件并发送
    onPickFile() {
      this.showMore = false
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        success: (res) => {
          const file = res.tempFiles[0]  // 用户选中的文件
          if (!file) return
          this.sendFileMessage(file.path, file.name, file.size)
        },
        fail: (error) => {
          if (!String(error.errMsg || '').includes('cancel')) {
            uni.showToast({ title: '选择文件失败', icon: 'none' })
          }
        }
      })
    },

    // ----------- 上传并发送文件消息
    async sendFileMessage(filePath, fileName, fileSize) {
      const domain = this.generateGuid()  // 本次文件消息唯一标识
      const msg = {
        MsgID: domain,
        MsgType: 7,
        MsgText: '<m_file,local:' + filePath + '>',
        DisplayText: '[文件]',
        FileName: fileName,
        FileSize: fileSize,
        MsgTime: this.formatNow(),
        SendUserID: this.myUserId,
        Domain: domain,
        IsMe: true,
        State: -1,
        IsRead: 0
      }  // 先插入列表展示的本地文件消息
      this.setShowTimeForNew(msg)  // 与上一条消息间隔超过1分钟时显示时间分割线
      this.messageList.push(msg)
      this.scrollToBottom()
      try {
        uni.showLoading({ title: '正在发送中...', mask: true })
        const ext = this.getFileExt(fileName)  // 文件后缀
        const contentType = this.getContentType(ext)  // 文件 ContentType
        const fileKey = await this.getImageKey(filePath)  // OBS 文件唯一 key
        const signatureRes = await request({
          url: '/obs/putUrlSignature',
          method: 'post',
          params: { category: 50, key: fileKey, priv: false },
          apiKey: 'profitapi'
        })  // OBS 临时凭证响应
        const signature = signatureRes.data || signatureRes.Data || signatureRes  // 兼容接口不同响应层级
        const options = signature.options || signature.Options  // OBS 上传参数
        const credential = signature.credential || signature.Credential  // OBS 临时访问凭证
        if (!options || !credential) throw new Error('OBS上传凭证无效')
        // 复用已有的 OBS 上传方法
        await this.uploadImageToObs(filePath, contentType, options, credential)
        const displayDomain = String(options.displayDomain || '').replace(/\/$/, '')  // OBS 公开访问域名
        // 调用 saveDocumentLife 保存文件元数据到资料库，拿到 ID/LifeVersion/CreateUser
        const FileBucket = options.bucket  // OBS 桶名
        const FileServerPath = options.key  // OBS 文件路径
        const saveData = {
          Datas: [
            {
              DataId: 0,
              LifeToken: null,
              Data: {
                DocName: fileName,
                FileBucket,
                FileExt: '.' + ext,
                FileHash: fileKey,
                FileModifyDate: this.formatNow(),
                FileServerPath,
                FileSize: fileSize
              }
            }
          ]
        }  // 保存到资料库的请求体
        const saveRes = await saveDocumentLife(saveData)  // 资料库保存响应
        const docData = (saveRes.data || saveRes.Data || saveRes)[0] || (Array.isArray(saveRes) ? saveRes[0] : saveRes)  // 兼容不同响应结构
        if (!docData || !docData.ID) throw new Error('保存文件资料失败')
        // 拼接文件消息格式：<m_file,110:ID:LifeVersion:CreateUser,size,encodedName,1>
        const filePathStr = '110:' + docData.ID + ':' + docData.LifeVersion + ':' + docData.CreateUser
        const msgText = '<m_file,' + filePathStr + ',' + fileSize + ',' + encodeURIComponent(fileName) + ',1>'
        await this.sendToPeer(msgText, domain)  // 先通过 IM SDK 实时送达对端
        await saveRecordByClient({
          RecvDataID: this.dataId,
          SessionCategoryID: this.categoryId,
          MsgText: msgText,
          Domain: domain
        })
        msg.MsgText = msgText
        msg.FilePath = filePathStr
        msg.FilePriv = '1'
        msg.FileDomain = displayDomain  // 保存 OBS 公开域名，下载时直接用
        msg.State = 1
        RecentService.new_message(this.interlocutorKey, msg)  // 同步会话列表的最后一条消息
      } catch (error) {
        console.error('发送文件失败:', error)
        msg.State = 0
        uni.showToast({ title: error.message || '发送文件失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    // ----------- 点击文件卡片下载并打开
    async onFileTap(msg) {
      if (!msg.FilePath) return
      // 本地文件（发送中）直接打开
      const localMatch = String(msg.MsgText || '').match(/<m_file,local:([^>]+)>/i)
      if (localMatch) {
        uni.openDocument({
          filePath: localMatch[1],
          showMenu: true,
          fail: () => uni.showToast({ title: '无法打开此文件', icon: 'none' })
        })
        return
      }
      // 路径拆分 110:ID:LifeVersion:CreateUser
      const parts = String(msg.FilePath).split(':')
      const dataId = parts[1] || ''  // 文档ID
      uni.showLoading({ title: '正在加载...', mask: true })
      try {
        // 第一步：调 fileinfo 拿 FileServerPath，和 supply-chain-im 的 _download / preView 流程一致
        const fileInfoRes = await getDocFileInfo(dataId)  // fileinfo 响应
        const fileInfo = fileInfoRes.data || fileInfoRes.Data || fileInfoRes  // 兼容不同响应层级
        const fileServerPath = fileInfo.FileServerPath || fileInfo.fileServerPath || ''  // OBS 文件路径
        if (!fileServerPath) throw new Error('文件不存在或已删除')
        // 第二步：拼 OBS 直链下载（和 supply-chain-im 的 JnOssLook + '/' + FileServerPath 一样）
        let downloadUrl = 'https://prodimg.global-dsc.cn/' + fileServerPath  // OBS 公开访问直链
        // CAD 模型文件先调预览接口转换，3D 用查看器在线看，2D 转换成 PDF 后走下载打开
        const modelViewType = this.getModelViewType(msg.FileName)  // 模型类型：3d / 2d / 空
        if (modelViewType) {
          const viewUrl = await this.fetchCadViewUrl(downloadUrl, msg.FileName, modelViewType)  // 转换后的文件地址
          if (!viewUrl) return  // 不支持预览的已提示过
          if (modelViewType === '3d') {
            // 3D 模型需要 cad-aps 查看器渲染，webview 打开
            uni.navigateTo({ url: '/pages-sub/web-view/index?url=' + encodeURIComponent('https://cad-aps.global-dsc.cn/?filePath=' + viewUrl) })
            return
          }
          downloadUrl = viewUrl  // 2D 转换产物是 PDF，直接走下面的下载打开流程
        }
        // 下载文件到临时目录再用 openDocument 预览
        const downloadRes = await new Promise((resolve, reject) => {
          uni.downloadFile({
            url: downloadUrl,
            success: resolve,
            fail: reject
          })
        })
        if (downloadRes.statusCode !== 200) {
          throw new Error('下载失败，状态码：' + downloadRes.statusCode)
        }
        // 2D 转换产物是 PDF，文件类型固定传 pdf；其他文件按原后缀，避免临时文件没有后缀微信识别不了
        const openFileType = modelViewType === '2d' ? 'pdf' : this.getFileExt(msg.FileName)  // openDocument 的文件类型
        uni.openDocument({
          filePath: downloadRes.tempFilePath,
          fileType: openFileType || undefined,
          showMenu: true,
          fail: () => uni.showToast({ title: '无法打开此文件', icon: 'none' })
        })
      } catch (error) {
        console.error('下载文件失败:', error)
        uni.showToast({ title: error.message || '下载文件失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    // ----------- 判断文件是否为 CAD 模型，返回 3d / 2d / 空字符串
    getModelViewType(fileName) {
      if (!fileName) return ''
      const name = String(fileName).toLowerCase()  // 统一小写再匹配后缀
      // Creo 版本后缀 prt.1 ~ prt.10，用 endsWith 单独处理
      if (/\.prt\.([1-9]|10)$/.test(name)) return '3d'
      const ext = this.getFileExt(fileName)  // 文件后缀
      const model3dExts = ['sldprt', 'step', 'stp', 'prt', 'catpart', 'par', 'z3prt']  // 3D 模型后缀
      const model2dExts = ['dwg', 'dxf', 'exb', 'drw', 'slddrw', 'catdrawing', 'dft', 'idw']  // 2D 图纸后缀
      if (model3dExts.includes(ext)) return '3d'
      if (model2dExts.includes(ext)) return '2d'
      return ''
    },

    // ----------- 调 CAD 预览接口，返回转换后的文件地址（3D 是模型文件，2D 是 PDF）
    async fetchCadViewUrl(downloadUrl, fileName, viewType) {
      // Creo 版本后缀的 fileExt 传 prt.N，和 supply-chain-im 一致；其余传不带点的后缀
      const name = String(fileName).toLowerCase()  // 统一小写
      const prtVersionMatch = name.match(/\.prt\.([1-9]|10)$/)  // prt.1~10 匹配结果
      const fileExt = prtVersionMatch ? 'prt.' + prtVersionMatch[1] : this.getFileExt(fileName)  // 传给接口的后缀
      const viewApi = viewType === '3d' ? getFile3DView : getFile2DView  // 3D/2D 预览接口
      const viewRes = await viewApi({ downUrl: downloadUrl, fileExt })  // 预览接口响应
      const viewUrl = typeof viewRes === 'string' ? viewRes : (viewRes.data || viewRes.Data || '')  // 转换后的文件地址
      if (!viewUrl) {
        uni.showToast({ title: '该模型暂不支持预览', icon: 'none' })
        return ''
      }
      return viewUrl
    },

    // ----------- 获取文件后缀（小写，不含点）
    getFileExt(fileName) {
      if (!fileName) return ''
      const ext = String(fileName).split('.').pop().toLowerCase()  // 文件后缀
      return ext === fileName ? '' : ext  // 没有后缀时返回空
    },

    // ----------- 根据文件后缀获取图标样式类名
    getFileIconClass(fileName) {
      const ext = this.getFileExt(fileName)  // 文件后缀
      const wordExts = ['doc', 'docx']  // Word 文件后缀列表
      const excelExts = ['xls', 'xlsx']  // Excel 文件后缀列表
      const pptExts = ['ppt', 'pptx']  // PPT 文件后缀列表
      const pdfExts = ['pdf']  // PDF 文件后缀列表
      const zipExts = ['rar', 'zip', '7z', 'gz', 'tar', 'arj', 'z']  // 压缩包后缀列表
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tif', 'tiff']  // 图片后缀列表
      const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', 'mpeg', 'mpg', '3gp', 'rmvb']  // 视频后缀列表
      const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma']  // 音频后缀列表
      if (wordExts.includes(ext)) return 'file-icon-word'
      if (excelExts.includes(ext)) return 'file-icon-excel'
      if (pptExts.includes(ext)) return 'file-icon-ppt'
      if (pdfExts.includes(ext)) return 'file-icon-pdf'
      if (zipExts.includes(ext)) return 'file-icon-zip'
      if (imageExts.includes(ext)) return 'file-icon-image'
      if (videoExts.includes(ext)) return 'file-icon-video'
      if (audioExts.includes(ext)) return 'file-icon-audio'
      return 'file-icon-default'
    },

    // ----------- 根据文件后缀获取 ContentType
    getContentType(ext) {
      const types = {
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf: 'application/pdf',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        zip: 'application/zip',
        rar: 'application/x-rar-compressed'
      }  // 文件后缀与 ContentType 对照表
      return types[ext] || 'application/octet-stream'
    },

    // ----------- 格式化文件大小
    formatFileSize(size) {
      if (!size) return '0B'
      if (size >= 1024 * 1024 * 1024) return (size / (1024 * 1024 * 1024)).toFixed(2) + 'G'
      if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + 'M'
      if (size >= 1024) return (size / 1024).toFixed(2) + 'K'
      return size + 'B'
    }
  }
}
</script>

<style scoped lang="scss">
.chat-root {
  position: relative;
}

.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ededed;
  opacity: 0;
  transition: opacity 0.15s ease;

  &.chat-page-ready {
    opacity: 1;
  }

  /* 自定义导航栏：白色背景 + 底部细分割线，和聊天区有层次感 */
  .chat-navbar {
    background: #ffffff;
    flex-shrink: 0;
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
  }

  .chat-navbar-inner {
    position: relative;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 左侧返回按钮 */
  .chat-navbar-back {
    position: absolute;
    left: 12rpx;
    top: 0;
    bottom: 0;
    width: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    &:active {
      opacity: 0.5;
    }
  }

  /* 返回箭头用 CSS border 画，比字符更精致 */
  .chat-navbar-back-arrow {
    width: 20rpx;
    height: 20rpx;
    border-left: 4rpx solid #1a1a1a;
    border-bottom: 4rpx solid #1a1a1a;
    transform: rotate(45deg);
    margin-left: 8rpx;
  }

  /* 标题文字（不加粗） */
  .chat-navbar-title {
    font-size: 34rpx;
    color: #1a1a1a;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* 群聊标题按钮：去掉背景，靠蓝色文字提示可点击 */
  .chat-navbar-title-btn {
    display: flex;
    flex-direction: row;
    align-items: center;
    max-width: 70%;

    &:active {
      opacity: 0.5;
    }
  }

  /* 群聊标题文字用品牌蓝，蓝色=可点击的视觉语言 */
  .chat-navbar-title-link {
    color: #2455e7;
  }

  /* 群成员总数，蓝色稍浅一点 */
  .chat-navbar-title-count {
    font-size: 34rpx;
    color: #333;
    margin-left: 6rpx;
    flex-shrink: 0;
  }

  /* 引用参考框（气泡外部，微信风格） */
  .msg-quote-ref-box {
    background: #e1e2e6;
    color: gray;
    font-size: 26rpx;
    margin-top: 10rpx;
    padding: 10rpx 20rpx;
    line-height: 38rpx;
    border-radius: 10rpx;
    max-width: 100%;
    box-sizing: border-box;
    word-break: break-all;
  }

  /* 消息列表 */
  .chat-content {
    flex: 1;
    overflow: hidden;
    padding: 0 20rpx;
    box-sizing: border-box;

    /* 隐藏滚动条但保留滚动 */
    ::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    scrollbar-width: none;

    /* 加载更多 */
    .load-more-tip {
      display: flex;
      justify-content: center;
      padding: 20rpx 0;
      .load-more-text {
        font-size: 22rpx;
        color: #989393;
      }
    }

    /* 时间分割线*/
    .time-divider {
      display: flex;
      justify-content: center;
      padding: 24rpx 0;
      .time-divider-text {
        font-size: 26rpx;
        color: #989393;
      }
    }

    /* 撤回提示 */
    .msg-revoke-tip {
      display: flex;
      justify-content: center;
      padding: 0 0 22rpx;
      text {
        font-size: 26rpx;
        color: gray;
        // background: #e1e2e6;
        padding: 8rpx 24rpx;
        border-radius: 8rpx;
      }
    }

    /* 消息行*/
    .msg-row {
      display: flex;
      align-items: flex-start;
      margin-top: 0;
      margin-bottom: 26rpx;

      &.msg-row-left {
        flex-direction: row;
        .msg-avatar {
          margin-right: 20rpx;
        }
      }
      &.msg-row-right {
        flex-direction: row;
        justify-content: flex-end;
        .msg-avatar {
          margin-left: 20rpx;
        }
        .msg-content-col {
          align-items: flex-end;
        }
        /* 右侧气泡行容器（包含已读未读标记和气泡） */
        .msg-bubble-wrap-right {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          max-width: 100%;
        }
        /* 已读/未读标记文字 */
        .msg-read-status {
          font-size: 24rpx;
          color: #a8a8a8;
          margin-right: 12rpx;
          margin-bottom: 8rpx;
          flex-shrink: 0;
          &.msg-read-unread {
            color: #ff3a0d;
          }
        }
      }

      /* 头像 */
      .msg-avatar {
        width: 84rpx;
        height: 84rpx;
        border-radius: 12rpx;
        flex-shrink: 0;
      }

      /* 群聊发送人名称 */
      .msg-sender-name {
        font-size: 24rpx;
        color: #999;
        margin-top: -8rpx;
        margin-bottom: 10rpx;
        max-width: 400rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* 消息内容列（气泡+引用框） */
      .msg-content-col {
        margin-top: 6rpx;
        display: flex;
        flex-direction: column;
        width: 80%;
        max-width: 80%;
        min-width: 0;
        align-items: flex-start;
      }

      /* 气泡 */
      .msg-bubble {
        max-width: 532rpx; // 气泡最大宽度上限（原来按屏幕 80% 算能到 545rpx 左右，太长了）
        padding: 18rpx 22rpx 16rpx 22rpx;
        border-radius: 10rpx;
        position: relative;
        box-sizing: border-box;

        &.msg-bubble-left {
          background: #fff;
          &::after {
            content: '';
            position: absolute;
            top: 26rpx;
            left: -12rpx;
            border-style: solid;
            border-width: 10rpx 14rpx 10rpx 0;
            border-color: transparent #fff transparent transparent;
          }
        }
        &.msg-bubble-right {
          background: #95ec69;
          &::after {
            content: '';
            position: absolute;
            top: 26rpx;
            right: -12rpx;
            border-style: solid;
            border-width: 10rpx 0 10rpx 14rpx;
            border-color: transparent transparent transparent #95ec69;
          }
        }

        .msg-text {
          font-size: 32rpx;
          line-height: 1.4;
          color: #191919;
          word-break: break-all;
          line-break: anywhere; // 放宽标点避头尾规则，避免行尾因标点不能换行而空出一个字的位置（老系统可能不生效）

          /* @名字 片段显示橙色 */
          .msg-at-text {
            // color: #1095ff;
          }
        }

        /* 图片消息气泡：去掉背景色和内边距，只保留浅边框 */
        &.msg-bubble-image {
          background: transparent !important;
          padding: 0;

          &::after { display: none; }

          .msg-image {
            width: 220rpx;
            border-radius: 8rpx;
            border: 1rpx solid rgba(15, 23, 42, 0.08);
            box-sizing: border-box;

            &.msg-image-landscape {
              width: 360rpx;
            }
          }
        }

        /* 链接卡片气泡：去掉气泡尖角，用卡片自身样式 */
        &.msg-bubble-link {
          background: transparent !important;
          padding: 0;
          max-width: 480rpx;

          &::after { display: none; }
        }

        /* 文件卡片气泡：去掉气泡背景，用卡片自身样式 */
        &.msg-bubble-file {
          background: transparent !important;
          padding: 0;
          max-width: 520rpx;

          &::after { display: none; }
        }

        /* 询价卡片气泡：去掉气泡背景，用卡片自身样式 */
        &.msg-bubble-inquiry {
          background: transparent !important;
          padding: 0;
          max-width: 536rpx;

          &::after { display: none; }
        }

        /* 报价卡片气泡：去掉气泡背景，用卡片自身样式 */
        &.msg-bubble-quote {
          background: transparent !important;
          padding: 0;
          max-width: 536rpx;

          &::after { display: none; }
        }

        /* 图片消息 */
        .msg-image {
          width: 220rpx;
          border-radius: 8rpx;
        }

        /* 链接卡片 */
        .msg-link-card {
          border-radius: 16rpx;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.06);

          .link-card-header {
            display: flex;
            align-items: center;
            font-size: 26rpx;
            color: #8c8c8c;
            padding: 20rpx 28rpx 16rpx;
            border-bottom: 1rpx solid rgba(15, 23, 42, 0.04);

            &::before {
              content: '';
              width: 14rpx;
              height: 14rpx;
              border-radius: 50%;
              background: #4a6fa5;
              margin-right: 10rpx;
              flex-shrink: 0;
            }
          }

          .link-card-body {
            display: flex;
            align-items: center;
            padding: 28rpx 28rpx;

            .link-card-logo {
              width: 96rpx;
              height: 96rpx;
              border-radius: 12rpx;
              flex-shrink: 0;
              margin-right: 20rpx;
              background: #f4f5f7;
            }

            .link-card-logo-placeholder {
              width: 96rpx;
              height: 96rpx;
              border-radius: 12rpx;
              flex-shrink: 0;
              margin-right: 20rpx;
              background: linear-gradient(135deg, #f0f3f7, #e8edf3);
              display: flex;
              align-items: center;
              justify-content: center;

              text {
                font-size: 40rpx;
                opacity: 0.15;
              }
            }

            .link-card-info {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 8rpx;

              .link-card-title {
                font-size: 28rpx;
                color: #2c3e50;
                font-weight: 400;
                line-height: 40rpx;
                display: -webkit-box;
                overflow: hidden;
                line-clamp: 2;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
              }

              .link-card-url {
                font-size: 24rpx;
                color: #a8adb5;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }

          &:active {
            transform: scale(0.98);
            box-shadow: 0 1rpx 6rpx rgba(15, 23, 42, 0.04);
          }
        }

        /* 询价卡片 */
        .msg-inquiry-card {
          width: 518rpx;
          border-radius: 18rpx;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 6rpx 24rpx rgba(16, 142, 133, 0.18);

          .inquiry-card-header {
            display: flex;
            align-items: center;
            padding: 20rpx 26rpx;
            background: linear-gradient(135deg, #ff6a49 0%, #e66e1a 100%);

            .inquiry-card-icon {
              font-size: 30rpx;
              margin-right: 12rpx;
            }

            .inquiry-card-title {
              font-size: 28rpx;
              color: #fff;
              font-weight: 600;
            }
          }

          .inquiry-card-body {
            padding: 24rpx 26rpx 16rpx;

            .inquiry-card-highlight {
              display: block;
              font-size: 30rpx;
              color: #1a3a36;
              font-weight: 600;
              line-height: 40rpx;
              padding-bottom: 16rpx;
              margin-bottom: 4rpx;
              border-bottom: 1rpx solid #f0f2f5;
            }

            .inquiry-card-row {
              display: flex;
              align-items: flex-start;
              padding: 10rpx 0;

              .inquiry-card-label {
                width: 124rpx;
                flex-shrink: 0;
                font-size: 26rpx;
                color: #8c95a8;
              }

              .inquiry-card-value {
                flex: 1;
                min-width: 0;
                font-size: 26rpx;
                color: #2c3e50;
                line-height: 34rpx;
              }

              .inquiry-card-value-strong {
                color: #e8821c;
                font-weight: 600;
              }
            }
          }

          .inquiry-card-footer {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20rpx 26rpx;
            background: #fff5f2;
            border-top: 1rpx solid #f0f2f5;

            .inquiry-card-footer-text {
              font-size: 28rpx;
              color: #ff6a49;
              font-weight: 500;
            }

            .inquiry-card-arrow {
              font-size: 28rpx;
              color: #ff6a49;
              margin-left: 5rpx;
            }
          }
        }

        /* 报价卡片：样式与询价卡片一致，头顶和底部换成蓝色系 */
        .msg-quote-card {
          width: 518rpx;
          border-radius: 18rpx;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 6rpx 24rpx rgba(58, 122, 254, 0.18);

          .quote-card-header {
            display: flex;
            align-items: center;
            padding: 20rpx 26rpx;
            background: linear-gradient(135deg, #3a7afe 0%, #2459d6 100%);

            .quote-card-icon {
              font-size: 30rpx;
              margin-right: 12rpx;
            }

            .quote-card-title {
              font-size: 28rpx;
              color: #fff;
              font-weight: 600;
            }
          }

          .quote-card-body {
            padding: 24rpx 26rpx 16rpx;

            .quote-card-highlight {
              display: block;
              font-size: 30rpx;
              color: #1a2a4a;
              font-weight: 600;
              line-height: 40rpx;
              padding-bottom: 16rpx;
              margin-bottom: 4rpx;
              border-bottom: 1rpx solid #f0f2f5;
            }

            .quote-card-row {
              display: flex;
              align-items: flex-start;
              padding: 10rpx 0;

              .quote-card-label {
                width: 124rpx;
                flex-shrink: 0;
                font-size: 26rpx;
                color: #8c95a8;
              }

              .quote-card-value {
                flex: 1;
                min-width: 0;
                font-size: 26rpx;
                color: #2c3e50;
                line-height: 34rpx;
              }

              .quote-card-value-strong {
                color: #3a7afe;
                font-weight: 600;
              }
            }
          }

          .quote-card-footer {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20rpx 26rpx;
            background: #f0f5ff;
            border-top: 1rpx solid #f0f2f5;

            .quote-card-footer-text {
              font-size: 28rpx;
              color: #3a7afe;
              font-weight: 500;
            }
          }
        }

        /* 语音消息 */
        .msg-audio {
          min-width: 146rpx;
          height: 44rpx;
          display: flex;
          align-items: center;
          justify-content: space-between;

          .audio-wave {
            height: 30rpx;
            display: flex;
            align-items: center;
            gap: 5rpx;

            text {
              width: 5rpx;
              background: #333;
              border-radius: 4rpx;

              &:nth-child(1) { height: 10rpx; }
              &:nth-child(2) { height: 18rpx; }
              &:nth-child(3) { height: 28rpx; }
              &:nth-child(4) { height: 20rpx; }
              &:nth-child(5) { height: 12rpx; }
            }
          }

          .audio-duration {
            margin-left: 24rpx;
            font-size: 28rpx;
            color: #333;
          }

          &.playing .audio-wave text {
            animation: audio-wave 0.7s ease-in-out infinite alternate;

            &:nth-child(2) { animation-delay: 0.1s; }
            &:nth-child(3) { animation-delay: 0.2s; }
            &:nth-child(4) { animation-delay: 0.3s; }
            &:nth-child(5) { animation-delay: 0.4s; }
          }
        }

        /* 文件卡片 */
        .msg-file-card {
          display: flex;
          align-items: center;
          width: 438rpx;
          padding: 26rpx 24rpx;
          border-radius: 16rpx;
          background: #fff;
          box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.06);

          .file-card-icon {
            width: 80rpx;
            height: 80rpx;
            border-radius: 12rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-right: 20rpx;

            text {
              color: #fff;
              font-size: 24rpx;
              font-weight: 600;
              text-transform: uppercase;
            }

            &.file-icon-word { background: #2b579a; }
            &.file-icon-excel { background: #217346; }
            &.file-icon-ppt { background: #d24726; }
            &.file-icon-pdf { background: #e80202; }
            &.file-icon-zip { background: #f0a020; }
            &.file-icon-image { background: #2b8a4a; }
            &.file-icon-video { background: #7b1fa2; }
            &.file-icon-audio { background: #7b1fa2; }
            &.file-icon-default { background: #4588fc; }
          }

          .file-card-info {
            flex: 1;
            overflow: hidden;

            .file-card-name {
              display: block;
              font-size: 30rpx;
              color: #333;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .file-card-size {
              display: block;
              margin-top: 8rpx;
              font-size: 26rpx;
              color: #999;
            }
          }
        }
      }
    }

    /* 底部锚点 */
    .msg-bottom-anchor {
      height: 1rpx;
    }
  }

  /* 底部输入区 */
  .chat-footer {
    flex-shrink: 0;
    padding: 8rpx 0;
    background: rgba(242, 242, 242, 0.98);
    border-top: 1rpx solid rgba(15, 23, 42, 0.07);
    box-shadow: 0 -8rpx 28rpx rgba(15, 23, 42, 0.04);

    /* 引用预览条 */
    .quote-preview-bar {
      display: flex;
      align-items: center;
      padding: 16rpx 24rpx;
      background: #f0f0f0;
      border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

      .quote-preview-content {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: flex-start;
        overflow: hidden;

        .quote-preview-author {
          font-size: 26rpx;
          color: #576b95;
          flex-shrink: 0;
        }

        .quote-preview-text {
          font-size: 26rpx;
          color: #888;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .quote-preview-close {
        width: 48rpx;
        height: 48rpx;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 16rpx;

        text {
          font-size: 28rpx;
          color: #999;
        }
      }
    }

    .footer-input-row {
      padding: 14rpx;  // 上下14rpx：单行时内容正好居中，增高时按钮保持贴底（微信效果）
      display: flex;
      align-items: center;  // 输入框增高时按钮贴底部对齐（微信效果）
      gap: 12rpx;

      /* 左右工具按钮 */
      .footer-tool-btn {
        width: 64rpx;
        height: 64rpx;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.15s ease, transform 0.15s ease;

        &:active {
          background: #e7e9ec;
          transform: scale(0.94);
        }

        /* 工具按钮图片图标 */
        .footer-tool-icon {
          width: 56rpx;
          height: 56rpx;
        }
      }

      /* 文本输入框（textarea 自动增高：单行 80rpx，最多约 5 行，超出内部滚动） */
      .footer-input {
        flex: 1;
        min-width: 0;
        height: 80rpx;
        min-height: 80rpx;
        max-height: 256rpx;
        padding: 18rpx 24rpx;  // 上下18rpx + 行高44rpx = 单行正好80rpx
        line-height: 42rpx;
        border: 1rpx solid rgba(15, 23, 42, 0.04);
        border-radius: 12rpx;
        box-sizing: border-box;
        background: #fff;
        color: #20242a;
        font-size: 32rpx;
        box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.035);
      }

      .footer-input-placeholder {
        color: #a8adb5;
        font-size: 32rpx;
      }

      /* 按住说话按钮 */
      .hold-talk-btn {
        flex: 1;
        min-width: 0;
        height: 80rpx;
        border-radius: 18rpx;
        box-sizing: border-box;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #30343a;
        font-size: 30rpx;
        font-weight: 500;
        box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.035);

        &.pressing {
          background: #e5e7ea;
          box-shadow: inset 0 2rpx 8rpx rgba(15, 23, 42, 0.08);
        }

        &.canceling {
          color: #f04444;
          background: #fff0f0;
        }
      }

      /* 发送按钮 */
      .footer-send-btn {
        height: 64rpx;
        padding: 0 24rpx;
        flex-shrink: 0;
        border-radius: 14rpx;
        background: linear-gradient(135deg, #18c56e, #07b85b);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6rpx 14rpx rgba(7, 193, 96, 0.2);

        &:active { transform: scale(0.96); }

        .footer-send-text {
          color: #fff;
          font-size: 27rpx;
          font-weight: 500;
        }
      }
    }

    /* 底部面板 */
    .footer-panel {
      padding: 0 22rpx;
      background: #f3f4f6;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.22s ease, padding 0.22s ease;

      &.panel-open {
        max-height: 500rpx;
        padding: 30rpx 22rpx 22rpx;
        border-top: 1rpx solid rgba(15, 23, 42, 0.05);
      }

      /* 更多操作面板 */
      .panel-grid {
        display: flex;
        flex-wrap: wrap;

        .panel-item {
          width: 25%;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32rpx;

          .panel-icon-wrap {
            width: 104rpx;
            height: 104rpx;
            background: #fff;
            border: 1rpx solid rgba(15, 23, 42, 0.04);
            border-radius: 24rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14rpx;
            box-shadow: 0 3px 9px rgb(224 224 224);

            /* 面板按钮图片图标 */
            .panel-icon-img {
              width: 54rpx;
            }

            /* 文件图标 */
            .icon-file {
              position: relative;
              width: 38rpx;

              .icon-file-body {
                width: 32rpx;
                height: 48rpx;
                border: 3rpx solid #555;
                border-radius: 4rpx;
                position: absolute;
                left: 4rpx;
                box-sizing: border-box;
              }
              .icon-file-corner {
                width: 12rpx;
                height: 12rpx;
                border-top: 3rpx solid #555;
                border-right: 3rpx solid #555;
                position: absolute;
                top: 0;
                right: 0;
              }
              .icon-file-line {
                width: 20rpx;
                height: 3rpx;
                background: #555;
                border-radius: 2rpx;
                position: absolute;
                left: 10rpx;

                &.top { top: 18rpx; }
                &.mid { top: 28rpx; }
                &.bot { top: 38rpx; }
              }
            }

          }

          .panel-label {
            font-size: 24rpx;
            color: #626872;
          }
        }
      }

      /* @群成员面板 */
      &.at-panel {
        .at-scroll {
          max-height: 460rpx;
        }

        .at-item {
          display: flex;
          align-items: center;
          padding: 16rpx 12rpx;
          border-radius: 12rpx;

          &:active {
            background: #e9ebef;
          }

          .at-avatar {
            width: 64rpx;
            height: 64rpx;
            border-radius: 8rpx;
            margin-right: 20rpx;
            flex-shrink: 0;
          }

          /* @全体成员 的头像占位块 */
          .at-all-avatar {
            background: #ff8c1a;
            display: flex;
            align-items: center;
            justify-content: center;

            text {
              color: #fff;
              font-size: 30rpx;
            }
          }

          .at-name {
            font-size: 30rpx;
            color: #20242a;
          }
        }

        .at-empty {
          padding: 60rpx 0;
          text-align: center;
          font-size: 26rpx;
          color: #999;
        }
      }

      /* 表情面板 */
      &.emotion-panel {
        .emotion-scroll {
          height: 440rpx;
        }

        .emotion-grid {
          display: flex;
          flex-wrap: wrap;

          .emotion-item {
            width: 12.5%;
            height: 80rpx;
            display: flex;
            align-items: center;
            justify-content: center;

            .emotion-text {
              font-size: 44rpx;
            }
          }
        }
      }
    }
  }

  /* 微信式录音浮层 */
  .record-mask {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 160rpx;
    left: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    .record-card {
      width: 310rpx;
      min-height: 270rpx;
      padding: 42rpx 28rpx 32rpx;
      border-radius: 28rpx;
      box-sizing: border-box;
      background: rgba(26, 29, 34, 0.84);
      backdrop-filter: blur(14rpx);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 18rpx 50rpx rgba(0, 0, 0, 0.22);

      .record-wave {
        height: 78rpx;
        display: flex;
        align-items: center;
        gap: 11rpx;
        margin-bottom: 28rpx;

        text {
          width: 9rpx;
          height: 30rpx;
          border-radius: 8rpx;
          background: #fff;
          animation: record-wave 0.65s ease-in-out infinite alternate;

          &:nth-child(2) { height: 54rpx; animation-delay: 0.1s; }
          &:nth-child(3) { height: 76rpx; animation-delay: 0.2s; }
          &:nth-child(4) { height: 48rpx; animation-delay: 0.3s; }
          &:nth-child(5) { height: 26rpx; animation-delay: 0.4s; }
        }
      }

      .record-title {
        color: #fff;
        font-size: 29rpx;
        font-weight: 600;
      }

      .record-tip {
        margin-top: 14rpx;
        color: rgba(255, 255, 255, 0.68);
        font-size: 23rpx;
      }
    }

    &.canceling .record-card {
      background: rgba(214, 55, 55, 0.9);

      .record-wave text { animation: none; }
      .record-tip { color: rgba(255, 255, 255, 0.82); }
    }
  }
}

@keyframes audio-wave {
  from { transform: scaleY(0.45); }
  to { transform: scaleY(1); }
}

@keyframes record-wave {
  from { transform: scaleY(0.4); opacity: 0.55; }
  to { transform: scaleY(1); opacity: 1; }
}

/* 微信式长按操作菜单 */
.msg-action-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: transparent;
}

.msg-action-popup {
  position: absolute;
  z-index: 1001;
  background: rgba(44, 44, 46, 0.98);
  border-radius: 16rpx;
  padding: 8rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.28);
  animation: actionPopIn 0.16s ease-out;
  transform-origin: center bottom;

  &.msg-action-popup-below {
    transform-origin: center top;
  }

  .msg-action-arrow {
    position: absolute;
    bottom: -11rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12rpx solid transparent;
    border-right: 12rpx solid transparent;
    border-top: 12rpx solid rgba(44, 44, 46, 0.98);
  }

  &.msg-action-popup-below {
    .msg-action-arrow {
      bottom: auto;
      top: -11rpx;
      border-top: none;
      border-left: 12rpx solid transparent;
      border-right: 12rpx solid transparent;
      border-bottom: 12rpx solid rgba(44, 44, 46, 0.98);
    }
  }

  .msg-action-rows {
    display: flex;
    flex-direction: column;
  }

  .msg-action-row {
    display: flex;
    align-items: stretch;
  }

  .msg-action-item {
    width: 116rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16rpx 0 12rpx;
    border-radius: 10rpx;

    &:active {
      background: rgba(255, 255, 255, 0.12);
    }
  }

  .msg-action-divider {
    width: 1rpx;
    margin: 14rpx 0;
    background: rgba(255, 255, 255, 0.14);
    flex-shrink: 0;
  }

  .msg-action-icon {
    font-size: 34rpx;
    color: #fff;
    margin-bottom: 18rpx;
    line-height: 1;
  }

  .msg-action-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.92);
    line-height: 1;
  }
}

@keyframes actionPopIn {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 转发联系人弹窗 */
.forward-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}

.forward-sheet {
  width: 100%;
  max-height: 70vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  animation: forwardSlideUp 0.2s ease-out;
}

@keyframes forwardSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.forward-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.forward-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #181818;
}

.forward-close {
  font-size: 36rpx;
  color: #999;
  padding: 4rpx 12rpx;
}

.forward-list {
  flex: 1;
  max-height: 60vh;
}

.forward-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:active {
    background: #f5f5f5;
  }
}

.forward-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.forward-name {
  font-size: 30rpx;
  color: #181818;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.forward-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

/* 转发确认弹窗 */
.forward-confirm-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.forward-confirm-dialog {
  width: 560rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  animation: actionPopIn 0.16s ease-out;
}

.forward-confirm-title {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #181818;
  padding: 40rpx 32rpx 16rpx;
}

.forward-confirm-desc {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  padding: 0 32rpx 36rpx;
  line-height: 1.5;
}

.forward-confirm-btns {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.forward-confirm-btn {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  padding: 24rpx 0;

  &:active {
    background: #f5f5f5;
  }
}

.forward-confirm-cancel {
  color: #999;
  border-right: 1rpx solid #f0f0f0;
}

.forward-confirm-ok {
  color: #07c160;
  font-weight: 600;
}

/* 报价卡片温馨提示弹窗 */
.quote-tip-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx;

  .quote-tip-dialog {
    width: 100%;
    background: #fff;
    border-radius: 28rpx;
    padding: 48rpx 40rpx 36rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 24rpx 80rpx rgba(15, 23, 42, 0.25);
    animation: quote-tip-pop 0.25s ease;
  }

  @keyframes quote-tip-pop {
    from { transform: scale(0.85); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .quote-tip-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    margin-bottom: 24rpx;
  }

  .quote-tip-title {
    font-size: 32rpx;
    color: #1a1a1a;
    font-weight: 600;
    margin-bottom: 20rpx;
  }

  .quote-tip-content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    color: #64748b;
    line-height: 44rpx;
    margin-bottom: 36rpx;

    .quote-tip-highlight {
      color: #ef4444;
      font-weight: 600;
      margin: 0 6rpx;
    }
  }

  .quote-tip-btn {
    width: 100%;
    height: 80rpx;
    border-radius: 40rpx;
    background: linear-gradient(135deg, #2563eb, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.35);
  }
}
</style>