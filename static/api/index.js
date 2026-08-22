import request from './request';

// ----------- 账号密码登录（host: accapi，对应 skill-chain 的 defaultHost）
export const accountLogin = (data) => request({
	url: '/login/login',
	method: 'POST',
	data,
	apiKey: 'accapi'
});

// ----------- 获取用户详情（登录成功后调用，拿完整 userInfo）
export const getUserInfo = () => request({
	url: '/user/getUserInfo',
	method: 'GET',
	apiKey: 'accapi'
});

// ----------- 线索数量统计（浏览/下载/已抢）
export const getClueTotal = () => request({
	url: '/clue/getClueTotal',
	method: 'GET',
	apiKey: 'accapi',
	skipCodeCheck: true, // 未登录时接口会返回 403，这里静默处理不弹 toast
	skipErrorToast: true
});

// ----------- 线索列表（客户线索）
export const getClueList = (params) => request({
	url: '/clue/getClueList',
	method: 'GET',
	params,
	apiKey: 'accapi'
});

// ----------- 抢线索
export const robClue = (data) => request({
	url: '/clue/robClue',
	method: 'POST',
	data,
	apiKey: 'accapi'
});

// ----------- 线索详情（含客户动态 clueList、跟进记录 recordList）
export const getClueInfo = (params) => request({
	url: '/clue/getClueInfo',
	method: 'GET',
	params,
	apiKey: 'accapi'
});

// ----------- 客户资料其他信息（区域、最近下载产品列表）
export const getClueUserInfo = (params) => request({
	url: '/clue/getClueUserInfo',
	method: 'GET',
	params,
	apiKey: 'accapi'
});

// ----------- 查看线索真实手机号/邮箱/公司（脱敏时用这个拿真实值）
export const getClueUserPhone = (params) => request({
	url: '/clue/getClueUserPhone',
	method: 'GET',
	params,
	apiKey: 'accapi',
	skipErrorToast: true
});

// ----------- 更新线索状态
export const updateClueStatus = (data) => request({
	url: '/clue/updateClueStatus',
	method: 'POST',
	data,
	apiKey: 'accapi'
});

// ----------- 放弃线索（扔回公海）
export const throwHighSeas = (data) => request({
	url: '/clue/throwHighSeas',
	method: 'POST',
	data,
	apiKey: 'accapi'
});

// ----------- 新增线索跟进记录（写跟进）
export const addFollowRecord = (data) => request({
	url: '/clue/addFollowRecord',
	method: 'POST',
	data,
	apiKey: 'accapi'
});

// ----------- 转交线索（转给团队其他成员）
export const transferClue = (data) => request({
	url: '/clue/transferClue',
	method: 'POST',
	data,
	apiKey: 'accapi'
});

// ----------- 团队列表（对应 skill-chain 的 teamGetTeamList，type: 1=已抢客户 2=已成交客户）
export const getTeamList = (params) => request({
	url: '/stafflist/getStafflistList',
	method: 'GET',
	params,
	apiKey: 'accapi'
});

// ----------- 获取当前用户可切换的企业账号列表
export const getMyUsers = () => request({
	url: '/tanke/myUsers',
	method: 'GET',
	apiKey: 'api80'
});
