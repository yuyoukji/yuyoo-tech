#!/usr/bin/env bash
# 誉友科技 H5 站点 · ECS 本地包安装脚本（完全不需要访问 GitHub，适合国内 ECS）
# 使用前提：先通过阿里云 Workbench 的「上传文件」把站点包上传到服务器 /root/ 下
# 执行： bash install-local.sh /root/site.zip [你的已备案域名]
set -u

ZIP="${1:-/root/site.zip}"
DOMAIN="${2:-}"
WEBROOT=/var/www/yuyoo-tech

echo "===== 誉友科技 H5 站点部署开始 ====="
echo "[环境] $(cat /etc/os-release 2>/dev/null | grep -m1 PRETTY_NAME) / $(uname -m)"

# 1) 安装依赖
echo "[1/5] 安装 nginx 与 unzip"
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq || echo "  (apt update 有告警，继续)"
  apt-get install -y nginx unzip || echo "  !! 安装失败，请检查网络源"
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y nginx unzip || echo "  !! 安装失败"
elif command -v yum >/dev/null 2>&1; then
  yum install -y nginx unzip || echo "  !! 安装失败"
else
  echo "  !! 未识别的包管理器"; exit 1
fi

# 2) 解压站点
echo "[2/5] 解压站点包: $ZIP"
if [ ! -f "$ZIP" ]; then
  echo "  !! 未找到 $ZIP ——请先在 Workbench 窗口点击「上传文件」把站点包传上来"; exit 1
fi
rm -rf "$WEBROOT"; mkdir -p "$WEBROOT"
unzip -oq "$ZIP" -d "$WEBROOT" || { echo "  !! 解压失败"; exit 1; }
if [ ! -f "$WEBROOT/index.html" ]; then
  inner=$(find "$WEBROOT" -maxdepth 3 -name index.html 2>/dev/null | head -1)
  [ -n "$inner" ] && WEBROOT=$(dirname "$inner") && echo "  已自动定位站点根目录: $WEBROOT"
fi
echo "  站点文件: $(ls -1 "$WEBROOT" | tr '\n' ' ')"

# 3) 清理可能冲突的默认配置
echo "[3/5] 清理冲突的默认站点配置"
rm -f /etc/nginx/conf.d/default.conf /etc/nginx/sites-enabled/default 2>/dev/null
rm -f /etc/nginx/conf.d/yuyoo-tech.conf 2>/dev/null

# 4) 写入站点配置（不使用 default_server / http2，避免版本兼容报错）
echo "[4/5] 写入站点配置"
if [ -n "$DOMAIN" ]; then
  mkdir -p /etc/nginx/ssl
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "/etc/nginx/ssl/$DOMAIN.key" -out "/etc/nginx/ssl/$DOMAIN.pem" -subj "/CN=$DOMAIN" 2>/dev/null
  cat > /etc/nginx/conf.d/yuyoo-tech.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name $DOMAIN;
    ssl_certificate     /etc/nginx/ssl/$DOMAIN.pem;
    ssl_certificate_key /etc/nginx/ssl/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    root $WEBROOT;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    server_tokens off;
    location / { try_files \$uri \$uri/ =404; }
}
EOF
else
  cat > /etc/nginx/conf.d/yuyoo-tech.conf <<EOF
server {
    listen 80;
    server_name _;
    root $WEBROOT;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    server_tokens off;
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1k;
    location / { try_files \$uri \$uri/ =404; }
}
EOF
fi

# 5) 校验并启动
echo "[5/5] 校验并启动 nginx"
if ! nginx -t; then
  echo "  !! nginx 配置校验失败，最近错误日志："
  tail -n 20 /var/log/nginx/error.log 2>/dev/null
  exit 1
fi
systemctl enable nginx >/dev/null 2>&1
systemctl restart nginx 2>/dev/null || nginx -s reload

PUBIP=$(curl -s --max-time 3 http://100.100.100.200/latest/meta-data/eipv4)
if [ -z "$PUBIP" ]; then PUBIP=$(curl -s --max-time 3 ifconfig.me); fi

echo ""
echo "===== 部署完成 ====="
echo " 站点目录 : $WEBROOT"
echo " 本地自检 : HTTP $(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1/)"
echo " 公网访问 : http://${PUBIP}/    （需在控制台安全组入方向放行 80 端口）"
echo " 更新发布 : 重新上传站点包解压覆盖，然后执行 systemctl reload nginx"