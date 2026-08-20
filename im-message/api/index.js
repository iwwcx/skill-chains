import request from './request';

// 获取聊天列表
export function getChatList(params) {
  return request({
    url: '/im/GetChatList',
    method: 'get',
    params,
    apiKey: 'profitapi'
  });
}

// 获取群成员列表
export function getGroupUserList(params) {
  return request({
    url: '/im/GroupUserList',
    method: 'get',
    params, // { groupId }
    apiKey: 'profitapi'
  });
}

// 获取团队通知列表
export function getGroupNoticeList(params) {
  return request({
    url: '/im/group/GroupNoticeList',
    method: 'get',
    params, // { noticeId, pageSize }
    apiKey: 'api60'
  });
}

// 获取用户或群组概要信息（categoryId: 20=用户, 52=群组）
export function getSummary(categoryId, dataId) {
  return request({
    url: `/data/${categoryId}/info?DataId=${dataId}`,
    method: 'get',
    apiKey: 'api60'
  });
}

// 获取指定用户完整信息（对应 supply-chain-im 的 /user/getuserinfo）
export function getUserInfo(userId) {
  return request({
    url: '/user/getuserinfo',
    method: 'get',
    params: { userId },
    apiKey: 'profitapi',
    headers: { tokenType: 'jrzz' }
  });
}

// 获取企业详细信息（companyId 来自用户信息的 CompID）
export function getCompanyInfo(companyId) {
  return request({
    url: '/search/getCompanyInfo',
    method: 'get',
    params: { companyId },
    apiKey: 'profitapi',
    headers: { tokenType: 'jrzz' }
  });
}

// 搜索用户（对应 supply-chain-im 的 /user/searchUser）
export function searchUsers(params) {
  return request({
    url: '/user/searchUser',
    method: 'get',
    params,  // { q, page, pageSize }
    apiKey: 'profitapi',
    headers: { tokenType: 'jrzz' },
    skipCodeCheck: true  // 跳过 401/403 拦截，防止误清 token
  });
}

// 搜索群组（对应 supply-chain-im 的 /im/group/GroupListSearch）
export function searchGroups(params) {
  return request({
    url: '/im/group/GroupListSearch',
    method: 'get',
    params,  // { q, page, pageSize }
    apiKey: 'api60'
  });
}

// 申请加入团队（对应 supply-chain-im 的 /im/group/GroupApply）
export function joinGroup(params) {
  return request({
    url: '/im/group/GroupApply',
    method: 'post',
    params,  // { groupId, applyRemark }
    apiKey: 'api60',
    skipCodeCheck: true
  });
}

// 获取好友目录列表（对应 supply-chain-im 的 /dir/2055/list，Category.IMFriendsDir = 2055）
export function getFriendDirList(dirId = 0) {
  return request({
    url: '/dir/2055/list',
    method: 'get',
    params: { dirId },
    apiKey: 'api60'
  });
}

// 创建好友目录（对应 supply-chain-im 的 /dir/2055/add）
export function addFriendDir(data) {
  return request({
    url: '/dir/2055/add',
    method: 'post',
    data,  // { ParentID, DirName }
    apiKey: 'api60'
  });
}

// 添加好友到通讯录（对应 supply-chain-im 的 ApiService.Yun + /addressBook/AddressBookAdd）
export function addFriend(data) {
  return request({
    url: '/yun/addressBook/AddressBookAdd',
    method: 'post',
    data,  // { UserID, UserRemark, DirID }
    apiKey: 'api60',
    skipCodeCheck: true  // 跳过 401 拦截，防止误清 token
  });
}

// 获取聊天记录列表
export function getRecordList(params) {
  return request({
    url: '/im/GetRecordList',
    method: 'get',
    params,
    apiKey: 'api60'
  });
}

// 发送消息（客户端抄送）
export function saveRecordByClient(data) {
  return request({
    url: '/im/SaveRecordByClient',
    method: 'post',
    data,
    apiKey: 'api60'
  });
}

// 获取网易云信登录 token（IM SDK 登录用，对应 big 项目 /im/generateToken）
export function generateToken() {
  return request({
    url: '/im/generateToken',
    method: 'get',
    apiKey: 'api80'
  });
}

// 开始会话（新会话同步到服务端，对应 big 项目 /im/StartChat）
export function startChat(params) {
  return request({
    url: '/im/StartChat',
    method: 'post',
    params, // { chatCategoryId, chatDataId }
    apiKey: 'api60'
  });
}

// 清空会话未读数（对应 big 项目 /im/ResetChat）
export function resetChat(params) {
  return request({
    url: '/im/ResetChat',
    method: 'post',
    params, // { chatId, sendUserId? }
    apiKey: 'api60'
  });
}

