import { Client } from '@notionhq/client';
import { log } from './utils.js';

/**
 * Notion API 客户端封装
 */
export class NotionClient {
  constructor() {
    const token = process.env.NOTION_TOKEN || process.env.NOTION_API_TOKEN;
    if (!token) {
      throw new Error('NOTION_TOKEN or NOTION_API_TOKEN environment variable is required');
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
      
      // 递归获取所有块（包括嵌套块）
      const allBlocks = await this.getAllBlocksRecursively(pageId);
      
      log('info', `Retrieved ${allBlocks.length} total blocks (including nested) for page: ${pageId}`);
      
      const blocksWithComments = [];
      
      // 遍历每个块，获取其评论
      for (const block of allBlocks) {
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
   * 递归获取所有块（包括嵌套块）
   * @param {string} blockId - 块ID或页面ID
   * @returns {Promise<Array>} 所有块的列表
   */
  async getAllBlocksRecursively(blockId) {
    try {
      let allBlocks = [];
      let startCursor = undefined;
      let hasMore = true;
      
      // 获取直接子块
      while (hasMore) {
        const response = await this.client.blocks.children.list({
          block_id: blockId,
          start_cursor: startCursor,
          page_size: 100
        });
        
        allBlocks = allBlocks.concat(response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor;
      }
      
      // 递归获取嵌套块的子块
      const nestedBlocks = [];
      for (const block of allBlocks) {
        if (block.has_children) {
          try {
            const childBlocks = await this.getAllBlocksRecursively(block.id);
            nestedBlocks.push(...childBlocks);
          } catch (error) {
            log('warn', `Failed to fetch nested blocks for ${block.id}:`, error.message);
          }
        }
      }
      
      // 合并所有块
      const result = [...allBlocks, ...nestedBlocks];
      log('debug', `Retrieved ${allBlocks.length} direct blocks and ${nestedBlocks.length} nested blocks from ${blockId}`);
      
      return result;
    } catch (error) {
      log('error', `Failed to get blocks recursively for ${blockId}:`, error);
      return [];
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
      
      // 创建页面后，添加Solution区域和内联数据库
      await this.addSolutionSection(response.id);
      
      return response;
    } catch (error) {
      log('error', 'Failed to create page', error);
      throw error;
    }
  }

  /**
   * 应用模板到页面
   * @param {string} pageId - 页面ID
   */
  async applyTemplate(pageId) {
    try {
      // 直接创建Solution区域和内联数据库，而不是依赖模板
      await this.addSolutionSection(pageId);
      log('info', 'Solution section added successfully', { pageId });
    } catch (error) {
      log('error', 'Failed to add Solution section', error);
      // 不抛出错误，让页面创建继续
    }
  }

  /**
   * 添加Solution区域到页面
   * @param {string} pageId - 页面ID
   */
  async addSolutionSection(pageId) {
    try {
      // 添加Solution标题
      await this.client.blocks.children.append({
        block_id: pageId,
        children: [
          {
            type: 'heading_2',
            heading_2: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: 'Solution'
                  }
                }
              ]
            }
          }
        ]
      });

      // 创建内联数据库
      const inlineDb = await this.createInlineDatabase(pageId);
      
      // 添加一些示例数据，链接到主数据库
      await this.populateInlineDatabase(inlineDb.id);
      
      log('info', 'Solution section added successfully', { pageId });
    } catch (error) {
      log('error', 'Failed to add Solution section', error);
      throw error;
    }
  }

