# 🚀 GitHub 部署指南

## 📋 部署前准备

### 1. 创建 GitHub 仓库
1. 在 GitHub 上创建新的仓库
2. 仓库名称建议：`notion-comment-sync`
3. 选择 Public 或 Private（根据你的需求）

### 2. 准备本地代码
确保你的代码已经完成测试，功能正常。

## 🔧 部署步骤

### 步骤 1: 初始化 Git 仓库
```bash
# 如果还没有初始化 Git
git init

# 添加远程仓库
git remote add origin https://github.com/你的用户名/notion-comment-sync.git
```

### 步骤 2: 提交代码
```bash
# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: Notion comment sync tool"

# 推送到主分支
git push -u origin main
```

### 步骤 3: 配置 GitHub Secrets
在 GitHub 仓库中设置以下 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加以下 Secrets：

| Secret 名称 | 说明 | 示例值 |
|-------------|------|--------|
| `NOTION_TOKEN` | Notion API 集成令牌 | `secret_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `REFERENCE_DATABASE_ID` | Reference 数据库 ID | `18ce666e-cf2c-81a4-b3e0-ed82669d257c` |
| `REFERENCE_DATABASE_URL` | Reference 数据库 URL | `https://notion.so/your-database-url` |
| `TARGET_DATABASE_ID` | 目标数据库 ID | `18ce666e-cf2c-817b-9808-e2386cd473a0` |
| `SLACK_WEBHOOK_URL` | Slack 通知 Webhook（可选） | `https://hooks.slack.com/...` |

### 步骤 4: 验证部署
1. 检查 GitHub Actions 是否正常运行
2. 查看 Actions 标签页中的工作流状态
3. 测试手动触发同步功能

## 🔄 GitHub Actions 配置

### 自动触发
- **定时同步**: 每6小时自动执行一次
- **推送触发**: 每次推送到主分支时执行
- **手动触发**: 可以在 Actions 页面手动执行

### 工作流文件
`.github/workflows/sync.yml` 包含完整的自动化配置。

## 📊 监控和维护

### 1. 查看运行状态
- 进入 Actions 标签页
- 查看每次运行的详细日志
- 下载日志文件进行分析

### 2. 故障排查
- 检查 Secrets 配置是否正确
- 查看 Actions 运行日志
- 确认 Notion API 权限

### 3. 性能优化
- 监控同步执行时间
- 调整同步频率（修改 cron 表达式）
- 优化错误处理逻辑

## 🚨 注意事项

### 安全考虑
- **不要**在代码中硬编码敏感信息
- **使用** GitHub Secrets 存储敏感数据
- **定期**轮换 Notion API 令牌

### 权限要求
- Notion 集成需要有足够的权限访问数据库
- GitHub Actions 需要有权限访问仓库

### 成本控制
- GitHub Actions 有免费使用额度
- 注意 Notion API 调用频率限制

## 🎯 部署后验证

### 1. 功能测试
- 手动触发同步
- 检查生成的笔记格式
- 验证数据库状态更新

### 2. 自动化测试
- 等待定时任务执行
- 检查日志输出
- 确认通知功能

### 3. 性能监控
- 记录同步执行时间
- 监控错误率
- 跟踪处理数量

## 📞 支持

如果遇到问题：
1. 查看 GitHub Actions 日志
2. 检查环境变量配置
3. 验证 Notion API 权限
4. 提交 Issue 到仓库

---

🎉 恭喜！你的 Notion 评论同步工具已经成功部署到 GitHub！
