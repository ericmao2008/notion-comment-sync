import { log } from './utils.js';
import { delay } from './utils.js';

/**
 * 数据库写入器
 */
export class DatabaseWriter {
  constructor(notionClient) {
    this.notionClient = notionClient;
  }

  /**
   * 验证目标数据库结构
   */
  async validateDatabaseStructure() {
    try {
      log('info', 'Validating target database structure');
      
      const response = await this.notionClient.client.databases.retrieve({
        database_id: this.notionClient.targetDatabaseId
      });
      
      const requiredProperties = ['卡片笔记', 'DiscussionID', 'Reference'];
      const existingProperties = Object.keys(response.properties);
      
      // 检查必需属性是否存在
      for (const prop of requiredProperties) {
        if (!existingProperties.includes(prop)) {
          throw new Error(`Missing required property: ${prop}`);
        }
      }
      
      // 检查属性类型
      if (response.properties['卡片笔记'].type !== 'title') {
        throw new Error('卡片笔记 property must be of type title');
      }
      
      if (response.properties['DiscussionID'].type !== 'rich_text') {
        throw new Error('DiscussionID property must be of type rich_text');
      }
      
      if (response.properties['Reference'].type !== 'relation') {
        throw new Error('Reference property must be of type relation');
      }
      
      log('info', 'Target database structure validation passed');
      return true;
    } catch (error) {
      log('error', 'Database structure validation failed', error);
      throw error;
    }
  }

  /**
   * 写入单个讨论到数据库
   * @param {Object} discussion - 讨论对象
   * @param {Object} contentProcessor - 内容处理器实例
   * @returns {Promise<Object>} 写入结果
   */
  async writeDiscussion(discussion, contentProcessor = null) {
    try {
      const pageData = discussion;
      const response = await this.notionClient.createPage(pageData);
      
      log('info', 'Discussion written successfully', {
        pageId: response.id,
        title: discussion.properties['卡片笔记'].title[0].text.content,
        discussionId: discussion.properties.DiscussionID.rich_text[0].text.content
      });
      
      // 如果需要添加数据库链接，在页面创建后添加
      if (discussion.needsInlineDatabase && contentProcessor) {
        try {
          await contentProcessor.addDatabaseLink(this.notionClient, response.id);
          log('info', 'Database link added successfully', { pageId: response.id });
        } catch (error) {
          log('error', 'Failed to add database link', error);
          // 不中断主流程，只记录错误
        }
      }
      
      return {
        success: true,
        pageId: response.id,
        title: discussion.properties['卡片笔记'].title[0].text.content,
        discussionId: discussion.properties.DiscussionID.rich_text[0].text.content,
        sourceNoteId: discussion.sourceNoteId
      };
    } catch (error) {
      log('error', 'Failed to write discussion to database', error);
      return {
        success: false,
        error: error.message,
        title: discussion.properties['卡片笔记'].title[0].text.content,
        discussionId: discussion.properties.DiscussionID.rich_text[0].text.content,
        sourceNoteId: discussion.sourceNoteId
      };
    }
  }

  /**
   * 批量写入多个讨论
   * @param {Array} discussions - 讨论数组
   * @param {Object} contentProcessor - 内容处理器实例
   * @returns {Promise<Object>} 批量写入结果
   */
  async writeMultipleDiscussions(discussions, contentProcessor = null) {
    try {
      log('info', `Starting to write ${discussions.length} discussions to database`);
      
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < discussions.length; i++) {
        const discussion = discussions[i];
        
        try {
          const result = await this.writeDiscussion(discussion, contentProcessor);
          results.push(result);
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
          
          // 显示进度
          log('info', `Progress: ${i + 1}/${discussions.length} discussions written successfully`);
          
          // 添加延迟以避免 API 限制
          if (i < discussions.length - 1) {
            await delay(1000);
          }
          
        } catch (error) {
          log('error', `Failed to write discussion ${i + 1}/${discussions.length}`, error);
          results.push({
            success: false,
            error: error.message,
            title: discussion.properties['卡片笔记'].title[0].text.content,
            discussionId: discussion.properties.DiscussionID.rich_text[0].text.content,
            sourceNoteId: discussion.sourceNoteId
          });
          errorCount++;
        }
      }
      
      log('info', `Batch write completed. Success: ${successCount}, Errors: ${errorCount}`);
      
      return {
        success: errorCount === 0,
        total: discussions.length,
        successCount,
        errorCount,
        results
      };
      
    } catch (error) {
      log('error', 'Failed to write multiple discussions', error);
      throw error;
    }
  }
}
