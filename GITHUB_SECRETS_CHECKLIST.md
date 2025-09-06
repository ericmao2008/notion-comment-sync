# GitHub Secrets 检查清单

## 🔑 必需的 Secrets

请在 GitHub 仓库的 `Settings` → `Secrets and variables` → `Actions` 中确认以下 Secrets 已正确设置：

### Notion API 配置
- [ ] `NOTION_API_TOKEN` - Notion API 访问令牌
- [ ] `REFERENCE_DATABASE_ID` - Reference 数据库 ID
- [ ] `TARGET_DATABASE_ID` - 目标数据库 ID  
- [ ] `ACTION_DATABASE_ID` - 行动库数据库 ID

### QQ 邮箱配置
- [ ] `SMTP_HOST` - SMTP 服务器地址 (smtp.qq.com)
- [ ] `SMTP_PORT` - SMTP 端口 (587)
- [ ] `SMTP_USER` - QQ 邮箱地址
- [ ] `SMTP_PASS` - QQ 邮箱授权码
- [ ] `EMAIL_TO` - 接收通知的邮箱地址
- [ ] `EMAIL_FROM` - 发送通知的邮箱地址

## 🔍 检查步骤

1. **进入 GitHub 仓库**
   - 访问您的 GitHub 仓库页面

2. **导航到 Secrets 设置**
   - 点击 `Settings` 标签页
   - 在左侧菜单中找到 `Secrets and variables`
   - 点击 `Actions`

3. **验证每个 Secret**
   - 确认所有必需的 Secrets 都存在
   - 检查 Secret 名称拼写是否正确
   - 验证 Secret 值是否有效

4. **测试权限**
   - 确保您有仓库的写入权限
   - 检查是否可以访问 `Actions` 标签页

## ⚠️ 常见问题

### 问题1: 看不到 "Run workflow" 按钮
**可能原因:**
- 工作流文件不在默认分支
- 缺少 `workflow_dispatch` 配置
- 权限不足

**解决方法:**
- 确保工作流文件在 `main` 分支
- 检查 YAML 文件语法
- 确认有写入权限

### 问题2: 工作流运行失败
**可能原因:**
- Secrets 配置错误
- 代码语法错误
- 依赖安装失败

**解决方法:**
- 检查 Secrets 配置
- 查看运行日志
- 验证代码语法

### 问题3: 权限不足
**可能原因:**
- 不是仓库所有者或协作者
- 权限级别不够

**解决方法:**
- 联系仓库所有者
- 请求写入权限
- 检查组织权限设置

## 📋 手动执行步骤

1. **进入 Actions 页面**
   - 在 GitHub 仓库页面点击 `Actions` 标签页

2. **选择工作流**
   - 在左侧找到 "Daily Notion Comment Sync" 工作流
   - 点击进入

3. **手动触发**
   - 点击右侧的 "Run workflow" 按钮
   - 选择分支（通常是 `main`）
   - 选择环境（production 或 staging）
   - 点击 "Run workflow" 确认

4. **监控执行**
   - 查看运行状态
   - 检查日志输出
   - 下载日志文件（如有需要）

## 🆘 如果仍然无法手动执行

请提供以下信息：
1. 您看到的错误信息截图
2. 工作流文件内容
3. 您的权限级别
4. 是否能看到 "Run workflow" 按钮
