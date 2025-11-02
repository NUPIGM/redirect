const day = 0;
const hour = 0;
const minute = 0;

export function expired(date) {}
export async function saveUrl(request, env, url) {
	try {
		const formData = await request.formData();
		const longUrl = formData.get('longUrl');
		const expired = formData.get('expired');

		if (!new URL(longUrl)) {
			return Response.json({ url: 'url 不合法', status: 0 }, { status: 400 });
		}
		const expirationDate = expired || '9999-12-31T23:59';

		if (!longUrl) {
			return Response.json({ url: '请检查 form key 是否为 longUrl', status: 0 }, { status: 400 });
		}
		const shortCode = Math.random().toString(36).substring(2, 6);
		const value = ` {"url": "${longUrl}", "expired": "${Date.parse(expirationDate)}"}`;
		await env.KV.put(shortCode, value);

		const shortUrl = `${url.origin}/${shortCode}`;
		return Response.json({
			url: shortUrl,
			expired: expirationDate,
			status: 1,
		});
	} catch (error) {
		console.warn('formData err:\n', error);
		return Response.json({ url: '请使用form表单请求', status: 0 }, { status: 400 });
	}
}

export async function delUrl(request,env) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		return new Response('Authorization header missing', { status: 401 });
	}
	const token = authHeader.replace('Basic ', '');
	const admin = env.admin || 'admin';
	try {
		// 验证 JWT Token
		let decodedStr = atob(token);
		if (decodedStr !== 'admin:' + admin) {
			return new Response('Authorization error', { status: 401 });
		}
	} catch (error) {
		// 验证失败
		return new Response('Invalid token', { status: 401 });
	}
	const list = await env.KV.list(); // 获取键列表
	for (const key of list.keys) {
		await env.KV.delete(key.name);
	}
	return new Response('全部删除完成');
}
