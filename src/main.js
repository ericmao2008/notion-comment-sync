import 'dotenv/config';
import { log } from './utils.js';
import { NotionClient } from './notion-client.js';
import { CommentFetcher } from './comment-fetcher.js';
import { ContentProcessor } from './content-processor.js';
import { DatabaseWriter } from './database-writer.js';
import { WorkflowManager } from './workflow-manager.js';

/**
 * Notion 评论同步主程序
 */
export class NotionCommentSync {
  constructor() {
    this.notionClient = new NotionClient();
    this.commentFetcher = new CommentFetcher(this.notionClient);
    this.contentProcessor = new ContentProcessor(this.notionClient);
    this.databaseWriter = new DatabaseWriter(this.notionClient);
    this.workflowManager = new WorkflowManager(this.notionClient);
  }

  /**
   * 执行同步流程
   * @returns {Promise<Object>} 同步结果
   */
  async sync() {
    const startTime = Date.now();
    
    try {
      log('info', '🚀 Starting Notion comment sync process...');
      
      // 步骤1: 验证目标数据库结构
      log('info', '📋 Step 1: Validating target database structure...');
      await this.databaseWriter.validateDatabaseStructure();
      
      // 步骤2: 获取数据库统计信息
      log('info', '📊 Step 2: Getting database statistics...');
      const beforeStats = await this.notionClient.getDatabaseStats();
      log('info', 'Database stats before sync', beforeStats);
      
      // 步骤3: 获取 Reference 数据库中"未执行"的笔记
      log('info', '🔍 Step 3: Fetching unexecuted notes from reference database...');
      const pendingNotes = await this.notionClient.getUnexecutedNotes();
      log('info', `📝 Found ${pendingNotes.length} unexecuted notes to process`);
      
      if (pendingNotes.length === 0) {
        log('info', '✨ No unexecuted notes found. Sync completed!');
        return {
          success: true,
          processed: 0,
          written: 0,
          errors: 0,
          duration: Date.now() - startTime,
          beforeStats,
          afterStats: beforeStats
        };
      }
      
      // 步骤4: 获取所有笔记的有效讨论
      log('info', '🔍 Step 4: Fetching valid discussions from all notes...');
      const allDiscussions = await this.commentFetcher.processMultipleNotes(pendingNotes);
      
      if (allDiscussions.length === 0) {
        log('info', '✨ No valid discussions found. Sync completed!');
        return {
          success: true,
          processed: 0,
          written: 0,
          errors: 0,
          duration: Date.now() - startTime,
          beforeStats,
          afterStats: beforeStats
        };
      }
      
      // 步骤5: 检查去重，只处理新的讨论
      const existingDiscussionIds = await this.notionClient.getExistingDiscussionIds();
      const newDiscussions = allDiscussions.filter(discussion => 
        !existingDiscussionIds.includes(discussion.discussionId)
      );
      
      log('info', `Found ${newDiscussions.length} new discussions to process`);
      
      if (newDiscussions.length === 0) {
        log('info', '✨ No new discussions to process. Sync completed!');
        return {
          success: true,
          processed: allDiscussions.length,
          written: 0,
          errors: 0,
          duration: Date.now() - startTime,
          beforeStats,
          afterStats: beforeStats
        };
      }
      
      // 步骤6: 处理讨论内容并写入数据库
      log('info', '⚙️ Step 5: Processing discussion content...');
      log('info', `Processing ${newDiscussions.length} discussions`);
      
      const processedDiscussions = await this.contentProcessor.processMultipleDiscussions(newDiscussions);
      
      log('info', '💾 Step 6: Writing discussions to database...');
      const writeResults = await this.databaseWriter.writeMultipleDiscussions(processedDiscussions);
      
      // 步骤7: 更新 Reference 数据库中已处理笔记的状态
      log('info', '🔄 Step 7: Updating automation status in reference database...');
      await this.updateProcessedNotesStatus(pendingNotes, writeResults.results);
      
      // 步骤8: 执行Reference处理工作流
      log('info', '🔄 Step 8: Executing reference processing workflow...');
      const referenceWorkflowResult = await this.workflowManager.executeReferenceProcessingWorkflow();
      log('info', '📋 Reference processing workflow result:', referenceWorkflowResult);
      
      // 步骤9: 执行卡片处理工作流（仅当Reference任务完成时）
      let cardWorkflowResult = null;
      if (referenceWorkflowResult.success && !referenceWorkflowResult.unfinishedTask) {
        log('info', '🔄 Step 9: Executing card processing workflow...');
        cardWorkflowResult = await this.workflowManager.executeCardProcessingWorkflow();
        log('info', '📋 Card processing workflow result:', cardWorkflowResult);
      } else {
        log('info', '⏸️ Skipping card processing workflow - Reference task not completed');
      }
      
      // 步骤10: 获取更新后的数据库统计信息
      const afterStats = await this.notionClient.getDatabaseStats();
      
      const duration = Date.now() - startTime;
      
      log('info', '🎉 Sync process completed successfully!', {
        success: true,
        processed: allDiscussions.length,
        written: writeResults.successCount,
        errors: writeResults.errorCount,
        duration,
        beforeStats,
        afterStats,
        referenceWorkflowResult,
        cardWorkflowResult
      });
      
      return {
        success: true,
        processed: allDiscussions.length,
        written: writeResults.successCount,
        errors: writeResults.errorCount,
        duration,
        beforeStats,
        afterStats,
        writeResults: writeResults.results,
        referenceWorkflowResult,
        cardWorkflowResult
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log('error', '❌ Sync process failed', error);
      
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * 更新已处理笔记的自动化状态
   * @param {Array} pendingNotes - 待处理笔记
   * @param {Array} writeResults - 写入结果
   */
  async updateProcessedNotesStatus(pendingNotes, writeResults) {
    try {
      log('info', 'Starting to update automation status for processed notes');
      
      // 统计每个源笔记的成功写入数量
      const sourceNoteSuccessCount = {};
      
      writeResults.forEach(result => {
        if (result.success && result.sourceNoteId) {
          // 使用 sourceNoteId 来统计
          sourceNoteSuccessCount[result.sourceNoteId] = (sourceNoteSuccessCount[result.sourceNoteId] || 0) + 1;
        }
      });
      
      log('info', `Source note success count:`, sourceNoteSuccessCount);
      
      for (const note of pendingNotes) {
        const noteId = note.id;
        
        // 检查该笔记是否有成功写入的讨论
        const successCount = sourceNoteSuccessCount[noteId] || 0;
        
        if (successCount > 0) {
          // 如果有成功写入的讨论，更新状态为"已执行"
          log('info', `Note ${noteId} has ${successCount} successful discussions, updating to '已执行'`);
          await this.notionClient.updateAutomationStatus(noteId, '已执行');
        } else {
          // 如果没有成功写入的讨论，保持状态为"未执行"
          log('info', `Note ${noteId} has no successful discussions, keeping '未执行' status`);
        }
      }
      
      log('info', 'Completed updating automation status for all notes');
      
    } catch (error) {
      log('error', 'Failed to update automation status', error);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const sync = new NotionCommentSync();
    const result = await sync.sync();
    
    // 输出同步摘要
    console.log('\n============================================================');
    console.log('📋 SYNC SUMMARY');
    console.log('============================================================');
    console.log(`✅ Success: ${result.success ? 'Yes' : 'No'}`);
    
    if (result.success) {
      console.log(`📝 Total Processed: ${result.processed}`);
      console.log(`💾 Successfully Written: ${result.written}`);
      console.log(`❌ Errors: ${result.errors}`);
      console.log(`⏱️ Duration: ${result.duration}ms`);
      
      console.log('\n📊 DATABASE STATS');
      console.log(`📄 Before: ${result.beforeStats.totalPages} pages`);
      console.log(`📄 After: ${result.afterStats.totalPages} pages`);
      console.log(`📈 New: ${result.afterStats.uniqueDiscussionIds - result.beforeStats.uniqueDiscussionIds} pages`);
      
      if (result.errors > 0 && result.writeResults) {
        console.log('\n❌ ERROR DETAILS');
        result.writeResults
          .filter(r => !r.success)
          .forEach((result, index) => {
            console.log(`${index + 1}. ${result.title} (${result.discussionId}): ${result.error}`);
          });
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
    
    console.log('============================================================\n');
    
  } catch (error) {
    console.error('❌ Main function failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default NotionCommentSync;
