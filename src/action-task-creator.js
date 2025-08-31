import { log } from './utils.js';

/**
 * 行动库任务创建器
 */
export class ActionTaskCreator {
  constructor(notionClient) {
    this.notionClient = notionClient;
    this.actionDatabaseId = process.env.ACTION_DATABASE_ID;
  }

  /**
   * 检查行动库配置
   */
  checkConfiguration() {
    if (!this.actionDatabaseId) {
      log('warn', 'Missing ACTION_DATABASE_ID configuration');
      return false;
    }
    return true;
  }

  /**
   * 查找未完成的Reference处理任务
   * @returns {Promise<Object|null>} 未完成的任务，如果没有则返回null
   */
  async findUnfinishedReferenceProcessingTask() {
    try {
      const response = await this.notionClient.client.databases.query({
        database_id: this.actionDatabaseId,
        filter: {
          and: [
            {
              property: 'Task',
              title: {
                contains: 'Reference处理需求'
              }
            },
            {
              property: 'Status',
              status: {
                does_not_equal: '完成'
              }
            }
          ]
        },
        sorts: [
          {
            property: '创建时间',
            direction: 'descending'
          }
        ],
        page_size: 1
      });

      if (response.results && response.results.length > 0) {
        const task = response.results[0];
        return {
          id: task.id,
          title: task.properties.Task?.title?.[0]?.text?.content || '未知标题',
          status: task.properties.Status?.status?.name || '未知状态',
          url: `https://www.notion.so/${task.id.replace(/-/g, '')}`,
          createdTime: task.properties['创建时间']?.created_time || '未知时间'
        };
      }
      
      return null;
    } catch (error) {
      log('error', 'Failed to find unfinished reference processing task', error);
      return null;
    }
  }

  /**
   * 查找未完成的卡片处理任务
   * @returns {Promise<Object|null>} 未完成的任务，如果没有则返回null
   */
  async findUnfinishedCardProcessingTask() {
    try {
      const response = await this.notionClient.client.databases.query({
        database_id: this.actionDatabaseId,
        filter: {
          and: [
            {
              property: 'Task',
              title: {
                contains: '卡片处理需求'
              }
            },
            {
              property: 'Status',
              status: {
                does_not_equal: '完成'
              }
            }
          ]
        },
        sorts: [
          {
            property: '创建时间',
            direction: 'descending'
          }
        ],
        page_size: 1
      });

      if (response.results && response.results.length > 0) {
        const task = response.results[0];
        return {
          id: task.id,
          title: task.properties.Task?.title?.[0]?.text?.content || '未知标题',
          status: task.properties.Status?.status?.name || '未知状态',
          url: `https://www.notion.so/${task.id.replace(/-/g, '')}`,
          createdTime: task.properties['创建时间']?.created_time || '未知时间'
        };
      }
      
      return null;
    } catch (error) {
      log('error', 'Failed to find unfinished card processing task', error);
      return null;
    }
  }

