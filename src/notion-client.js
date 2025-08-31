import { Client } from '@notionhq/client';
import { log } from './utils.js';

/**
 * Notion API 客户端封装
 */
export class NotionClient {
  constructor() {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      throw new Error('NOTION_TOKEN environment variable is required');
    }

    this.client = new Client({ auth: token });
    this.referenceDatabaseId = process.env.REFERENCE_DATABASE_ID;
    this.referenceDatabaseUrl = process.env.REFERENCE_DATABASE_URL;
    this.targetDatabaseId = process.env.TARGET_DATABASE_ID;

    if (!this.referenceDatabaseId || !this.targetDatabaseId) {
      throw new Error('REFERENCE_DATABASE_ID and TARGET_DATABASE_ID environment variables are required');
    }

    log('info', 'NotionClient initialized', {
      referenceDatabaseId: this.referenceDatabaseId,
      targetDatabaseId: this.targetDatabaseId
    });
  }

  /**
   * 获取 Reference 数据库中"未执行"的笔记
   * @returns {Promise<Array>} 笔记列表
   */
  async getUnexecutedNotes() {
    try {
      const response = await this.client.databases.query({
        database_id: this.referenceDatabaseId,
        filter: {
          property: '自动化',
          select: {
            equals: '未执行'
          }
        }
      });

      log('info', `Found ${response.results.length} unexecuted notes`);
      return response.results;
    } catch (error) {
      log('error', 'Failed to get unexecuted notes', error);
      throw error;
    }
  }

  /**
   * 获取页面所有块及其评论
   * @param {string} pageId - 页面ID
   * @returns {Promise<Array>} 块和评论的列表
   */
  async getPageBlocksWithComments(pageId) {
    try {
      log('debug', `Fetching blocks for page: ${pageId}`);
      
      // 获取页面所有块
      const blocks = await this.client.blocks.children.list({ block_id: pageId });
      log('info', `Retrieved ${blocks.results.length} blocks for page: ${pageId}`);
      
      const blocksWithComments = [];
      
      // 遍历每个块，获取其评论
      for (const block of blocks.results) {
        try {
          const comments = await this.client.comments.list({ block_id: block.id });
          
          if (comments.results.length > 0) {
            blocksWithComments.push({
              block,
              comments: comments.results
            });
            log('debug', `Block ${block.id} has ${comments.results.length} comments`);
          }
        } catch (error) {
          log('warn', `Failed to fetch comments for block ${block.id}:`, error.message);
          // 继续处理下一个块
        }
      }
      
      log('info', `Found ${blocksWithComments.length} blocks with comments`);
      return blocksWithComments;
    } catch (error) {
      log('error', `Failed to fetch page blocks: ${pageId}`, error);
      throw error;
    }
  }

  /**
   * 更新笔记的自动化状态
   * @param {string} pageId - 页面ID
   * @param {string} status - 新状态
   */
  async updateAutomationStatus(pageId, status) {
    try {
      await this.client.pages.update({
        page_id: pageId,
        properties: {
          '自动化': {
            select: {
              name: status
            }
          }
        }
      });
      log('info', `Updated automation status to '${status}' for page: ${pageId}`);
    } catch (error) {
      log('error', `Failed to update automation status for page: ${pageId}`, error);
      throw error;
    }
  }

  /**
   * 创建新页面
   * @param {Object} pageData - 页面数据
   * @returns {Promise<Object>} 创建的页面
   */
  async createPage(pageData) {
    try {
      const response = await this.client.pages.create(pageData);
      log('info', 'Page created successfully', { pageId: response.id, title: response.properties['卡片笔记']?.title?.[0]?.text?.content });
      return response;
    } catch (error) {
      log('error', 'Failed to create page', error);
      throw error;
    }
  }

  /**
   * 获取目标数据库的现有 DiscussionID
   * @returns {Promise<Array>} DiscussionID 列表
   */
  async getExistingDiscussionIds() {
    try {
      const response = await this.client.databases.query({
        database_id: this.targetDatabaseId,
        page_size: 100
      });

      const discussionIds = response.results
        .map(page => page.properties.DiscussionID?.rich_text?.[0]?.text?.content)
        .filter(Boolean);

      log('info', `Found ${discussionIds.length} existing discussion IDs`);
      return discussionIds;
    } catch (error) {
      log('error', 'Failed to get existing discussion IDs', error);
      throw error;
    }
  }

  /**
   * 获取目标数据库统计信息
   * @returns {Promise<Object>} 数据库统计信息
   */
  async getDatabaseStats() {
    try {
      const response = await this.client.databases.query({
        database_id: this.targetDatabaseId,
        page_size: 100
      });

      const totalPages = response.results.length;
      const uniqueDiscussionIds = new Set(
        response.results
          .map(page => page.properties.DiscussionID?.rich_text?.[0]?.text?.content)
          .filter(Boolean)
      ).size;

      const lastUpdated = response.results.length > 0 
        ? Math.max(...response.results.map(page => new Date(page.last_edited_time).getTime()))
        : 0;

      return {
        totalPages,
        uniqueDiscussionIds,
        lastUpdated
      };
    } catch (error) {
      log('error', 'Failed to get database stats', error);
      throw error;
    }
  }

  /**
   * 获取笔记URL
   * @param {string} pageId - 页面ID
   * @returns {string} 笔记URL
   */
  getNoteUrl(pageId) {
    if (this.referenceDatabaseUrl) {
      return `${this.referenceDatabaseUrl}?p=${pageId.replace(/-/g, '')}`;
    }
    return `https://notion.so/${pageId.replace(/-/g, '')}`;
  }
}
