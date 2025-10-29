/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

async function saveUrl(request, env, url) {
	try {
		const formData = await request.formData();
		const longUrl = formData.get('longUrl');
		if (!new URL(longUrl)) {
			return Response.json({ url: 'url 不合法', status: 0 }, { status: 400 });
		}
		const expirationDate = formData.get('expirationDate')?formData.get('expirationDate') * 1000 * 60 * 60 * 24 + Date.now() : Date.parse('9999-12-31');
		
		if (!longUrl) {
			return Response.json({ url: '请检查 form key 是否为 longUrl', status: 0 }, { status: 400 });
		}
		const shortCode = Math.random().toString(36).substring(2, 8);
		const value = ` {"url": "${longUrl}", "expirated": "${expirationDate}"}`;
		env.KV.put(shortCode, value);

		const shortUrl = `${url.origin}/${url}`;
		return Response.json({
			url: shortUrl,
			expirated: expirationDate,
			status: 1,
		});
	} catch (error) {
		console.warn('formData err:\n', error);
		return Response.json({ url: '请使用form表单请求', status: 0 }, { status: 400 });
	}
}
async function delUrl(path, env) {
	const longUrl = await env.KV.get(path); //7qfqtp
	if (longUrl) {
		return Response.redirect(longUrl, 302);
	}
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname.slice(1);
		console.log(request);
		
		// 开放的api接口
		if (path === 'kv') {
			if (request.method === 'POST') {
				return saveUrl(request, env, url);
			} else if (request.method === 'DELETE') {
				const list = await env.KV.list(); // 获取键列表
				for (const key of list.keys) {
					await env.KV.delete(key.name);
				}
				return new Response('全部删除完成');
			} else if (request.method === 'GET') {
				const keyList = await env.KV.list();
				return new Response(JSON.stringify(keyList));
			}
			return new Response('', { status: 405 });
		}
		// 获取长链接
		if (request.method === 'GET') {
			const value = await env.KV.get(path); //7qfqtp
			// return Response.redirect(value, 302);
			const valueJson = JSON.parse(value);
			if (value) {
				if (valueJson.expirated < Date.now()) {
					return new Response('过期了');
				}
				console.log(typeof valueJson.url);

				return Response.redirect(valueJson.url, 302);
			}
		}
		// 访问静态文件，404直接返回首页
		const assets = await env.ASSETS.fetch(request);
		if (assets.status === 404) {
			return await env.ASSETS.fetch(`${url.origin}/`);
		}
		return assets;
	},
};