  /**
   * 添加数据库链接说明
   * @param {string} pageId - 页面ID
   */
  async addDatabaseLink(pageId) {
    try {
      // 添加链接到现有卡片笔记库的说明
      await this.client.blocks.children.append({
        block_id: pageId,
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '🔗 相关解决方案：请在此处添加内联数据库视图，链接到卡片笔记库，并设置过滤条件 "它在解决什么问题？" = "选择合适的主题"'
                  }
                }
              ]
            }
          },
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '数据库链接：'
                  }
                },
                {
                  type: 'text',
                  text: {
                    content: 'https://www.notion.so/18ce666ecf2c817b9808e2386cd473a0',
                    link: {
                      url: 'https://www.notion.so/18ce666ecf2c817b9808e2386cd473a0'
                    }
                  }
                }
              ]
            }
          }
        ]
      });

      log('info', 'Database link added successfully', { pageId });
    } catch (error) {
      log('error', 'Failed to add database link', error);
      throw error;
    }
  }

  /**
   * 创建内联数据库
   * @param {string} pageId - 页面ID
   */
  async createInlineDatabase(pageId) {
    try {
      // 创建内联数据库，包含关系字段链接到主数据库
      const databaseResponse = await this.client.databases.create({
        parent: {
          type: 'page_id',
          page_id: pageId
        },
        title: [
          {
            type: 'text',
            text: {
              content: '相关解决方案'
            }
          }
        ],
        properties: {
          '卡片笔记': {
            title: {}
          },
          '它在解决什么问题？': {
            multi_select: {
              options: [
                {
                  name: '选择合适的主题',
                  color: 'blue'
                }
              ]
            }
          },
          '成熟度': {
            select: {
              options: [
                {
                  name: '种子',
                  color: 'red'
                },
                {
                  name: '萌芽',
                  color: 'orange'
                },
                {
                  name: '成长',
                  color: 'yellow'
                },
                {
                  name: '成熟',
                  color: 'green'
                }
              ]
            }
          },
          '链接到主数据库': {
            relation: {
              database_id: this.targetDatabaseId,
              type: 'single_property',
              single_property: {}
            }
          }
        }
      });

      log('info', 'Inline database created successfully', { 
        pageId, 
        databaseId: databaseResponse.id
      });

      return databaseResponse;
    } catch (error) {
      log('error', 'Failed to create inline database', error);
      throw error;
    }
  }

  /**
   * 填充内联数据库，添加链接到主数据库的记录
   * @param {string} databaseId - 内联数据库ID
   */
  async populateInlineDatabase(databaseId) {
    try {
      // 获取主数据库中的一些记录
      const mainDbResponse = await this.client.databases.query({
        database_id: this.targetDatabaseId,
        page_size: 5
      });

      // 在内联数据库中添加这些记录
      for (const page of mainDbResponse.results) {
        try {
          await this.client.pages.create({
            parent: {
              database_id: databaseId
            },
            properties: {
              '卡片笔记': {
                title: [
                  {
                    text: {
                      content: page.properties['卡片笔记']?.title?.[0]?.text?.content || '无标题'
                    }
                  }
                ]
              },
              '它在解决什么问题？': {
                multi_select: [
                  {
                    name: '选择合适的主题'
                  }
                ]
              },
              '成熟度': {
                select: {
                  name: '种子'
                }
              },
              '链接到主数据库': {
                relation: [
                  {
                    id: page.id
                  }
                ]
              }
            }
          });
        } catch (error) {
          log('warn', 'Failed to add record to inline database', { error: error.message });
        }
      }

      log('info', 'Inline database populated successfully', { databaseId });
    } catch (error) {
      log('warn', 'Failed to populate inline database', error);
      // 不抛出错误，让页面创建继续
    }
  }

  /**
   * 设置数据库视图和过滤条件
   * @param {string} databaseId - 数据库ID
   */
  async setupDatabaseView(databaseId) {
    try {
      // 更新数据库，设置默认过滤条件
      await this.client.databases.update({
        database_id: databaseId,
        // 这里可以添加视图配置，但Notion API对视图的支持有限
        // 我们通过创建数据库时设置默认值来实现过滤效果
      });

      log('info', 'Database view configured', { databaseId });
    } catch (error) {
      log('warn', 'Failed to configure database view', error);
      // 不抛出错误，让数据库创建继续
    }
  }

  /**
   * 从主模板页面复制Solution区域
   * @param {string} pageId - 页面ID
   */
  async copySolutionFromTemplate(pageId) {
    try {
      const masterTemplateId = process.env.MASTER_TEMPLATE_ID;
      if (!masterTemplateId) {
        throw new Error('MASTER_TEMPLATE_ID environment variable is not set');
      }

      // 获取主模板页面的所有内容
      const templateResponse = await this.client.blocks.children.list({
        block_id: masterTemplateId
      });
      
      const templateBlocks = templateResponse.results;
      
      if (templateBlocks.length === 0) {
        log('warn', 'Template page is empty', { masterTemplateId });
        return;
      }

      // 过滤和清理块，只保留可以复制的类型（排除child_database）
      const validBlocks = this.filterValidBlocks(templateBlocks);
      
      if (validBlocks.length === 0) {
        log('warn', 'No valid blocks found in template', { masterTemplateId });
        return;
      }

      // 将过滤后的模板内容复制到新页面
      await this.client.blocks.children.append({
        block_id: pageId,
        children: validBlocks
      });

      // 添加链接到现有卡片笔记库的说明
      await this.addDatabaseLink(pageId);

      log('info', 'Template content copied successfully', { 
        pageId, 
        masterTemplateId, 
        originalBlocks: templateBlocks.length,
        validBlocks: validBlocks.length
      });
    } catch (error) {
      log('error', 'Failed to copy template content', error);
      throw error;
    }
  }

  /**
   * 过滤有效的块类型，移除不能通过API复制的块
   * @param {Array} blocks - 原始块数组
   * @returns {Array} 过滤后的块数组
   */
  filterValidBlocks(blocks) {
    const validBlockTypes = [
      'heading_1', 'heading_2', 'heading_3',
      'paragraph', 'bulleted_list_item', 'numbered_list_item',
      'quote', 'to_do', 'toggle', 'callout',
      'divider', 'code', 'equation',
      'table', 'table_row',
      'column_list', 'column'
    ];

    const filteredBlocks = blocks.filter(block => {
      if (!validBlockTypes.includes(block.type)) {
        log('warn', `Skipping unsupported block type: ${block.type}`, { blockId: block.id });
        return false;
      }

      // 验证块结构是否完整
      if (!this.isValidBlockStructure(block)) {
        log('warn', `Invalid block structure for type: ${block.type}`, { blockId: block.id });
        return false;
      }

      return true;
    });

    return filteredBlocks;
  }

  /**
   * 验证块结构是否完整
   * @param {Object} block - 块对象
   * @returns {boolean} 是否有效
   */
  isValidBlockStructure(block) {
    try {
      // 检查块是否有对应的类型属性
      const typeProperty = block[block.type];
      if (!typeProperty) {
        return false;
      }

      // 对于某些特殊类型，进行额外验证
      if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
        return typeProperty.rich_text !== undefined;
      }

      if (block.type === 'paragraph') {
        return typeProperty.rich_text !== undefined;
      }

      return true;
    } catch (error) {
      log('warn', 'Error validating block structure', { error: error.message, blockType: block.type });
      return false;
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

  /**
   * 查找Reference数据库中"自动化"字段为"未执行"的笔记
   * @returns {Promise<Array>} 未执行的笔记列表
   */
  async findUnexecutedReferenceNotes() {
    try {
      const response = await this.client.databases.query({
        database_id: this.referenceDatabaseId,
        filter: {
          property: '自动化',
          select: {
            equals: '未执行'
          }
        },
        sorts: [
          {
            property: '创建时间',
            direction: 'descending'
          }
        ],
        page_size: 100
      });

      if (response.results && response.results.length > 0) {
        return response.results.map(note => ({
          id: note.id,
          title: note.properties['标题']?.title?.[0]?.text?.content || '未知标题',
          url: `https://www.notion.so/${note.id.replace(/-/g, '')}`,
          createdTime: note.properties['创建时间']?.created_time || '未知时间',
          automationStatus: note.properties['自动化']?.select?.name || '未知状态'
        }));
      }
      
      return [];
    } catch (error) {
      log('error', 'Failed to find unexecuted reference notes', error);
      return [];
    }
  }

  /**
   * 创建行动库任务
   * @param {Object} taskData - 任务数据
   * @returns {Promise<Object>} 创建结果
   */
  async createActionTask(taskData) {
    try {
      const { databaseId, title, content, properties } = taskData;
      
      // 构建页面创建请求
      const pageData = {
        parent: {
          database_id: databaseId
        },
        properties: {
          'Task': {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          },
          ...properties
        },
        children: content
      };

      const response = await this.client.pages.create(pageData);
      
      log('info', 'Action task created successfully', { 
        pageId: response.id, 
        title: title 
      });
      
      return {
        success: true,
        pageId: response.id
      };
    } catch (error) {
      log('error', 'Failed to create action task', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
