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
   * @returns {Object} 处理后的页面数据
   */
  processDiscussion(discussion) {
    try {
      const properties = this.generatePageProperties(discussion);
      const content = this.generatePageContent(discussion);
      
      return {
        parent: {
          database_id: this.notionClient.targetDatabaseId
        },
        properties,
        children: content
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
   * 生成页面内容块 - 实现新格式要求（简化版）
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
    
    // 添加 Q: 类型的评论
    if (groupedComments.Q && groupedComments.Q.length > 0) {
      groupedComments.Q.forEach(comment => {
        const content = this.extractCommentText(comment).replace(/^Q:?\s*/, '');
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
    
    // 添加 A: 类型的评论
    if (groupedComments.A && groupedComments.A.length > 0) {
      groupedComments.A.forEach(comment => {
        const content = this.extractCommentText(comment).replace(/^A:?\s*/, '');
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
    
    // 添加 → 类型的评论
    if (groupedComments.arrow && groupedComments.arrow.length > 0) {
      groupedComments.arrow.forEach(comment => {
        const content = this.extractCommentText(comment).replace(/^→:?\s*/, '');
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
    
    // 添加其他类型的评论
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
      const commentText = this.extractCommentText(comment);
      
      if (commentText.trim().match(/^Q:?\s/)) {
        grouped.Q.push(comment);
      } else if (commentText.trim().match(/^A:?\s/)) {
        grouped.A.push(comment);
      } else if (commentText.trim().match(/^→:?\s/)) {
        grouped.arrow.push(comment);
      } else {
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
   * @returns {Array} 处理后的页面数据数组
   */
  processMultipleDiscussions(discussions) {
    log('info', `Processing ${discussions.length} discussions`);
    
    return discussions.map(discussion => {
      try {
        return this.processDiscussion(discussion);
      } catch (error) {
        log('error', `Failed to process discussion: ${discussion.discussionId}`, error);
        return null;
      }
    }).filter(Boolean); // 过滤掉处理失败的讨论
  }
}