  /**
   * 创建Reference处理任务
   * @param {Array} unexecutedNotes - 未执行的笔记列表
   * @returns {Promise<Object>} 创建结果
   */
  async createReferenceProcessingTask(unexecutedNotes) {
    if (!this.checkConfiguration()) {
      log('warn', 'Action database not configured, skipping task creation');
      return {
        success: false,
        error: 'Action database not configured'
      };
    }

    try {
      const currentTime = new Date();
      const timeString = currentTime.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
      const taskTitle = `Reference处理需求-${timeString}`;

      log('info', `Creating reference processing task: ${taskTitle}`);

      // 构建任务内容
      const taskContent = this.buildReferenceTaskContent(unexecutedNotes, currentTime);

      // 创建任务页面
      const taskPage = await this.notionClient.createActionTask({
        databaseId: this.actionDatabaseId,
        title: taskTitle,
        content: taskContent,
        properties: {
          'Status': {
            status: {
              name: '未开始'
            }
          },
          '优先级': {
            select: {
              name: 'High'
            }
          },
          'Category': {
            select: {
              name: 'PKM'
            }
          },
          'DDL': {
            date: {
              start: currentTime.toISOString().split('T')[0] // 当日日期
            }
          },
          'Task of the day': {
            relation: [
              {
                id: '25fe666e-cf2c-81f1-a7ed-fca26261dc44' // 当日笔记ID
              }
            ]
          },
          'Summary': {
            relation: [
              {
                id: '1c3e666e-cf2c-8045-b02a-dff15b11f944' // Summary文件ID
              }
            ]
          },
          'Reference': {
            relation: unexecutedNotes.map(note => ({
              id: note.id
            }))
          }
        }
      });

      if (taskPage.success) {
        log('info', `Reference processing task created successfully: ${taskPage.pageId}`);
        return {
          success: true,
          pageId: taskPage.pageId,
          title: taskTitle,
          url: `https://www.notion.so/${taskPage.pageId.replace(/-/g, '')}`,
          noteCount: unexecutedNotes.length
        };
      } else {
        log('error', 'Failed to create reference processing task');
        return {
          success: false,
          error: taskPage.error
        };
      }

    } catch (error) {
      log('error', 'Failed to create reference processing task', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创建卡片处理任务
   * @param {Array} pendingCards - 待处理的卡片列表
   * @returns {Promise<Object>} 创建结果
   */
  async createCardProcessingTask(pendingCards) {
    if (!this.checkConfiguration()) {
      log('warn', 'Action database not configured, skipping task creation');
      return {
        success: false,
        error: 'Action database not configured'
      };
    }

    try {
      const currentTime = new Date();
      const timeString = currentTime.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
      const taskTitle = `卡片处理需求-${timeString}`;

      log('info', `Creating action task: ${taskTitle}`);

      // 构建任务内容
      const taskContent = this.buildTaskContent(pendingCards, currentTime);

      // 创建任务页面
      const taskPage = await this.notionClient.createActionTask({
        databaseId: this.actionDatabaseId,
        title: taskTitle,
        content: taskContent,
        properties: {
          'Status': {
            status: {
              name: '未开始'
            }
          },
          '优先级': {
            select: {
              name: 'Medium'
            }
          },
          'Category': {
            select: {
              name: 'PKM'
            }
          },
          'DDL': {
            date: {
              start: currentTime.toISOString().split('T')[0] // 当日日期
            }
          },
          'Task of the day': {
            relation: [
              {
                id: '25fe666e-cf2c-81f1-a7ed-fca26261dc44' // 当日笔记ID
              }
            ]
          },
          'Summary': {
            relation: [
              {
                id: '1c3e666e-cf2c-8045-b02a-dff15b11f944' // Summary文件ID
              }
            ]
          }
        }
      });

      if (taskPage.success) {
        log('info', `Action task created successfully: ${taskPage.pageId}`);
        return {
          success: true,
          pageId: taskPage.pageId,
          title: taskTitle,
          url: `https://www.notion.so/${taskPage.pageId.replace(/-/g, '')}`,
          cardCount: pendingCards.length
        };
      } else {
        log('error', 'Failed to create action task');
        return {
          success: false,
          error: taskPage.error
        };
      }

    } catch (error) {
      log('error', 'Failed to create action task', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 构建Reference任务内容
   * @param {Array} unexecutedNotes - 未执行的笔记列表
   * @param {Date} currentTime - 当前时间
   * @returns {Array} 任务内容块
   */
  buildReferenceTaskContent(unexecutedNotes, currentTime) {
    const content = [
      {
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📋 Reference处理任务'
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
                content: `系统检测到 ${unexecutedNotes.length} 个Reference笔记需要处理。`
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
                content: '这些笔记的"自动化"字段状态为"未执行"，需要人工处理。'
              }
            }
          ]
        }
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📝 待处理笔记统计'
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
                content: `总共 ${unexecutedNotes.length} 个笔记需要处理`
              }
            }
          ]
        }
      }
    ];

    // 只添加前10个笔记的详细信息，避免超过100个块的限制
    const notesToShow = unexecutedNotes.slice(0, 10);
    const remainingNotes = unexecutedNotes.length - notesToShow.length;

    if (notesToShow.length > 0) {
      content.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📋 前10个笔记详情'
              }
            }
          ]
        }
      });

      notesToShow.forEach((note, index) => {
        content.push(
          {
            type: 'heading_3',
            heading_3: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `${index + 1}. ${note.title}`
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
                    content: `创建时间: ${note.createdTime}`
                  }
                }
              ]
            }
          }
        );

        // 添加笔记链接
        content.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: '笔记链接: '
                }
              },
              {
                type: 'text',
                text: {
                  content: note.url,
                  link: {
                    url: note.url
                  }
                }
              }
            ]
          }
        });

        content.push({
          type: 'divider',
          divider: {}
        });
      });

      if (remainingNotes > 0) {
        content.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `... 还有 ${remainingNotes} 个笔记需要处理`
                }
              }
            ]
          }
        });
      }
    }

    // 添加处理要求
    content.push(
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '⚠️ 处理要求'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '阅读Reference笔记内容'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '处理笔记中的评论'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '将"自动化"字段更新为"已执行"'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '完成所有处理后，将任务状态改为"完成"'
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
                content: `创建时间: ${currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
              }
            }
          ]
        }
      }
    );

    return content;
  }

  /**
   * 构建任务内容
   * @param {Array} pendingCards - 待处理的卡片列表
   * @param {Date} currentTime - 当前时间
   * @returns {Array} 任务内容块
   */
  buildTaskContent(pendingCards, currentTime) {
    const content = [
      {
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📋 卡片处理任务'
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
                content: `系统检测到 ${pendingCards.length} 个新生成的知识卡片需要人工处理。`
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
                content: '这些卡片目前缺少"它在解决什么问题？"字段的值，需要建立与具体问题的联系。'
              }
            }
          ]
        }
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📝 待处理卡片统计'
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
                content: `总共 ${pendingCards.length} 个卡片需要处理`
              }
            }
          ]
        }
      }
    ];

    // 只添加前10个卡片的详细信息，避免超过100个块的限制
    const cardsToShow = pendingCards.slice(0, 10);
    const remainingCards = pendingCards.length - cardsToShow.length;

    if (cardsToShow.length > 0) {
      content.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📋 前10个卡片详情'
              }
            }
          ]
        }
      });

      cardsToShow.forEach((card, index) => {
        content.push(
          {
            type: 'heading_3',
            heading_3: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `${index + 1}. ${card.title}`
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
                    content: `讨论ID: ${card.discussionId}`
                  }
                }
              ]
            }
          }
        );

        // 如果有卡片链接，添加到任务中
        if (card.pageUrl) {
          content.push({
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '卡片链接: '
                  }
                },
                {
                  type: 'text',
                  text: {
                    content: card.pageUrl,
                    link: {
                      url: card.pageUrl
                    }
                  }
                }
              ]
            }
          });
        }

        content.push({
          type: 'divider',
          divider: {}
        });
      });

      if (remainingCards > 0) {
        content.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `... 还有 ${remainingCards} 个卡片需要处理`
                }
              }
            ]
          }
        });
      }
    }

    // 添加处理要求
    content.push(
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '⚠️ 处理要求'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '阅读对应的Reference库文件'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '理解卡片内容'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '填写"它在解决什么问题？"字段'
              }
            }
          ]
        }
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '建立卡片与具体问题的联系'
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
                content: `创建时间: ${currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
              }
            }
          ]
        }
      }
    );

    return content;
  }
}
