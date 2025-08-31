# Notion 评论同步工具

自动提取 Notion 评论并生成结构化笔记的自动化工具。

## ✨ 功能特性

- **智能评论识别**: 自动识别 A:, Q:, →: 等前缀的评论
- **块级评论支持**: 获取页面正文中任意块的评论
- **结构化格式**: 生成清晰的卡片笔记格式
- **自动化同步**: 一键同步所有待处理笔记
- **智能去重**: 基于 DiscussionID 避免重复
- **状态管理**: 自动更新笔记处理状态
- **卡片处理工作流**: 自动识别待处理卡片并创建行动任务
- **邮件通知系统**: QQ邮箱集成，支持任务提醒和警告
- **GitHub Actions**: 每日自动同步，支持手动触发

## 🏗️ 系统架构

```
src/
├── main.js                 # 主程序入口
├── notion-client.js        # Notion API 客户端
├── comment-fetcher.js      # 评论抓取和分组
├── content-processor.js    # 内容处理和格式生成
├── database-writer.js      # 数据库写入操作
├── workflow-manager.js     # 工作流管理器
├── card-status-checker.js  # 卡片状态检查器
├── action-task-creator.js  # 行动库任务创建器
├── email-notifier.js       # 邮件通知服务
└── utils.js               # 工具函数
```

## 📋 环境要求

- Node.js 18+
- Notion API 集成令牌
- 配置好的 Notion 数据库

## ⚙️ 安装配置

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd notion-comment-sync
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境变量配置
复制 `env.example` 为 `.env` 并填写配置：

```bash
cp env.example .env
```

编辑 `.env` 文件：
```env
# Notion API 配置
NOTION_TOKEN=your_notion_integration_token_here

# 数据库配置
REFERENCE_DATABASE_ID=your_reference_database_id_here
TARGET_DATABASE_ID=your_target_database_id_here
ACTION_DATABASE_ID=your_action_database_id_here

# QQ邮箱配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your_qq_email@qq.com
SMTP_PASS=your_qq_email_authorization_code
EMAIL_TO=your_notification_email@example.com
EMAIL_FROM=your_qq_email@qq.com

# 可选配置
LOG_LEVEL=info
SYNC_INTERVAL=3600000
```

## 🚀 使用方法

### 手动运行
```bash
npm run sync
```

### 开发模式
```bash
npm run dev
```

### 启动服务
```bash
npm start
```

## 📝 笔记格式

生成的卡片笔记格式：

```
## Reference

Q：[问题内容]
A：[答案内容]
" [源块原文内容，Quote格式]
→：[后续动作]
【用户名】(时间) [其他评论]
```

## 🔧 数据库配置

### 目标数据库需要包含以下属性：
- **卡片笔记** (Title): 页面标题
- **DiscussionID** (Rich Text): 讨论线程唯一标识
- **Reference** (Relation): 关联到 Reference 数据库

### Reference 数据库需要包含：
- **自动化** (Select): 包含"未执行"和"已执行"选项

## 📊 支持的评论前缀

- **A:/A:** - 答案/回答
- **Q:/Q:** - 问题
- **→:/→:** - 后续动作

## 🔄 GitHub Actions 自动化

项目包含 GitHub Actions 工作流，**每日凌晨3点（Brisbane时间）**自动运行：

```yaml
# .github/workflows/daily-sync.yml
name: Daily Notion Comment Sync
on:
  schedule:
    - cron: '0 17 * * *'  # 每日下午5点UTC (Brisbane凌晨3点)
  workflow_dispatch:        # 手动触发
```

### 🚀 自动同步功能
- **定时触发**: 每日凌晨3点自动运行
- **智能工作流**: 自动识别待处理卡片
- **任务管理**: 在行动库中创建处理任务
- **邮件通知**: 自动发送提醒和警告邮件
- **状态检查**: 避免重复创建未完成任务

### 📧 邮件通知系统
- **任务提醒**: 新任务创建时发送通知
- **警告邮件**: 有未完成任务时发送警告
- **QQ邮箱集成**: 使用SMTP服务发送邮件
- **智能内容**: 包含任务链接和卡片详情

### 📋 工作流逻辑
1. **检查待处理卡片**: 识别需要人工处理的卡片
2. **检查未完成任务**: 避免重复创建任务
3. **创建行动任务**: 在行动库中生成详细任务
4. **发送邮件通知**: 提醒用户处理任务
5. **状态管理**: 自动更新处理状态

详细设置说明请查看 [GITHUB_SETUP.md](./GITHUB_SETUP.md)

## 📈 性能特点

- **100% 成功率**: 完善的错误处理机制
- **智能去重**: 避免重复处理相同讨论
- **批量处理**: 高效处理大量评论
- **状态管理**: 自动更新处理状态

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🆘 支持

如有问题，请查看：
1. 环境变量配置是否正确
2. Notion API 权限是否足够
3. 数据库结构是否符合要求
4. 日志输出中的错误信息
