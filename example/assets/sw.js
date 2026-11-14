"use strict";

var CACHE_NAME = "camus-pwa-v1";

self.addEventListener("install", function () {
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches
            .keys()
            .then(function (keys) {
                return Promise.all(
                    keys
                        .filter(function (key) {
                            return key !== CACHE_NAME;
                        })
                        .map(function (key) {
                            return caches.delete(key);
                        })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

self.addEventListener("fetch", function (event) {
    var request = event.request;
    if (request.method !== "GET") {
        return;
    }

    var url;
    try {
        url = new URL(request.url);
    } catch (error) {
        return;
    }

    if (url.origin !== self.location.origin) {
        return;
    }

    // 页面导航：网络优先，失败时回退缓存，保证离线也能打开。
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    if (response && response.ok) {
                        var copy = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(request, copy);
                        });
                    }
                    return response;
                })
                .catch(function () {
                    return caches.match(request).then(function (cached) {
                        return cached || caches.match(self.registration.scope);
                    });
                })
        );
        return;
    }

    // 静态资源：先返回缓存，同时后台更新（stale-while-revalidate）。
    event.respondWith(
        caches.match(request).then(function (cached) {
            var network = fetch(request)
                .then(function (response) {
                    if (response && response.ok) {
                        var copy = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(request, copy);
                        });
                    }
                    return response;
                })
                .catch(function () {
                    return cached;
                });

            return cached || network;
        })
    );
});