// 删除会话（对应 /im/RemoveChat?chatId=会话ID）
export function removeChat(params) {
  return request({
    url: '/im/RemoveChat',
    method: 'post',
    params, // { chatId }
    apiKey: 'api60'
  });
}

// ----------- 获取企业产品列表
export function getCompanyProductList(params) {
  return request({
    url: '/prod/GetSList',
    method: 'get',
    params,
    apiKey: 'api60'
  });
}

// ----------- 获取企业产品目录
export function getCompanyProductDirList(params) {
  return request({
    url: '/site/comp/proddir/list',
    method: 'get',
    params,
    apiKey: 'api60'
  });
}

// ----------- 获取收藏目录
export function getCollectProductDirList(params) {
  return request({
    url: '/dir/2205/list',
    method: 'get',
    params,
    apiKey: 'api60'
  });
}

// ----------- 获取收藏产品列表
export function getCollectProductList(params) {
  return request({
    url: '/favorite/prod/list',
    method: 'get',
    params,
    apiKey: 'api60'
  });
}

// ----------- 获取产品浏览足迹
export function getBrowseProductList(params) {
  return request({
    url: '/logs/ViewProdLogsForUser',
    method: 'get',
    params,
    apiKey: 'api60'
  });
}

// ----------- 图片上传相关接口（对应 supply-chain-im 的上传流程） -----------

// 接口2：获取OBS上传签名，POST /obs/putUrlSignature?category={categoryId}&key={key}&priv={priv}
// 对应 IM 项目：DataService.post(`${ApiService.EngineerApi}/obs/putUrlSignature?category=...&key=...&priv=...`, { ContentType })
export function obsPutUrlSignature(params, data) {
  return request({
    url: '/obs/putUrlSignature',
    method: 'post',
    params, // { category, key, priv }
    data,   // { ContentType }
    apiKey: 'profitapi'
  });
}

// 接口4：保存文档信息到资料库，POST /data/110/savelife
// 对应 IM 项目：DataService.post(`${ApiService.Common}/data/${Category.Document}/savelife`, info)
// Category.Document = 110
export function saveDocumentLife(data) {
  return request({
    url: '/data/110/savelife',
    method: 'post',
    data,
    apiKey: 'api60'
  });
}

// 接口4.1：获取文档文件信息，GET /data/110/fileinfo?dataId=xxx
// 对应 IM 项目：DataService.get(`${ApiService.Common}/data/${Category.Document}/fileinfo?dataId=${docId}`)
export function getDocFileInfo(dataId) {
  return request({
    url: '/data/110/fileinfo',
    method: 'get',
    params: { dataId },
    apiKey: 'api60'
  });
}

// 接口4.2：3D 模型预览，GET /file3Dview?downUrl=xxx&fileExt=xxx
// 对应 IM 项目：DataService.get(`${ApiService.Common}/file3Dview?downUrl=${fileurl}&fileExt=${fileExt}`)
export function getFile3DView(params) {
  return request({
    url: '/file3Dview',
    method: 'get',
    params, // { downUrl, fileExt }
    apiKey: 'api60'
  });
}

// 接口4.3：2D 模型预览，GET /file2Dview?downUrl=xxx&fileExt=xxx
export function getFile2DView(params) {
  return request({
    url: '/file2Dview',
    method: 'get',
    params, // { downUrl, fileExt }
    apiKey: 'api60'
  });
}

// 接口5：黑名单检查，GET /im/getIsUserBlock?blockUserId={blockUserId}
// 对应 IM 项目：DataService.get(`${ApiService.EngineerApi}/im/getIsUserBlock?blockUserId=${blockUserId}`)
export function getIsUserBlock(params) {
  return request({
    url: '/im/getIsUserBlock',
    method: 'get',
    params, // { blockUserId }
    apiKey: 'profitapi'
  });
}

// 接口5.1：拉黑/取消拉黑用户，POST /im/block { blockUserId, status }
// status: 1=拉黑 0=取消拉黑
export function blockUser(params) {
  return request({
    url: '/im/block',
    method: 'post',
    params, // { blockUserId, status }
    apiKey: 'profitapi'
  });
}

// 修改好友备注（对应 supply-chain-im 的 /im/AddressBookUpdate?addressId=对方UserID，body 传 { UserRemark }）
export function updateAddressBook(params, data) {
  return request({
    url: '/im/AddressBookUpdate',
    method: 'post',
    params, // { addressId } 对方用户ID
    data,   // { UserRemark } 备注内容
    apiKey: 'profitapi'
  });
}

