import { log } from './utils.js';
import { CardStatusChecker } from './card-status-checker.js';
import { ActionTaskCreator } from './action-task-creator.js';
import { EmailNotifier } from './email-notifier.js';

/**
 * 工作流管理器
 */
export class WorkflowManager {
  constructor(notionClient) {
    this.notionClient = notionClient;
    this.cardStatusChecker = new CardStatusChecker(notionClient);
    this.actionTaskCreator = new ActionTaskCreator(notionClient);
    this.emailNotifier = new EmailNotifier();
  }

  /**
   * 执行Reference处理工作流
   * @returns {Promise<Object>} 工作流执行结果
   */
  async executeReferenceProcessingWorkflow() {
    const startTime = Date.now();
    log('info', '🚀 Starting reference processing workflow...');
    
    try {
      // 步骤1: 检查Reference数据库中"自动化"字段为"未执行"的笔记
      log('info', '📋 Step 1: Checking for unexecuted notes in Reference database...');
      const unexecutedNotes = await this.notionClient.findUnexecutedReferenceNotes();
      
      if (!unexecutedNotes || unexecutedNotes.length === 0) {
        log('info', '✅ No unexecuted notes found in Reference database. Workflow completed.');
        return {
          success: true,
          unexecutedNotes: 0,
          actionTaskCreated: false,
          emailSent: false,
          duration: Date.now() - startTime,
          message: 'No unexecuted notes found in Reference database.'
        };
      }
      
      log('info', `📝 Found ${unexecutedNotes.length} unexecuted notes in Reference database`);
      
      // 步骤1.5: 检查是否有未完成的Reference处理任务
      log('info', '🔍 Step 1.5: Checking for unfinished reference processing tasks...');
      const unfinishedTask = await this.actionTaskCreator.findUnfinishedReferenceProcessingTask();
      
      if (unfinishedTask) {
        log('info', `⚠️ Found unfinished reference processing task: ${unfinishedTask.title} (${unfinishedTask.status})`);
        
        // 发送警告邮件而不是创建新任务
        log('info', '📧 Step 2: Sending warning email for unfinished reference task...');
        const emailResult = await this.emailNotifier.sendUnfinishedReferenceTaskWarning(
          unexecutedNotes, 
          unfinishedTask
        );
        
        const result = {
          success: true,
          unexecutedNotes: unexecutedNotes.length,
          actionTaskCreated: false,
          emailSent: emailResult,
          duration: Date.now() - startTime,
          unfinishedTask: unfinishedTask,
          message: `Reference workflow completed with warning. ${unexecutedNotes.length} notes need processing, but unfinished task exists: ${unfinishedTask.title}`
        };
        
        log('info', '⚠️ Reference workflow completed with warning - unfinished task exists', result);
        return result;
      }
      
      // 步骤2: 创建Reference处理任务（仅在没有未完成任务时）
      log('info', '📝 Step 2: Creating reference processing task in action database...');
      const taskResult = await this.actionTaskCreator.createReferenceProcessingTask(unexecutedNotes);
      
      if (!taskResult.success) {
        log('error', 'Failed to create reference processing task', taskResult.error);
        return {
          success: false,
          unexecutedNotes: unexecutedNotes.length,
          actionTaskCreated: false,
          emailSent: false,
          duration: Date.now() - startTime,
          error: taskResult.error
        };
      }
      
      // 步骤3: 发送邮件通知
      log('info', '📧 Step 3: Sending email notification...');
      const emailResult = await this.emailNotifier.sendReferenceProcessingReminder(
        unexecutedNotes, 
        taskResult.url
      );
      
      const result = {
        success: true,
        unexecutedNotes: unexecutedNotes.length,
        actionTaskCreated: true,
        emailSent: emailResult,
        duration: Date.now() - startTime,
        actionTask: {
          title: taskResult.title,
          url: taskResult.url,
          pageId: taskResult.pageId
        },
        message: `Reference workflow completed successfully. ${unexecutedNotes.length} notes need processing.`
      };
      
      log('info', '🎉 Reference workflow completed successfully!', result);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log('error', '❌ Reference workflow failed', error);
      return {
        success: false,
        unexecutedNotes: 0,
        actionTaskCreated: false,
        emailSent: false,
        duration: duration,
        error: error.message
      };
    }
  }

