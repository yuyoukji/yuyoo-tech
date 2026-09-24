# -*- coding: utf-8 -*-
"""誉友科技 站点一键同步脚本

把本地项目增量同步到线上 GitHub Pages（Git Data API，无需 git push/SSH）。

用法（项目根目录或任意位置均可）：
    python deploy/sync-github.py            # 预演：只列出差异，不改动线上
    python deploy/sync-github.py --apply    # 实际推送并等待 Pages 构建完成
    python deploy/sync-github.py --apply -m "fix: 修改说明"

依赖：已安装并登录的 gh CLI（提供 token 用）。
说明：只上传有变化的文件，未变化的文件复用远端 blob，推送体积小。
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

REPO = "yuyoukji/yuyoo-tech"
BRANCH = "main"
# 脚本位于 <项目根>/deploy/ 下，自动定位项目根目录
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 不同步到线上的本地目录/文件
EXCLUDE_DIRS = {".git", "_image_backup_old", "__pycache__", "node_modules"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}


def git(*args):
    r = subprocess.run(["git"] + list(args), cwd=ROOT, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode("utf-8", "ignore"))
    return r.stdout.decode("utf-8", "ignore").strip()


def token():
    return subprocess.check_output(["gh", "auth", "token"], text=True).strip()


TOKEN = token()


def api(method, path, data=None):
    """调用 GitHub REST API；对瞬时 404/5xx 做重试。"""
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
    req = urllib.request.Request("https://api.github.com" + path, data=body, method=method)
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "yuyoo-sync")
    if body:
        req.add_header("Content-Type", "application/json; charset=utf-8")
    last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (404, 500, 502, 503) and attempt < 4:
                time.sleep(2)
                continue
            raise
    raise last


def local_files():
    out = {}
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            if f in EXCLUDE_FILES:
                continue
            full = os.path.join(base, f)
            out[os.path.relpath(full, ROOT).replace("\\", "/")] = full
    return out


def normalized_blob(rel, full):
    """用 git 计算规范化后的 blob 内容（自动处理 CRLF/属性），避免行尾差异导致 SHA 不一致。"""
    sha = git("hash-object", "-w", "--path", rel, "--", full)
    raw = subprocess.run(["git", "cat-file", "blob", sha], cwd=ROOT, capture_output=True).stdout
    return sha, raw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="实际推送（默认仅预演）")
    ap.add_argument("-m", "--message", default="chore: 同步站点更新", help="提交说明")
    args = ap.parse_args()

    parent = api("GET", f"/repos/{REPO}/git/refs/heads/{BRANCH}")["object"]["sha"]
    base_tree = api("GET", f"/repos/{REPO}/git/commits/{parent}")["tree"]["sha"]
    tree = api("GET", f"/repos/{REPO}/git/trees/{base_tree}?recursive=1")
    if tree.get("truncated"):
        sys.exit("远端 tree 被截断，需改用分页处理")
    remote = {e["path"]: e["sha"] for e in tree["tree"] if e["type"] == "blob"}

    local = local_files()
    print(f"线上文件 {len(remote)} 个 / 本地文件 {len(local)} 个")
    print(f"远端 HEAD = {parent}")

    shas, added, changed = {}, [], []
    for rel, full in sorted(local.items()):
        sha, raw = normalized_blob(rel, full)
        shas[rel] = (sha, raw)
        if rel not in remote:
            added.append(rel)
        elif remote[rel] != sha:
            changed.append(rel)
    deleted = [p for p in sorted(remote) if p not in local]

    for title, items, sign in (("新增", added, "+"), ("修改", changed, "M"), ("删除", deleted, "-")):
        print(f"--- {title} {len(items)} ---")
        for p in items:
            print(f"  {sign} {p}")

    if not (added or changed or deleted):
        print("线上与本地完全一致，无需推送。")
        return
    if not args.apply:
        print("\n[预演模式] 未改动线上。加 --apply 执行推送。")
        return

    items = []
    for rel in sorted(set(added) | set(changed)):
        sha, raw = shas[rel]
        blob = api("POST", f"/repos/{REPO}/git/blobs",
                   {"content": base64.b64encode(raw).decode("ascii"), "encoding": "base64"})
        items.append({"path": rel, "mode": "100755" if rel.endswith(".sh") else "100644",
                      "type": "blob", "sha": blob["sha"]})
        print(f"  uploaded {rel}")
    for rel in deleted:
        items.append({"path": rel, "mode": "100644", "type": "blob", "sha": None})

    new_tree = api("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": items})["sha"]
    new_commit = api("POST", f"/repos/{REPO}/git/commits",
                     {"message": args.message, "tree": new_tree, "parents": [parent]})["sha"]
    api("PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}", {"sha": new_commit, "force": True})
    print(f"已推送 -> {BRANCH} = {new_commit}")

    for i in range(30):
        time.sleep(10)
        try:
            status = api("GET", f"/repos/{REPO}/pages").get("status")
            print(f"  [{i + 1}] Pages 状态 = {status}")
            if status == "built":
                print("构建完成：built")
                break
        except Exception as e:  # noqa: BLE001
            print("  查询 Pages 状态失败：", e)
    else:
        print("等待超时，请稍后自行确认 Pages 状态。")
    print("线上地址：https://yuyoukji.github.io/yuyoo-tech/")


if __name__ == "__main__":
    main()