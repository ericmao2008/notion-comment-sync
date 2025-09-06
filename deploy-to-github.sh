#!/bin/bash

# GitHub 部署脚本
# 用于将工作流文件推送到 GitHub 仓库

echo "🚀 开始部署到 GitHub..."

# 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    echo "请先运行: git init"
    exit 1
fi

# 检查是否有远程仓库
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ 错误: 没有配置远程仓库"
    echo "请先运行: git remote add origin <your-github-repo-url>"
    exit 1
fi

# 添加所有文件
echo "📁 添加文件到 Git..."
git add .

# 提交更改
echo "💾 提交更改..."
git commit -m "Add GitHub Actions workflow and configuration files

- Add daily-sync.yml workflow with workflow_dispatch support
- Add GitHub secrets checklist
- Configure manual and scheduled triggers"

# 推送到 GitHub
echo "⬆️ 推送到 GitHub..."
git push origin main

echo "✅ 部署完成！"
echo ""
echo "🔍 下一步检查清单："
echo "1. 进入 GitHub 仓库页面"
echo "2. 点击 'Actions' 标签页"
echo "3. 查看 'Daily Notion Comment Sync' 工作流"
echo "4. 确认可以看到 'Run workflow' 按钮"
echo "5. 检查 GitHub Secrets 是否已正确设置"
echo ""
echo "📋 如果仍然无法手动执行，请检查："
echo "- 工作流文件是否在默认分支（main）"
echo "- 是否有写入权限"
echo "- GitHub Secrets 是否已配置"
