/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
// import expired from util.js
import { saveUrl, delUrl, getKey} from "./util";

async function middleware() {

}
export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname.slice(1);

		// 开放的api接口
		if (path === 'kv') {
			if (request.method === 'POST') {
				return saveUrl(request, env, url);
			} else if (request.method === 'DELETE') {
				return delUrl(request,url,env)
			} else if (request.method === 'GET') {
				return getKey(url,env)
			}
			return new Response('', { status: 405 });
		}
		// 获取长链接
		if (request.method === 'GET') {
			const value = await env.KV.get(path);
			if (value) {
				const valueJson = JSON.parse(value);
				if (valueJson.expired < Date.now()) {
					return await env.ASSETS.fetch(`${url.origin}/expired`);
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