// 创建群组（对应 supply-chain-im 的 /im/group/GroupAdd）
export function createGroup(data) {
  return request({
    url: '/im/group/GroupAdd',
    method: 'post',
    data,  // { ID, IMGroupName, GroupUserIds }
    apiKey: 'api60'
  });
}

// 添加群成员（对应 supply-chain-im 的 /im/group/GroupAddUser，body 直接是用户ID数组）
export function addGroupUser(groupId, userIds) {
  return request({
    url: '/im/group/GroupAddUser',
    method: 'post',
    params: { groupId },
    data: userIds,  // ['用户ID1', '用户ID2']
    apiKey: 'api60'
  });
}

// 移除群成员（对应 supply-chain-im 的 /im/group/GroupKickUser）
export function kickGroupUser(params) {
  return request({
    url: '/im/group/GroupKickUser',
    method: 'post',
    params,  // { groupId, userId }
    apiKey: 'api60'
  });
}

// 解散群组（对应 /im/group/GroupDiss?groupId=群ID）
export function dissolveGroup(params) {
  return request({
    url: '/im/group/GroupDiss',
    method: 'post',
    params,  // { groupId }
    apiKey: 'api60'
  });
}

// 退出群组（对应 /im/group/GroupQuit?groupId=群ID）
export function quitGroup(params) {
  return request({
    url: '/im/group/GroupQuit',
    method: 'post',
    params,  // { groupId }
    apiKey: 'api60'
  });
}

// 修改群名片（对应 /im/group/GroupUserRename?groupId=群ID&nameInGroup=名片&userId=用户ID）
// userId 传 0 表示修改自己的群名片
export function groupUserRename(params) {
  return request({
    url: '/im/group/GroupUserRename',
    method: 'post',
    params,  // { groupId, nameInGroup, userId }
    apiKey: 'api60'
  });
}

// 修改群信息（对应 /im/group/GroupUpdate?groupId=群ID，body 传 { IMGroupName, IMGroupMemo, IMGroupLogo }）
export function groupUpdate(groupId, data) {
  return request({
    url: '/im/group/GroupUpdate',
    method: 'post',
    params: { groupId },
    data,  // { IMGroupName }
    apiKey: 'api60'
  });
}

// ----------- 获取询价单详情（对应 profitapi /inquiry/info?id=询价ID）
export function getInquiryInfo(params) {
  return request({
    url: '/inquiry/info',
    method: 'get',
    params,  // { id }
    apiKey: 'accapi',
    headers: { tokenType: 'jrzz' },
    skipCodeCheck: true  // 跳过 401/403 拦截，防止误清 IM token
  });
}

// ----------- 获取可授权人员列表（对应 accapi /stafflist/getStafflistList）
export function getStafflistList(params) {
  return request({
    url: '/stafflist/getStafflistList',
    method: 'get',
    params,  // { Page, PageSize, orgId }
    apiKey: 'accapi',
    headers: { tokenType: 'jrzz' },
    skipCodeCheck: true  // 跳过 401/403 拦截，防止误清 IM token
  });
}

// ----------- 授权报价：指定询价单负责人（对应 accapi /inquiry/ownerUser）
export function setInquiryOwnerUser(data) {
  return request({
    url: '/inquiry/ownerUser',
    method: 'post',
    data,  // { inquiryId, ownerUser }
    apiKey: 'accapi',
    headers: { tokenType: 'jrzz' },
    skipCodeCheck: true  // 跳过 401/403 拦截，防止误清 IM token
  });
}

// ----------- 获取通讯录好友列表（对应 profitapi /im/AddressBookList?pid=目录ID）
export function getAddressBookList(pid) {
  return request({
    url: '/im/AddressBookList',
    method: 'get',
    params: { pid },
    apiKey: 'profitapi'
  });
}

// ----------- 获取我的组织列表（对应 api60 /org/list）
export function getOrgList() {
  return request({
    url: '/org/list',
    method: 'get',
    apiKey: 'api60'
  });
}

// ----------- 获取组织成员列表（对应 api60 /org/stafflist）
export function getOrgStaffList(params) {
  return request({
    url: '/org/stafflist',
    method: 'get',
    params,  // { page, pageSize, orgId }
    apiKey: 'api60'
  });
}

// ----------- 删除单条聊天记录
export function removeRecord(params) {
  return request({
    url: '/im/RemoveRecord?msgId=' + params,
    method: 'post',
    apiKey: 'api60'
  });
}

// ----------- 获取消息总未读数
export function getUnreadTotal() {
  return request({
    url: '/im/GetUnreadTotal',
    method: 'get',
    apiKey: 'api60',
    skipErrorToast: true  // 静默失败，角标拉取失败不弹 toast 打扰用户
  });
}