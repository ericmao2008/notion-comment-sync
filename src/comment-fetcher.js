import { log } from './utils.js';

/**
 * 评论抓取和分组处理
 */
export class CommentFetcher {
  constructor(notionClient) {
    this.notionClient = notionClient;
    this.prefix = 'A：'; // 支持的前缀
    this.alternativePrefixes = ['A:', 'A：', 'A: ', 'Q:', 'Q：', 'Q: ', '→:', '→：', '→: ']; // 支持的前缀格式
  }

  /**
   * 获取页面所有评论并按讨论ID分组
   * @param {string} pageId - 页面ID
   * @returns {Promise<Array>} 分组后的评论
   */
  async fetchAndGroupComments(pageId) {
    try {
      log('info', `Starting to fetch comments for page: ${pageId}`);
      
      // 获取页面所有块及其评论
      const blocksWithComments = await this.notionClient.getPageBlocksWithComments(pageId);
      
      if (!blocksWithComments || blocksWithComments.length === 0) {
        log('info', 'No blocks with comments found on the page');
        return [];
      }

      // 收集所有评论
      const allComments = [];
      blocksWithComments.forEach(({ block, comments }) => {
        comments.forEach(comment => {
          // 为每个评论添加块信息
          comment.blockInfo = {
            id: block.id,
            type: block.type,
            content: this.extractBlockContent(block)
          };
          allComments.push(comment);
        });
      });

      log('info', `Found ${allComments.length} total comments across all blocks`);

      // 按 discussion_id 分组
      const groupedComments = this.groupCommentsByDiscussion(allComments);
      
      log('info', `Grouped comments into ${Object.keys(groupedComments).length} discussions`);
      
      // 筛选符合条件的讨论线程
      const validDiscussions = this.filterValidDiscussions(groupedComments);
      
      log('info', `Found ${validDiscussions.length} valid discussions with prefixes: A:/A:, Q:/Q:, →:/→:`);
      
      return validDiscussions;
    } catch (error) {
      log('error', 'Failed to fetch and group comments', error);
      throw error;
    }
  }

  /**
   * 按讨论ID分组评论
   * @param {Array} comments - 评论数组
   * @returns {Object} 分组后的评论
   */
  groupCommentsByDiscussion(comments) {
    const grouped = {};
    
    comments.forEach(comment => {
      const discussionId = comment.discussion_id;
      if (!grouped[discussionId]) {
        grouped[discussionId] = [];
      }
      grouped[discussionId].push(comment);
    });
    
    return grouped;
  }

  /**
   * 筛选有效的讨论线程
   * @param {Object} groupedComments - 分组后的评论
   * @returns {Array} 有效的讨论线程
   */
  filterValidDiscussions(groupedComments) {
    const validDiscussions = [];
    
    Object.keys(groupedComments).forEach(discussionId => {
      const comments = groupedComments[discussionId];
      
      // 检查是否有评论以有效前缀开头
      const hasValidPrefix = comments.some(comment => {
        const commentText = this.extractCommentText(comment);
        return this.alternativePrefixes.some(prefix => 
          commentText.trim().startsWith(prefix)
        );
      });
      
      if (hasValidPrefix) {
        // 按时间排序评论
        comments.sort((a, b) => new Date(a.created_time) - new Date(b.created_time));
        
        // 提取讨论标题（第一条有效前缀的评论）
        const titleComment = comments.find(comment => {
          const commentText = this.extractCommentText(comment);
          return this.alternativePrefixes.some(prefix => 
            commentText.trim().startsWith(prefix)
          );
        });
        
        if (titleComment) {
          const titleText = this.extractCommentText(titleComment);
          const actualPrefix = this.alternativePrefixes.find(prefix => 
            titleText.trim().startsWith(prefix)
          );
          const title = titleText.trim().replace(new RegExp(`^${actualPrefix}\\s*`), '').trim();
          
          validDiscussions.push({
            discussionId,
            title,
            comments,
            sourceNote: null // 将在 processMultipleNotes 中设置
          });
        }
      }
    });
    
    return validDiscussions;
  }

  /**
   * 处理多个笔记的评论
   * @param {Array} notes - 笔记数组
   * @returns {Array} 所有讨论线程
   */
  async processMultipleNotes(notes) {
    const allDiscussions = [];
    
    for (const note of notes) {
      log('info', `Processing note: ${note.id}`);
      
      try {
        const discussions = await this.fetchAndGroupComments(note.id);
        
        // 为每个讨论添加源笔记信息
        discussions.forEach(discussion => {
          discussion.sourceNote = {
            id: note.id,
            title: this.extractNoteTitle(note),
            url: this.notionClient.getNoteUrl(note.id)
          };
        });
        
        log('info', `Found ${discussions.length} discussions in note ${note.id}`);
        allDiscussions.push(...discussions);
        
      } catch (error) {
        log('error', `Failed to process note ${note.id}:`, error);
      }
    }
    
    log('info', `Total discussions found across all notes: ${allDiscussions.length}`);
    return allDiscussions;
  }

  /**
   * 提取笔记标题
   * @param {Object} note - 笔记对象
   * @returns {string} 笔记标题
   */
  extractNoteTitle(note) {
    // 尝试不同的标题属性名
    const titleProperties = ['Name', 'Title', '标题'];
    
    for (const propName of titleProperties) {
      if (note.properties[propName]?.title?.[0]?.text?.content) {
        return note.properties[propName].title[0].text.content;
      }
    }
    
    return '未知标题';
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
   * 提取块内容
   * @param {Object} block - 块对象
   * @returns {string} 块内容
   */
  extractBlockContent(block) {
    try {
      switch (block.type) {
        case 'paragraph':
          return block.paragraph?.rich_text?.map(text => text.plain_text).join('') || '';
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          return block[block.type]?.rich_text?.map(text => text.plain_text).join('') || '';
        case 'bulleted_list_item':
        case 'numbered_list_item':
          return block[block.type]?.rich_text?.map(text => text.plain_text).join('') || '';
        case 'quote':
          return block.quote?.rich_text?.map(text => text.plain_text).join('') || '';
        case 'callout':
          return block.callout?.rich_text?.map(text => text.plain_text).join('') || '';
        default:
          return `[${block.type}]`;
      }
    } catch (error) {
      return `[${block.type}]`;
    }
  }
}
