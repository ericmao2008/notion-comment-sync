// 查找评论实际所在的块
console.log('🔍 查找评论实际所在的块...');

import('dotenv').then(dotenv => {
  dotenv.config();
  
  import('./src/notion-client.js').then(async ({ NotionClient }) => {
    try {
      const notionClient = new NotionClient();
      
      const targetComment = "A:具备识人的能力";
      console.log(`🔍 查找评论: ${targetComment}`);
      
      // 1. 搜索整个Reference数据库
      console.log('\n📋 1. 搜索整个Reference数据库...');
      try {
        const response = await notionClient.client.databases.query({
          database_id: notionClient.referenceDatabaseId,
          page_size: 100
        });
        
        const notes = response.results;
        console.log(`📝 找到 ${notes.length} 个笔记`);
        
        // 搜索每个笔记
        for (const note of notes) {
          const title = note.properties['标题']?.title?.[0]?.text?.content || '无标题';
          console.log(`\n🔍 检查笔记: ${title}`);
          
          try {
            // 获取笔记的所有块
            let allBlocks = [];
            let startCursor = undefined;
            let hasMore = true;
            
            while (hasMore) {
              const response = await notionClient.client.blocks.children.list({
                block_id: note.id,
                start_cursor: startCursor,
                page_size: 100
              });
              
              allBlocks = allBlocks.concat(response.results);
              hasMore = response.has_more;
              startCursor = response.next_cursor;
            }
            
            console.log(`   块数量: ${allBlocks.length}`);
            
            // 检查每个块的评论
            for (const block of allBlocks) {
              try {
                const comments = await notionClient.client.comments.list({
                  block_id: block.id
                });
                
                if (comments.results.length > 0) {
                  for (const comment of comments.results) {
                    const commentText = comment.rich_text?.[0]?.plain_text || '';
                    if (commentText.includes('具备识人的能力')) {
                      console.log(`   🎯 找到目标评论!`);
                      console.log(`      评论内容: ${commentText}`);
                      console.log(`      块ID: ${block.id}`);
                      console.log(`      块类型: ${block.type}`);
                      console.log(`      评论ID: ${comment.id}`);
                      console.log(`      讨论ID: ${comment.discussion_id}`);
                      console.log(`      笔记标题: ${title}`);
                      console.log(`      笔记ID: ${note.id}`);
                      
                      // 获取块内容
                      const blockContent = block[block.type]?.rich_text?.[0]?.text?.content || '无内容';
                      console.log(`      块内容: ${blockContent}`);
                      
                      // 检查块是否在页面中
                      const blockInPage = allBlocks.find(b => b.id === block.id);
                      if (blockInPage) {
                        console.log(`      ✅ 块在页面中`);
                      } else {
                        console.log(`      ❌ 块不在页面中 - 这是问题所在!`);
                      }
                    }
                  }
                }
              } catch (error) {
                // 忽略没有评论的块
              }
            }
            
          } catch (error) {
            console.log(`   ❌ 检查笔记失败: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.error('❌ 搜索Reference数据库失败:', error.message);
      }
      
      // 2. 尝试通过评论ID直接获取评论信息
      console.log('\n📋 2. 通过评论ID获取信息...');
      try {
        // 从之前的调试中我们知道评论ID
        const commentId = '260e666e-cf2c-80af-a002-001db0e550cf';
        
        // 尝试获取评论详情
        const comment = await notionClient.client.comments.retrieve({
          comment_id: commentId
        });
        
        console.log(`📝 评论详情:`);
        console.log(`   内容: ${comment.rich_text?.[0]?.plain_text || ''}`);
        console.log(`   父级类型: ${comment.parent.type}`);
        console.log(`   父级ID: ${comment.parent[comment.parent.type]?.id || comment.parent.block_id}`);
        console.log(`   讨论ID: ${comment.discussion_id}`);
        
        // 如果父级是块，尝试获取块信息
        if (comment.parent.type === 'block_id') {
          try {
            const parentBlock = await notionClient.client.blocks.retrieve({
              block_id: comment.parent.block_id
            });
            
            console.log(`\n📝 父级块信息:`);
            console.log(`   块ID: ${parentBlock.id}`);
            console.log(`   块类型: ${parentBlock.type}`);
            console.log(`   块内容: ${parentBlock[parentBlock.type]?.rich_text?.[0]?.text?.content || '无内容'}`);
            
            // 检查这个块是否在目标页面中
            const targetPageId = 'ae48683f-e2c4-4767-8982-f7841f32c902';
            
            try {
              const pageBlocks = await notionClient.client.blocks.children.list({
                block_id: targetPageId,
                page_size: 100
              });
              
              const blockInPage = pageBlocks.results.find(b => b.id === parentBlock.id);
              if (blockInPage) {
                console.log(`   ✅ 父级块在目标页面中`);
              } else {
                console.log(`   ❌ 父级块不在目标页面中 - 这是问题所在!`);
              }
              
            } catch (error) {
              console.log(`   ❌ 检查页面块失败: ${error.message}`);
            }
            
          } catch (error) {
            console.log(`   ❌ 获取父级块失败: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.error('❌ 获取评论详情失败:', error.message);
      }
      
    } catch (error) {
      console.error('❌ 查找失败:', error.message);
    }
  }).catch(error => {
    console.error('❌ 导入 notion-client 失败:', error);
  });
  
}).catch(error => {
  console.error('❌ 加载环境变量失败:', error);
});