  /**
   * 执行卡片处理工作流
   * @returns {Promise<Object>} 工作流执行结果
   */
  async executeCardProcessingWorkflow() {
    const startTime = Date.now();
    
    try {
      log('info', '🚀 Starting card processing workflow...');

      // 步骤1: 检查需要人工处理的卡片
      log('info', '📋 Step 1: Checking for cards that need manual processing...');
      const pendingCards = await this.cardStatusChecker.findPendingCards();

      if (pendingCards.length === 0) {
        log('info', '✨ No pending cards found. Workflow completed!');
        return {
          success: true,
          pendingCards: 0,
          actionTaskCreated: false,
          emailSent: false,
          duration: Date.now() - startTime,
          message: 'No pending cards found'
        };
      }

      log('info', `📝 Found ${pendingCards.length} pending cards`);

      // 步骤1.5: 检查是否有未完成的卡片处理任务
      log('info', '🔍 Step 1.5: Checking for unfinished card processing tasks...');
      const unfinishedTask = await this.actionTaskCreator.findUnfinishedCardProcessingTask();
      
      if (unfinishedTask) {
        log('info', `⚠️ Found unfinished task: ${unfinishedTask.title} (${unfinishedTask.status})`);
        
        // 发送警告邮件而不是创建新任务
        log('info', '📧 Step 2: Sending warning email for unfinished task...');
        const emailResult = await this.emailNotifier.sendUnfinishedTaskWarning(
          pendingCards, 
          unfinishedTask
        );
        
        const result = {
          success: true,
          pendingCards: pendingCards.length,
          actionTaskCreated: false,
          emailSent: emailResult,
          duration: Date.now() - startTime,
          unfinishedTask: unfinishedTask,
          message: `Workflow completed with warning. ${pendingCards.length} cards need processing, but unfinished task exists: ${unfinishedTask.title}`
        };
        
        log('info', '⚠️ Workflow completed with warning - unfinished task exists', result);
        return result;
      }

      // 步骤2: 创建行动库任务（仅在没有未完成任务时）
      log('info', '📝 Step 2: Creating action task in action database...');
      const taskResult = await this.actionTaskCreator.createCardProcessingTask(pendingCards);

      if (!taskResult.success) {
        log('error', 'Failed to create action task', taskResult.error);
        return {
          success: false,
          pendingCards: pendingCards.length,
          actionTaskCreated: false,
          emailSent: false,
          duration: Date.now() - startTime,
          error: `Failed to create action task: ${taskResult.error}`
        };
      }

      log('info', `✅ Action task created successfully: ${taskResult.title}`);

      // 步骤3: 发送邮件通知
      log('info', '📧 Step 3: Sending email notification...');
      const emailResult = await this.emailNotifier.sendCardProcessingReminder(
        pendingCards, 
        taskResult.url
      );

      if (emailResult) {
        log('info', '✅ Email notification sent successfully');
      } else {
        log('warn', '⚠️ Email notification failed or not configured');
      }

      // 步骤4: 获取处理统计
      log('info', '📊 Step 4: Getting processing statistics...');
      const stats = await this.cardStatusChecker.getProcessingStats();

      const result = {
        success: true,
        pendingCards: pendingCards.length,
        actionTaskCreated: true,
        emailSent: emailResult,
        duration: Date.now() - startTime,
        actionTask: {
          title: taskResult.title,
          url: taskResult.url,
          pageId: taskResult.pageId
        },
        statistics: stats,
        message: `Workflow completed successfully. ${pendingCards.length} cards need manual processing.`
      };

      log('info', '🎉 Card processing workflow completed successfully!', result);
      return result;

    } catch (error) {
      log('error', '❌ Card processing workflow failed', error);
      return {
        success: false,
        pendingCards: 0,
        actionTaskCreated: false,
        emailSent: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 检查工作流配置
   * @returns {Object} 配置状态
   */
  checkWorkflowConfiguration() {
    const config = {
      emailService: this.emailNotifier.isConfigured,
      actionDatabase: this.actionTaskCreator.checkConfiguration(),
      targetDatabase: !!process.env.TARGET_DATABASE_ID,
      notionClient: !!this.notionClient
    };

    const allConfigured = Object.values(config).every(Boolean);
    
    log('info', 'Workflow configuration check:', {
      ...config,
      allConfigured
    });

    return {
      ...config,
      allConfigured
    };
  }

  /**
   * 获取工作流状态摘要
   * @returns {Promise<Object>} 状态摘要
   */
  async getWorkflowStatus() {
    try {
      const stats = await this.cardStatusChecker.getProcessingStats();
      const config = this.checkWorkflowConfiguration();
      
      return {
        configuration: config,
        statistics: stats,
        lastCheck: new Date().toISOString(),
        workflowReady: config.allConfigured
      };
    } catch (error) {
      log('error', 'Failed to get workflow status', error);
      return {
        configuration: this.checkWorkflowConfiguration(),
        statistics: null,
        lastCheck: new Date().toISOString(),
        workflowReady: false,
        error: error.message
      };
    }
  }
}
