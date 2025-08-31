import { log } from './utils.js';
import nodemailer from 'nodemailer';

/**
 * 邮件通知服务
 */
export class EmailNotifier {
  constructor() {
    this.isConfigured = this.checkConfiguration();
    this.transporter = null;
    
    if (this.isConfigured) {
      this.initializeTransporter();
    }
  }

  /**
   * 检查邮件配置
   */
  checkConfiguration() {
    // 检查环境变量中的邮件配置
    const requiredVars = ['SMTP_USER', 'SMTP_PASS', 'EMAIL_TO'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      log('warn', `Missing email configuration: ${missingVars.join(', ')}`);
      return false;
    }
    
    return true;
  }

  /**
   * 初始化邮件传输器
   */
  initializeTransporter() {
    try {
      // QQ邮箱配置 - 使用与"P-每日一文"项目相同的配置
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.qq.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER, // QQ邮箱地址
          pass: process.env.SMTP_PASS  // QQ邮箱授权码
        }
      });
      
      log('info', 'QQ邮箱传输器初始化成功');
    } catch (error) {
      log('error', '初始化QQ邮箱传输器失败', error);
      this.transporter = null;
    }
  }

  /**
   * 发送未完成任务警告邮件
   * @param {Array} pendingCards - 待处理的卡片列表
   * @param {Object} unfinishedTask - 未完成的任务信息
   * @returns {Promise<boolean>} 发送结果
   */
  async sendUnfinishedTaskWarning(pendingCards, unfinishedTask) {
    if (!this.isConfigured || !this.transporter) {
      log('warn', 'Email service not configured or transporter not initialized, skipping warning email');
      return false;
    }

    try {
      const emailContent = this.generateWarningEmailContent(pendingCards, unfinishedTask);
      
      log('info', 'Sending unfinished task warning email via QQ邮箱...');
      
      // 发送邮件
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.EMAIL_TO,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.body
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      log('info', 'Warning email sent successfully via QQ邮箱', {
        messageId: info.messageId,
        subject: emailContent.subject,
        cardCount: pendingCards.length,
        unfinishedTask: unfinishedTask.title
      });
      
      return true;
    } catch (error) {
      log('error', 'Failed to send warning email via QQ邮箱', error);
      return false;
    }
  }

  /**
   * 发送卡片处理提醒邮件
   * @param {Array} pendingCards - 待处理的卡片列表
   * @param {string} actionTaskLink - 行动库任务链接
   * @returns {Promise<boolean>} 发送结果
   */
  async sendCardProcessingReminder(pendingCards, actionTaskLink) {
    if (!this.isConfigured || !this.transporter) {
      log('warn', 'Email service not configured or transporter not initialized, skipping email notification');
      return false;
    }

    try {
      const emailContent = this.generateEmailContent(pendingCards, actionTaskLink);
      
      log('info', 'Sending card processing reminder email via QQ邮箱...');
      
      // 发送邮件
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.EMAIL_TO,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.body
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      log('info', 'Email sent successfully via QQ邮箱', {
        messageId: info.messageId,
        subject: emailContent.subject,
        cardCount: pendingCards.length,
        actionTaskLink: actionTaskLink
      });
      
      return true;
    } catch (error) {
      log('error', 'Failed to send email notification via QQ邮箱', error);
      return false;
    }
  }

  /**
   * 发送Reference处理提醒邮件
   * @param {Array} unexecutedNotes - 未执行的笔记列表
   * @param {string} actionTaskLink - 行动库任务链接
   * @returns {Promise<boolean>} 发送结果
   */
  async sendReferenceProcessingReminder(unexecutedNotes, actionTaskLink) {
    if (!this.isConfigured || !this.transporter) {
      log('warn', 'Email service not configured or transporter not initialized, skipping email notification');
      return false;
    }

    try {
      const emailContent = this.generateReferenceEmailContent(unexecutedNotes, actionTaskLink);
      
      log('info', 'Sending reference processing reminder email via QQ邮箱...');
      
      // 发送邮件
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.EMAIL_TO,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.body
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      log('info', 'Reference processing email sent successfully via QQ邮箱', {
        messageId: info.messageId,
        subject: emailContent.subject,
        noteCount: unexecutedNotes.length,
        actionTaskLink: actionTaskLink
      });
      
      return true;
    } catch (error) {
      log('error', 'Failed to send reference processing email via QQ邮箱', error);
      return false;
    }
  }

  /**
   * 发送未完成Reference任务警告邮件
   * @param {Array} unexecutedNotes - 未执行的笔记列表
   * @param {Object} unfinishedTask - 未完成的任务信息
   * @returns {Promise<boolean>} 发送结果
   */
  async sendUnfinishedReferenceTaskWarning(unexecutedNotes, unfinishedTask) {
    if (!this.isConfigured || !this.transporter) {
      log('warn', 'Email service not configured or transporter not initialized, skipping warning email');
      return false;
    }

    try {
      const emailContent = this.generateReferenceWarningEmailContent(unexecutedNotes, unfinishedTask);
      
      log('info', 'Sending unfinished reference task warning email via QQ邮箱...');
      
      // 发送邮件
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.EMAIL_TO,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.body
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      log('info', 'Reference warning email sent successfully via QQ邮箱', {
        messageId: info.messageId,
        subject: emailContent.subject,
        noteCount: unexecutedNotes.length,
        unfinishedTask: unfinishedTask.title
      });
      
      return true;
    } catch (error) {
      log('error', 'Failed to send reference warning email via QQ邮箱', error);
      return false;
    }
  }

  /**
   * 生成Reference邮件内容
   * @param {Array} unexecutedNotes - 未执行的笔记列表
   * @param {string} actionTaskLink - 行动库任务链接
   * @returns {Object} 邮件内容
   */
  generateReferenceEmailContent(unexecutedNotes, actionTaskLink) {
    const currentTime = new Date();
    const timeString = currentTime.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
    
    const subject = `Reference处理需求-${timeString}`;
    
    const body = `
# Reference处理需求提醒

## 📋 概述
系统检测到 ${unexecutedNotes.length} 个Reference笔记需要处理。

## 🔗 行动任务
请在行动库中查看任务：[Reference处理需求-${timeString}](${actionTaskLink})

## 📝 待处理笔记列表
${unexecutedNotes.map((note, index) => `
### ${index + 1}. ${note.title}
- **创建时间**: ${note.createdTime}
- **笔记链接**: ${note.url}
`).join('\n')}

## ⚠️ 处理要求
这些笔记的"自动化"字段状态为"未执行"，需要：
1. 阅读Reference笔记内容
2. 处理笔记中的评论
3. 将"自动化"字段更新为"已执行"
4. 完成所有处理后，将任务状态改为"完成"

## 📅 生成时间
${currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

---
*此邮件由Notion评论同步系统自动生成*
    `.trim();

    return {
      subject,
      body,
      html: this.convertToHtml(body)
    };
  }

  /**
   * 生成Reference警告邮件内容
   * @param {Array} unexecutedNotes - 未执行的笔记列表
   * @param {Object} unfinishedTask - 未完成的任务信息
   * @returns {Object} 邮件内容
   */
  generateReferenceWarningEmailContent(unexecutedNotes, unfinishedTask) {
    const currentTime = new Date();
    const timeString = currentTime.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
    
    const subject = `⚠️ Reference处理任务未完成警告-${timeString}`;
    
    const body = `
# ⚠️ Reference处理任务未完成警告

## 🚨 重要提醒
系统检测到有未完成的Reference处理任务，**不会创建新的任务**，请先完成现有任务。

## 📋 未完成任务信息
- **任务标题**: ${unfinishedTask.title}
- **当前状态**: ${unfinishedTask.status}
- **创建时间**: ${unfinishedTask.createdTime}
- **任务链接**: [点击查看任务](${unfinishedTask.url})

## 📊 待处理笔记统计
目前仍有 **${unexecutedNotes.length}** 个Reference笔记需要处理，但必须先完成现有任务。

## 🔄 工作流程
1. **完成现有任务**: 处理完所有Reference笔记
2. **更新任务状态**: 将任务状态改为"完成"
3. **系统自动检测**: 下次运行时会自动创建新任务

## 📝 待处理笔记列表
${unexecutedNotes.slice(0, 5).map((note, index) => `
### ${index + 1}. ${note.title}
- **创建时间**: ${note.createdTime}
- **笔记链接**: ${note.url}
`).join('\n')}

${unexecutedNotes.length > 5 ? `\n... 还有 ${unexecutedNotes.length - 5} 个笔记需要处理` : ''}

## ⚠️ 处理要求
这些笔记的"自动化"字段状态为"未执行"，需要：
1. 阅读Reference笔记内容
2. 处理笔记中的评论
3. 将"自动化"字段更新为"已执行"
4. 完成所有处理后，将任务状态改为"完成"

## 📅 警告时间
${currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

---
*此邮件由Notion评论同步系统自动生成*
    `.trim();

    return {
      subject,
      body,
      html: this.convertToHtml(body)
    };
  }

  /**
   * 生成警告邮件内容
   * @param {Array} pendingCards - 待处理的卡片列表
   * @param {Object} unfinishedTask - 未完成的任务信息
   * @returns {Object} 邮件内容
   */
  generateWarningEmailContent(pendingCards, unfinishedTask) {
    const currentTime = new Date();
    const timeString = currentTime.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
    
    const subject = `⚠️ 卡片处理任务未完成警告-${timeString}`;
    
    const body = `
# ⚠️ 卡片处理任务未完成警告

## 🚨 重要提醒
系统检测到有未完成的卡片处理任务，**不会创建新的任务**，请先完成现有任务。

## 📋 未完成任务信息
- **任务标题**: ${unfinishedTask.title}
- **当前状态**: ${unfinishedTask.status}
- **创建时间**: ${unfinishedTask.createdTime}
- **任务链接**: [点击查看任务](${unfinishedTask.url})

## 📊 待处理卡片统计
目前仍有 **${pendingCards.length}** 个卡片需要处理，但必须先完成现有任务。

## 🔄 工作流程
1. **完成现有任务**: 处理完所有待处理卡片
2. **更新任务状态**: 将任务状态改为"完成"
3. **系统自动检测**: 下次运行时会自动创建新任务

## 📝 待处理卡片列表
${pendingCards.slice(0, 5).map((card, index) => `
### ${index + 1}. ${card.title}
- **讨论ID**: ${card.discussionId}
- **来源笔记**: ${card.sourceNoteId}
- **卡片链接**: ${card.pageUrl || '待生成'}
`).join('\n')}

${pendingCards.length > 5 ? `\n... 还有 ${pendingCards.length - 5} 个卡片需要处理` : ''}

## ⚠️ 处理要求
这些卡片目前缺少"它在解决什么问题？"字段的值，需要：
1. 阅读对应的Reference库文件
2. 理解卡片内容
3. 填写"它在解决什么问题？"字段
4. 建立卡片与具体问题的联系

## 📅 警告时间
${currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

---
*此邮件由Notion评论同步系统自动生成*
    `.trim();

    return {
      subject,
      body,
      html: this.convertToHtml(body)
    };
  }

  /**
   * 生成邮件内容
   * @param {Array} pendingCards - 待处理的卡片列表
   * @param {string} actionTaskLink - 行动库任务链接
   * @returns {Object} 邮件内容
   */
  generateEmailContent(pendingCards, actionTaskLink) {
    const currentTime = new Date();
    const timeString = currentTime.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
    
    const subject = `卡片处理需求-${timeString}`;
    
    const body = `
# 卡片处理需求提醒

## 📋 概述
系统检测到 ${pendingCards.length} 个新生成的知识卡片需要人工处理。

## 🔗 行动任务
请在行动库中查看任务：[卡片处理需求-${timeString}](${actionTaskLink})

## 📝 待处理卡片列表
${pendingCards.map((card, index) => `
### ${index + 1}. ${card.title}
- **讨论ID**: ${card.discussionId}
- **来源笔记**: ${card.sourceNoteId}
- **卡片链接**: ${card.pageUrl || '待生成'}
`).join('\n')}

## ⚠️ 处理要求
这些卡片目前缺少"它在解决什么问题？"字段的值，需要：
1. 阅读对应的Reference库文件
2. 理解卡片内容
3. 填写"它在解决什么问题？"字段
4. 建立卡片与具体问题的联系

## 📅 生成时间
${currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

---
*此邮件由Notion评论同步系统自动生成*
    `.trim();

    return {
      subject,
      body,
      html: this.convertToHtml(body)
    };
  }

  /**
   * 将Markdown转换为HTML
   * @param {string} markdown - Markdown文本
   * @returns {string} HTML文本
   */
  convertToHtml(markdown) {
    // 简单的Markdown到HTML转换
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br>');
  }
}
