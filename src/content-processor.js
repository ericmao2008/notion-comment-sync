import { log } from './utils.js';
import { formatTime } from './utils.js';

/**
 * 内容处理器 - 生成 Notion 页面内容和属性
 */
export class ContentProcessor {
  constructor(notionClient) {
    this.notionClient = notionClient;
  }

  /**
   * 处理单个讨论线程
   * @param {Object} discussion - 讨论对象
   * @returns {Promise<Object>} 处理后的页面数据
   */
  async processDiscussion(discussion) {
    try {
      // 处理Summary关联
      const summaryPageId = await this.processSummaryRelation(discussion, this.notionClient);
      
      // 生成包含Summary关联的属性
      const properties = this.generatePagePropertiesWithSummary(discussion, summaryPageId);
      const content = this.generatePageContent(discussion);
      
      return {
        parent: {
          database_id: this.notionClient.targetDatabaseId
        },
        properties,
        children: content,
        // 保留源笔记信息，供后续使用
        sourceNoteId: discussion.sourceNote?.id,
        // 标记需要创建内联数据库
        needsInlineDatabase: true
      };
    } catch (error) {
      log('error', `Failed to process discussion: ${discussion.discussionId}`, error);
      throw error;
    }
  }

  /**
   * 生成页面属性
   * @param {Object} discussion - 讨论对象
   * @returns {Object} 页面属性
   */
  generatePageProperties(discussion) {
    return {
      // 标题属性
      '卡片笔记': {
        title: [
          {
            type: 'text',
            text: {
              content: discussion.title
            }
          }
        ]
      },
      
      // 讨论ID属性
      DiscussionID: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: discussion.discussionId
            }
          }
        ]
      },
      
      // 源笔记关联属性
      Reference: {
        relation: [
          {
            id: discussion.sourceNote?.id
          }
        ]
      }
    };
  }

  /**
   * 生成页面属性（包含Summary关联）
   * @param {Object} discussion - 讨论对象
   * @param {string} summaryPageId - Summary页面ID
   * @returns {Object} 页面属性
   */
  generatePagePropertiesWithSummary(discussion, summaryPageId) {
    const properties = this.generatePageProperties(discussion);
    
    // 添加Summary关联属性
    if (summaryPageId) {
      properties.Summary = {
        relation: [
          {
            id: summaryPageId
          }
        ]
      };
    }
    
    return properties;
  }

  /**
   * 生成页面内容块 - 实现新格式要求（图2格式）
   * @param {Object} discussion - 讨论对象
   * @returns {Array} 内容块数组
   */
  generatePageContent(discussion) {
    const children = [];
    
    // 添加 Reference 标题
    children.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'Reference'
            }
          }
        ]
      }
    });
    
    // 按类型分组评论
    const groupedComments = this.groupCommentsByType(discussion.comments);
    
    // 添加 Q: 类型的评论（简化格式，只显示内容）
    if (groupedComments.Q && groupedComments.Q.length > 0) {
      groupedComments.Q.forEach(comment => {
        // 直接使用原始评论文本，去掉前缀
        const commentText = comment.rich_text?.[0]?.plain_text || '';
        const content = commentText.replace(/^Q:?\s*/, '');
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `Q：${content}`
                }
              }
            ]
          }
        });
      });
    }
    
    // 添加 A: 类型的评论（简化格式，只显示内容）
    if (groupedComments.A && groupedComments.A.length > 0) {
      groupedComments.A.forEach(comment => {
        // 直接使用原始评论文本，去掉前缀
        const commentText = comment.rich_text?.[0]?.plain_text || '';
        const content = commentText.replace(/^A:?\s*/, '');
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `A：${content}`
                }
              }
            ]
          }
        });
      });
    }
    
    // 添加源块内容（使用quote格式，与其他内容区分）
    if (discussion.comments?.[0]?.blockInfo) {
      const blockInfo = discussion.comments[0].blockInfo;
      const blockContent = blockInfo.content;
      
      // 使用quote格式添加源块内容，与其他内容区分
      children.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: blockContent
              }
            }
          ]
        }
      });
    }
    
    // 添加 → 类型的评论（简化格式，只显示内容）
    if (groupedComments.arrow && groupedComments.arrow.length > 0) {
      groupedComments.arrow.forEach(comment => {
        // 直接使用原始评论文本，去掉前缀
        const commentText = comment.rich_text?.[0]?.plain_text || '';
        const content = commentText.replace(/^→:?\s*/, '');
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `→：${content}`
                }
              }
            ]
          }
        });
      });
    }
    
    // 添加其他类型的评论（保持原有格式，包含用户ID和时间）
    if (groupedComments.other && groupedComments.other.length > 0) {
      groupedComments.other.forEach(comment => {
        const author = this.getCommentAuthor(comment);
        const time = formatTime(comment.created_time);
        const content = this.extractCommentText(comment);
        
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `【${author}】(时间: ${time}) ${content}`
                }
              }
            ]
          }
        });
      });
    }
    
    // 在页面开头添加Solution区域内容，这样会出现在模板的Solution区域上方
    children.unshift({
      object: 'block',
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
    });
    
    children.unshift({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '📊 相关解决方案数据库：'
            }
          }
        ]
      }
    });
    
    children.unshift({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '🔗 卡片笔记库',
              link: {
                url: 'https://www.notion.so/18ce666ecf2c817b9808e2386cd473a0'
              }
            }
          }
        ]
      }
    });
    
    children.unshift({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '💡 提示：点击上方链接查看所有相关解决方案，或使用过滤器筛选"选择合适的主题"的卡片。'
            }
          }
        ]
      }
    });
    
    children.unshift({
      object: 'block',
      type: 'divider',
      divider: {}
    });
    
    return children;
  }

  /**
   * 按类型分组评论
   * @param {Array} comments - 评论数组
   * @returns {Object} 分组后的评论
   */
  groupCommentsByType(comments) {
    const grouped = {
      Q: [],
      A: [],
      arrow: [],
      other: []
    };

    comments.forEach(comment => {
      // 直接使用原始的评论文本，而不是处理后的文本
      const commentText = comment.rich_text?.[0]?.plain_text || '';
      
      // 调试输出
      console.log(`Debug: Comment text: "${commentText}"`);
      
      // 修复正则表达式匹配 - 去掉空格要求
      if (commentText.trim().match(/^Q:?/)) {
        console.log(`Debug: Matched as Q comment`);
        grouped.Q.push(comment);
      } else if (commentText.trim().match(/^A:?/)) {
        console.log(`Debug: Matched as A comment`);
        grouped.A.push(comment);
      } else if (commentText.trim().match(/^→:?/)) {
        console.log(`Debug: Matched as arrow comment`);
        grouped.arrow.push(comment);
      } else {
        console.log(`Debug: Matched as other comment`);
        grouped.other.push(comment);
      }
    });

    return grouped;
  }

  /**
   * 提取评论文本内容
   * @param {Object} comment - 评论对象
   * @returns {string} 评论文本
   */
  extractCommentText(comment) {
    if (!comment.rich_text || comment.rich_text.length === 0) {
      return '';
    }
    
    return comment.rich_text
      .map(text => text.plain_text)
      .join('')
      .trim();
  }

  /**
   * 获取评论作者信息
   * @param {Object} comment - 评论对象
   * @returns {string} 作者名称
   */
  getCommentAuthor(comment) {
    if (comment.created_by?.name) {
      return comment.created_by.name;
    }
    if (comment.created_by?.id) {
      return `用户${comment.created_by.id.slice(-4)}`;
    }
    return '未知用户';
  }

  /**
   * 批量处理多个讨论线程
   * @param {Array} discussions - 讨论线程数组
   * @returns {Promise<Array>} 处理后的页面数据数组
   */
  async processMultipleDiscussions(discussions) {
    log('info', `Processing ${discussions.length} discussions`);
    
    const results = [];
    
    for (const discussion of discussions) {
      try {
        const result = await this.processDiscussion(discussion);
        results.push(result);
      } catch (error) {
        log('error', `Failed to process discussion: ${discussion.discussionId}`, error);
        // 继续处理下一个讨论，不中断整个流程
      }
    }
    
    return results.filter(Boolean); // 过滤掉处理失败的讨论
  }

  /**
   * 处理Summary页面关联
   * @param {Object} discussion - 讨论对象
   * @param {Object} notionClient - Notion客户端实例
   * @returns {Promise<string>} Summary页面ID
   */
  async processSummaryRelation(discussion, notionClient) {
    try {
      const summaryDatabaseId = '1c3e666e-cf2c-805b-af13-e89cc235801f';
      
      // 查找名为"Summary"的页面（所有卡片都链接到同一个Summary文件）
      console.log(`🔍 查找Summary文件...`);
      
      const summaryPage = await this.findSummaryFile(notionClient, summaryDatabaseId);
      
      if (summaryPage) {
        console.log(`✅ 找到Summary文件: ${summaryPage.id}`);
        return summaryPage.id;
      }
      
      // 如果没有找到，创建名为"Summary"的文件
      console.log(`📝 创建Summary文件...`);
      
      const newSummaryPageId = await this.createSummaryFile(notionClient, summaryDatabaseId);
      
      if (newSummaryPageId) {
        console.log(`✅ 创建Summary文件成功: ${newSummaryPageId}`);
        return newSummaryPageId;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ 处理Summary关联失败:', error.message);
      return null;
    }
  }

  /**
   * 查找名为"Summary"的文件
   * @param {Object} notionClient - Notion客户端实例
   * @param {string} summaryDatabaseId - Summary数据库ID
   * @returns {Promise<Object|null>} Summary文件对象或null
   */
  async findSummaryFile(notionClient, summaryDatabaseId) {
    try {
      const response = await notionClient.client.databases.query({
        database_id: summaryDatabaseId,
        filter: {
          property: '名称',
          title: {
            equals: 'Summary'
          }
        }
      });
      
      if (response.results.length > 0) {
        return response.results[0];
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ 查找Summary文件失败:', error.message);
      return null;
    }
  }



  /**
   * 在页面中添加数据库视图嵌入
   * @param {Object} notionClient - Notion客户端实例
   * @param {string} pageId - 页面ID
   * @returns {Promise<boolean>} 是否成功添加
   */
  async addDatabaseViewEmbed(notionClient, pageId) {
    try {
      // 卡片笔记库的数据库ID
      const cardDatabaseId = '18ce666e-cf2c-817b-9808-e2386cd473a0';
      
      // 在页面中添加数据库视图嵌入
      const response = await notionClient.client.blocks.children.append({
        block_id: pageId,
        children: [
          {
            type: 'child_database',
            child_database: {
              title: '相关解决方案'
            }
          }
        ]
      });
      
      // 注意：Notion API 无法直接创建内联数据库视图
      // 我们需要使用不同的方法
      console.log(`✅ 添加数据库视图嵌入成功`);
      return true;
      
    } catch (error) {
      console.error('❌ 添加数据库视图嵌入失败:', error.message);
      return false;
    }
  }

  /**
   * 在页面中添加数据库链接和说明
   * @param {Object} notionClient - Notion客户端实例
   * @param {string} pageId - 页面ID
   * @returns {Promise<boolean>} 是否成功添加
   */
  async addDatabaseLink(notionClient, pageId) {
    try {
      // 卡片笔记库的数据库ID和URL
      const cardDatabaseId = '18ce666e-cf2c-817b-9808-e2386cd473a0';
      const cardDatabaseUrl = `https://www.notion.so/${cardDatabaseId.replace(/-/g, '')}`;
      
      // 在页面中添加数据库链接和说明
      const response = await notionClient.client.blocks.children.append({
        block_id: pageId,
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '📊 相关解决方案数据库：'
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
                    content: '🔗 ',
                    annotations: {
                      bold: true
                    }
                  }
                },
                {
                  type: 'text',
                  text: {
                    content: '卡片笔记库',
                    link: {
                      url: cardDatabaseUrl
                    }
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
                    content: '💡 提示：点击上方链接查看所有相关解决方案，或使用过滤器筛选"选择合适的主题"的卡片。'
                  }
                }
              ]
            }
          },
          {
            type: 'divider',
            divider: {}
          }
        ]
      });
      
      console.log(`✅ 添加数据库链接成功`);
      return true;
      
    } catch (error) {
      console.error('❌ 添加数据库链接失败:', error.message);
      return false;
    }
  }

  /**
   * 创建名为"Summary"的文件
   * @param {Object} notionClient - Notion客户端实例
   * @param {string} summaryDatabaseId - Summary数据库ID
   * @returns {Promise<string|null>} 新创建的Summary文件ID或null
   */
  async createSummaryFile(notionClient, summaryDatabaseId) {
    try {
      const newPage = await notionClient.client.pages.create({
        parent: {
          database_id: summaryDatabaseId
        },
        properties: {
          '名称': {
            title: [
              {
                type: 'text',
                text: {
                  content: 'Summary'
                }
              }
            ]
          }
        },
        children: [
          {
            object: 'block',
            type: 'heading_1',
            heading_1: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '📋 卡片笔记汇总'
                  }
                }
              ]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '这是所有卡片笔记的汇总页面。'
                  }
                }
              ]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '📅 创建时间: ' + new Date().toLocaleDateString('zh-CN')
                  }
                }
              ]
            }
          },
          {
            object: 'block',
            type: 'divider',
            divider: {}
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '💡 提示: 所有卡片笔记的Summary字段都会链接到这个页面。'
                  }
                }
              ]
            }
          }
        ]
      });
      
      return newPage.id;
      
    } catch (error) {
      console.error('❌ 创建Summary文件失败:', error.message);
      return null;
    }
  }
}
