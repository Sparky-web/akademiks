#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Читаем переменную окружения UNIVERSITY
const university = process.env.NEXT_PUBLIC_UNIVERSITY;

// Определяем URL на основе университета
let targetUrl;
if (university === 'RGSU') {
    targetUrl = 'https://rgsu.studentto.ru';
} else {
    targetUrl = 'https://akademiks.urtt.ru';
}

console.log(`Генерация service worker для университета: ${university || 'URTK'}`);
console.log(`Целевой URL: ${targetUrl}`);

// Шаблон service worker
const swTemplate = `console.log('registred')
self.addEventListener('push', function (event) {
  console.log('event!')
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/ios/192.png',
      // badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(clients.openWindow('${targetUrl}'))
})`;

// Путь к файлу service worker
const swPath = join(process.cwd(), 'public', 'sw.js');

// Записываем сгенерированный service worker
writeFileSync(swPath, swTemplate, 'utf8');

console.log(`Service worker успешно сгенерирован в ${swPath}`);
console.log(`URL для уведомлений: ${targetUrl}`);
