#!/usr/bin/env bash
# 誉友科技 H5 站点 · Workbench 一键部署脚本
# 用法：在阿里云控制台 → 实例 → 远程连接 → Workbench 终端中，粘贴本脚本全部内容并回车执行
# 可选参数：域名（已备案且已解析到本机时填写），例如：
#   bash <(cat) yuyookj.com        （先粘贴脚本，末尾带域名参数）
#   或直接执行本脚本（无域名 → 使用 HTTP 模式，用 http://公网IP 访问）
set -euo pipefail

DOMAIN="${1:-}"
WEBROOT=/var/www/yuyoo-tech

echo "== 1/4 安装依赖 (nginx / git / openssl) =="
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y nginx git openssl
elif command -v yum >/dev/null 2>&1; then
  yum install -y nginx git openssl
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y nginx git openssl
else
  echo "无法识别包管理器，请手动安装 nginx/git/openssl 后重试"; exit 1
fi

echo "== 2/4 拉取站点源码到 $WEBROOT =="
rm -rf "$WEBROOT"
mkdir -p "$WEBROOT"
if git clone --depth 1 https://github.com/yuyoukji/yuyoo-tech.git "$WEBROOT" 2>/dev/null; then
  echo "已通过 git 拉取 GitHub 仓库最新版本"
else
  echo "git 拉取失败，回退为 GitHub Pages 镜像下载..."
  wget -q -r -np -k -nH -L -p -e robots=off -P "$WEBROOT" https://yuyoukji.github.io/yuyoo-tech/ || { echo "下载失败，请检查 ECS 外网连通性"; exit 1; }
fi

echo "== 3/4 写入站点配置 =="
if [ -n "$DOMAIN" ] && [ -f "$WEBROOT/deploy/nginx-site.conf" ]; then
  # 有域名 → HTTPS 模式（自签占位证书，生产请替换为正式证书）
  mkdir -p /etc/nginx/ssl
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "/etc/nginx/ssl/$DOMAIN.key" -out "/etc/nginx/ssl/$DOMAIN.pem" \
    -subj "/CN=$DOMAIN" 2>/dev/null || true
  sed "s/<DOMAIN>/$DOMAIN/g" "$WEBROOT/deploy/nginx-site.conf" > /etc/nginx/conf.d/yuyoo-tech.conf
else
  # 无域名 → HTTP 模式，直接用公网 IP 访问
  cat > /etc/nginx/conf.d/yuyoo-tech.conf <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/yuyoo-tech;
    index index.html;
    location / { try_files $uri $uri/ =404; }
    add_header X-Content-Type-Options nosniff always;
    server_tokens off;
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1k;
}
EOF
fi

echo "== 4/4 校验并启动 nginx =="
nginx -t
systemctl enable nginx 2>/dev/null || true
systemctl restart nginx 2>/dev/null || service nginx restart

echo "=============================================="
echo " 部署完成！"
echo " 站点目录: $WEBROOT"
if [ -n "$DOMAIN" ]; then
  echo " HTTPS 访问: https://$DOMAIN/  （请先在控制台安全组放行 80/443）"
else
  echo " HTTP 访问:  http://<本机公网IP>/   （请先在控制台安全组放行 80）"
fi
echo " 更新发布: 再次执行本脚本即可拉取最新版本"
echo "=============================================="
