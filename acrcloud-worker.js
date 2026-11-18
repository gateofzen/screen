// FEELCYCLE Visualizer 用：ACRCloud への中継（Cloudflare Worker）
//
// ブラウザから ACRCloud を直接呼べない（「通信エラー」になる）時だけ使います。
// ページから送られてきた認識リクエスト（署名済み）を、そのまま ACRCloud に転送して結果を返します。
// アクセスキー・シークレットはここには置きません（タブレット側で署名します）。
//
// 使い方：
//   1. Cloudflare のダッシュボード → Workers & Pages → 作成 → Worker を作成
//   2. このファイルの中身を貼り付けて「デプロイ」
//   3. 表示された URL（https://〜.workers.dev）を、ビジュアライザーの調整パネル「APIキー」の ④ に入力

// このページからの呼び出しだけを受け付ける（ほかのサイトに中継として使われないように）
const ALLOWED_ORIGINS = [
  'https://gateofzen.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + ':'));
    if (!allowed) return new Response('forbidden', { status: 403 });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors(origin) });

    // 転送先は ACRCloud の認識サーバーだけに限定
    const host = new URL(request.url).searchParams.get('host') || '';
    if (!/^(identify-[a-z0-9-]+|[a-z0-9-]+\.api)\.acrcloud\.(com|cn)$/.test(host)) {
      return new Response(JSON.stringify({ status: { code: -1, msg: 'invalid host' } }),
        { status: 400, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
    }

    const upstream = await fetch(`https://${host}/v1/identify`, {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('Content-Type') || '' },
      body: request.body,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors(origin), 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
    });
  },
};
