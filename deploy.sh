#!/bin/bash
# StarsCS Production 1-Click Deployment Script for stars-shop.uz

echo "🚀 StarsCS (stars-shop.uz) loyihasini serverga o'rnatish boshlandi..."

# 1. Backend sozlamalari va PM2
cd backend
npm install
npx prisma db push
pm2 restart starscs-backend || pm2 start src/server.js --name "starscs-backend"

# 2. Frontend Build
cd ../frontend
npm install
npm run build

echo "✅ Loyiha muvaffaqiyatli build qilindi!"
echo "Nginx sozlamalarini /etc/nginx/sites-available/stars-shop ga saqlang va SSL (HTTPS) o'rnating:"
echo "sudo certbot --nginx -d stars-shop.uz -d www.stars-shop.uz"
