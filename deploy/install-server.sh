#!/usr/bin/env bash
# 誉友科技 H5 站点 · ECS 一次性安装脚本
# 用法（ECS 上，需 root 或 sudo）: sudo bash install-server.sh <你的备案域名>
# 例如: sudo bash /var/www/yuyoo-tech/deploy/install-server.sh yuyookj.com
set -euo pipefail

DOMAIN="${1:-example.com}"
WEBROOT="/var/www/yuyoo-tech"
CONF_SRC="$WEBROOT/deploy/nginx-site.conf"

echo "== 1/4 安装 nginx + openssl =="
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y nginx openssl
elif command -v yum >/dev/null 2>&1; then
  yum install -y nginx openssl
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y nginx openssl
else
  echo "无法识别系统包管理器，请手动安装 nginx 与 openssl"; exit 1
fi

echo "== 2/4 生成证书（占位自签名，生产请替换为正式证书）=="
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout "/etc/nginx/ssl/$DOMAIN.key" -out "/etc/nginx/ssl/$DOMAIN.pem" \
  -subj "/CN=$DOMAIN" 2>/dev/null || true

echo "== 3/4 写入站点配置 =="
if [ -f "$CONF_SRC" ]; then
  sed "s/<DOMAIN>/$DOMAIN/g" "$CONF_SRC" > /etc/nginx/conf.d/yuyoo-tech.conf
else
  echo "未找到 $CONF_SRC，跳过配置（请先上传 deploy/ 目录）"
fi

echo "== 4/4 校验并启动 =="
nginx -t
systemctl enable nginx 2>/dev/null || true
systemctl restart nginx

echo "=============================================="
echo " 部署完成。请确认："
echo " 1. ECS 安全组入方向已放行 80/443（仅对公网开放这两个端口）"
echo " 2. 域名 $DOMAIN 已备案并解析到本机公网 IP"
echo " 3. 生产证书替换 /etc/nginx/ssl/ 下同名文件后 reload: nginx -s reload"
echo " 4. 站点目录: $WEBROOT  |  访问 https://$DOMAIN/"
echo "=============================================="
