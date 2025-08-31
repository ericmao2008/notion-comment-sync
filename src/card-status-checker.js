import { log } from './utils.js';

/**
 * 卡片状态检查器
 */
export class CardStatusChecker {
  constructor(notionClient) {
    this.notionClient = notionClient;
    this.targetDatabaseId = process.env.TARGET_DATABASE_ID;
  }

  /**
   * 检查需要人工处理的卡片
   * @returns {Promise<Array>} 待处理的卡片列表
   */
  async findPendingCards() {
    try {
      log('info', '🔍 Checking for cards that need manual processing...');

      // 查询目标数据库，找到符合条件的卡片
      const query = {
        database_id: this.targetDatabaseId,
        filter: {
          and: [
            {
              property: 'DiscussionID',
              rich_text: {
                is_not_empty: true
              }
            },
            {
              property: '它在解决什么问题？',
              multi_select: {
                is_empty: true
              }
            }
          ]
        },
        sorts: [
          {
            property: '创建日期',
            direction: 'descending'
          }
        ]
      };

      const response = await this.notionClient.client.databases.query(query);
      
      if (!response.results || response.results.length === 0) {
        log('info', '✨ No pending cards found');
        return [];
      }

      const pendingCards = response.results.map(page => ({
        pageId: page.id,
        title: this.extractTitle(page),
        discussionId: this.extractDiscussionId(page),
        sourceNoteId: this.extractSourceNoteId(page),
        pageUrl: `https://www.notion.so/${page.id.replace(/-/g, '')}`,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      }));

      log('info', `📋 Found ${pendingCards.length} pending cards that need manual processing`);

      // 按创建时间排序，最新的在前面
      pendingCards.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

      return pendingCards;

    } catch (error) {
      log('error', 'Failed to find pending cards', error);
      return [];
    }
  }

  /**
   * 提取页面标题
   * @param {Object} page - Notion页面对象
   * @returns {string} 页面标题
   */
  extractTitle(page) {
    try {
      // 尝试从页面属性中获取标题
      if (page.properties && page.properties['标题']) {
        const titleProp = page.properties['标题'];
        if (titleProp.title && titleProp.title.length > 0) {
          return titleProp.title[0].plain_text;
        }
      }

      // 如果没有标题属性，尝试从页面内容中获取
      if (page.properties && page.properties['Name']) {
        const nameProp = page.properties['Name'];
        if (nameProp.title && nameProp.title.length > 0) {
          return nameProp.title[0].plain_text;
        }
      }

      // 最后尝试从页面ID生成标题
      return `卡片-${page.id.slice(0, 8)}`;
    } catch (error) {
      log('warn', 'Failed to extract title from page', error);
      return `卡片-${page.id.slice(0, 8)}`;
    }
  }

  /**
   * 提取DiscussionID
   * @param {Object} page - Notion页面对象
   * @returns {string} DiscussionID
   */
  extractDiscussionId(page) {
    try {
      if (page.properties && page.properties['DiscussionID']) {
        const discussionIdProp = page.properties['DiscussionID'];
        if (discussionIdProp.rich_text && discussionIdProp.rich_text.length > 0) {
          return discussionIdProp.rich_text[0].plain_text;
        }
      }
      return '';
    } catch (error) {
      log('warn', 'Failed to extract DiscussionID from page', error);
      return '';
    }
  }

  /**
   * 提取来源笔记ID
   * @param {Object} page - Notion页面对象
   * @returns {string} 来源笔记ID
   */
  extractSourceNoteId(page) {
    try {
      if (page.properties && page.properties['来源笔记']) {
        const sourceNoteProp = page.properties['来源笔记'];
        if (sourceNoteProp.rich_text && sourceNoteProp.rich_text.length > 0) {
          return sourceNoteProp.rich_text[0].plain_text;
        }
      }
      return '';
    } catch (error) {
      log('warn', 'Failed to extract source note ID from page', error);
      return '';
    }
  }

  /**
   * 检查卡片是否已经处理完成
   * @param {string} pageId - 页面ID
   * @returns {Promise<boolean>} 是否已处理
   */
  async isCardProcessed(pageId) {
    try {
      const page = await this.notionClient.client.pages.retrieve({ page_id: pageId });
      
      if (page.properties && page.properties['它在解决什么问题？']) {
        const problemProp = page.properties['它在解决什么问题？'];
        if (problemProp.multi_select && problemProp.multi_select.length > 0) {
          return problemProp.multi_select.length > 0;
        }
      }
      
      return false;
    } catch (error) {
      log('warn', `Failed to check if card ${pageId} is processed`, error);
      return false;
    }
  }

  /**
   * 获取卡片处理统计
   * @returns {Promise<Object>} 统计信息
   */
  async getProcessingStats() {
    try {
      const pendingCards = await this.findPendingCards();
      
      // 查询总卡片数
      const totalQuery = {
        database_id: this.targetDatabaseId,
        filter: {
          property: 'DiscussionID',
          rich_text: {
            is_not_empty: true
          }
        }
      };

      const totalResponse = await this.notionClient.client.databases.query(totalQuery);
      const totalCards = totalResponse.results ? totalResponse.results.length : 0;

      // 查询已处理的卡片数
              const processedQuery = {
          database_id: this.targetDatabaseId,
          filter: {
            and: [
              {
                property: 'DiscussionID',
                rich_text: {
                  is_not_empty: true
                }
              },
              {
                property: '它在解决什么问题？',
                multi_select: {
                  is_not_empty: true
                }
              }
            ]
          }
        };

      const processedResponse = await this.notionClient.client.databases.query(processedQuery);
      const processedCards = processedResponse.results ? processedResponse.results.length : 0;

      return {
        total: totalCards,
        processed: processedCards,
        pending: pendingCards.length,
        processingRate: totalCards > 0 ? ((processedCards / totalCards) * 100).toFixed(1) : 0
      };

    } catch (error) {
      log('error', 'Failed to get processing stats', error);
      return {
        total: 0,
        processed: 0,
        pending: 0,
        processingRate: 0
      };
    }
  }
}
