# QQ邮箱配置说明

## 🎯 概述

本项目已集成QQ邮箱服务，用于发送卡片处理提醒邮件。

## ⚙️ 配置步骤

### 1. 获取QQ邮箱授权码

1. 登录QQ邮箱网页版
2. 点击"设置" → "账户"
3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
4. 开启"POP3/SMTP服务"
5. 按照提示操作，获取授权码（不是QQ密码）

### 2. 配置环境变量

在 `.env` 文件中添加以下配置：

```bash
# 邮件服务配置 (QQ邮箱)
EMAIL_USER=your_qq_email@qq.com
EMAIL_PASS=your_qq_email_authorization_code
EMAIL_TO=your_email@qq.com
```

**参数说明**:
- `EMAIL_USER`: 你的QQ邮箱地址
- `EMAIL_PASS`: QQ邮箱授权码（不是QQ密码）
- `EMAIL_TO`: 接收提醒邮件的邮箱地址（可以是同一个QQ邮箱）

### 3. 配置示例

```bash
# 邮件服务配置 (QQ邮箱)
EMAIL_USER=123456789@qq.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_TO=123456789@qq.com
```

## 🔧 技术配置

### SMTP服务器信息
- **服务器**: smtp.qq.com
- **端口**: 587
- **加密**: STARTTLS
- **认证**: 用户名 + 授权码

### 安全说明
- 使用授权码而不是QQ密码
- 支持STARTTLS加密
- 符合QQ邮箱安全要求

## 🧪 测试配置

### 1. 检查配置
```bash
node test-workflow.js
```

### 2. 测试邮件发送
```bash
# 工作流会自动测试邮件发送
node src/main.js
```

## 🚨 常见问题

### 1. 授权码错误
- **错误**: `Invalid login`
- **解决**: 检查授权码是否正确，重新获取授权码

### 2. 连接超时
- **错误**: `Connection timeout`
- **解决**: 检查网络连接，确认防火墙设置

### 3. 认证失败
- **错误**: `Authentication failed`
- **解决**: 确认已开启SMTP服务，授权码有效

### 4. 邮件发送失败
- **错误**: `Message failed to send`
- **解决**: 检查邮箱地址格式，确认接收邮箱有效

## 📧 邮件格式

### 邮件主题
`卡片处理需求-YYYYMMDDHHMM`

### 邮件内容
- 📋 概述：待处理卡片数量
- 🔗 行动任务：行动库任务链接
- 📝 待处理卡片列表：每个卡片的详细信息
- ⚠️ 处理要求：具体的操作步骤
- 📅 生成时间：邮件生成时间

## 🔒 安全建议

1. **保护授权码**: 不要将授权码提交到代码仓库
2. **定期更新**: 定期更新QQ邮箱授权码
3. **限制权限**: 使用专门的邮箱账户用于系统通知
4. **监控日志**: 定期检查邮件发送日志

## 📞 技术支持

如果遇到配置问题：
1. 检查QQ邮箱SMTP服务是否开启
2. 确认授权码是否正确
3. 查看系统日志获取详细错误信息
4. 参考QQ邮箱官方帮助文档
