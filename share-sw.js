// 曲名リモコンを「アプリとして追加」できるようにするためのサービスワーカー（キャッシュなどは何もしない）
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
