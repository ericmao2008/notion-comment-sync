# GitHub Actions 设置说明

## 🚀 自动同步设置

本项目已配置GitHub Actions，将在**每日凌晨3点（Brisbane时间）**自动运行Notion评论同步。

## ⚙️ 需要设置的GitHub Secrets

在GitHub仓库的 `Settings` → `Secrets and variables` → `Actions` 中添加以下secrets：

### 🔑 Notion API配置
- `NOTION_API_TOKEN`: Notion API访问令牌
- `REFERENCE_DATABASE_ID`: Reference数据库ID
- `TARGET_DATABASE_ID`: 目标数据库ID  
- `ACTION_DATABASE_ID`: 行动库数据库ID

### 📧 QQ邮箱配置
- `SMTP_HOST`: SMTP服务器地址 (smtp.qq.com)
- `SMTP_PORT`: SMTP端口 (587)
- `SMTP_USER`: QQ邮箱地址
- `SMTP_PASS`: QQ邮箱授权码
- `EMAIL_TO`: 接收通知的邮箱地址
- `EMAIL_FROM`: 发送通知的邮箱地址

## 🕐 时间设置说明

- **Brisbane时间**: 每日凌晨3:00 AM
- **UTC时间**: 每日下午5:00 PM (前一天)
- **Cron表达式**: `0 17 * * *`

## 📁 工作流文件位置

- **文件路径**: `.github/workflows/daily-sync.yml`
- **触发方式**: 
  - 自动: 每日定时触发
  - 手动: 可在Actions页面手动触发

## 🔍 查看运行状态

1. 进入GitHub仓库
2. 点击 `Actions` 标签页
3. 查看 `Daily Notion Comment Sync` 工作流
4. 查看运行日志和结果

## 📊 日志和结果

- 每次运行都会上传日志文件
- 日志保留7天
- 可在Actions页面下载日志文件

## ⚠️ 注意事项

1. **首次运行**: 确保所有secrets已正确设置
2. **权限检查**: 确保Notion API令牌有足够权限
3. **网络环境**: GitHub Actions运行在云端，确保能访问Notion API
4. **错误处理**: 如果运行失败，检查日志文件排查问题

## 🆘 故障排除

### 常见问题
1. **Secrets未设置**: 检查所有必需的secrets是否已添加
2. **API权限不足**: 确认Notion API令牌权限
3. **网络超时**: 检查Notion API连接状态
4. **依赖安装失败**: 检查package.json和package-lock.json

### 手动测试
可以在本地运行 `node src/main.js` 测试脚本是否正常工作。
