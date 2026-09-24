# 誉友科技 H5 站点 · Windows 端一键上传脚本
# 用法: powershell -ExecutionPolicy Bypass -File deploy-h5.ps1 -Server 1.2.3.4 [-User root] [-Domain example.com]
# 前置: 本机已安装 OpenSSH 客户端（Windows 自带 scp/ssh），且已配置到 ECS 的免密登录或会提示输入密码
param(
  [Parameter(Mandatory = $true)][string]$Server,   # ECS 公网 IP 或域名
  [string]$User = "root",                          # SSH 登录用户
  [string]$Domain = "",                            # 已备案域名（不填则跳过自动安装）
  [string]$RemoteDir = "/var/www/yuyoo-tech",
  [string]$Project = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path "$Project\index.html")) {
  Write-Host "未找到 $Project\index.html，请确认项目路径" -ForegroundColor Red
  exit 1
}

Write-Host "== 1/2 上传站点文件到 $User@$Server`:$RemoteDir ==" -ForegroundColor Cyan
# scp -r 递归上传；排除 .git / _image_backup_old / docs 可选
scp -r "$Project\index.html" "$Project\pages" "$Project\assets" "$Project\shared" "$Project\deploy" "$Project\启动.bat" "${User}@${Server}:${RemoteDir}/"
if ($LASTEXITCODE -ne 0) { Write-Host "上传失败" -ForegroundColor Red; exit 1 }

if ($Domain -ne "") {
  Write-Host "== 2/2 执行 ECS 安装脚本（域名: $Domain）==" -ForegroundColor Cyan
  ssh "${User}@${Server}" "sudo bash ${RemoteDir}/deploy/install-server.sh $Domain"
} else {
  Write-Host "已上传完成（未指定 -Domain，跳过自动安装）。" -ForegroundColor Yellow
  Write-Host "  可手动执行: sudo bash ${RemoteDir}/deploy/install-server.sh 你的域名"
}

Write-Host "完成。访问 https://$Domain/ 验证站点。" -ForegroundColor Green
