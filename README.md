# Notion 评论同步工具

自动提取 Notion 评论并生成结构化笔记的自动化工具。

## ✨ 功能特性

- **智能评论识别**: 自动识别 A:, Q:, →: 等前缀的评论
- **块级评论支持**: 获取页面正文中任意块的评论
- **结构化格式**: 生成清晰的卡片笔记格式
- **自动化同步**: 一键同步所有待处理笔记
- **智能去重**: 基于 DiscussionID 避免重复
- **状态管理**: 自动更新笔记处理状态

## 🏗️ 系统架构

```
src/
├── main.js              # 主程序入口
├── notion-client.js     # Notion API 客户端
├── comment-fetcher.js   # 评论抓取和分组
├── content-processor.js # 内容处理和格式生成
├── database-writer.js   # 数据库写入操作
└── utils.js            # 工具函数
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

# Reference 数据库配置
REFERENCE_DATABASE_ID=your_reference_database_id_here
REFERENCE_DATABASE_URL=https://notion.so/your_reference_database_url_here

# 目标数据库配置
TARGET_DATABASE_ID=your_target_database_id_here

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

项目包含 GitHub Actions 工作流，可以设置定时同步：

```yaml
# .github/workflows/sync.yml
name: Auto Sync
on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小时执行一次
  workflow_dispatch:        # 手动触发
```

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
