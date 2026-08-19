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
