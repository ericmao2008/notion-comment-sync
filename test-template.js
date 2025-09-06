import { NotionClient } from './src/notion-client.js';

async function testTemplate() {
  try {
    console.log('🔍 Testing template detection...');
    
    const client = new NotionClient(
      process.env.NOTION_TOKEN, 
      process.env.REFERENCE_DATABASE_ID, 
      process.env.TARGET_DATABASE_ID
    );
    
    // 获取数据库信息
    const database = await client.client.databases.retrieve({
      database_id: process.env.TARGET_DATABASE_ID
    });
    
    console.log('📋 Database info:', {
      title: database.title?.[0]?.plain_text || 'Unknown',
      hasTemplates: !!database.template_pages,
      templateCount: database.template_pages?.length || 0
    });
    
    if (database.template_pages && database.template_pages.length > 0) {
      console.log('📝 Available templates:');
      database.template_pages.forEach((template, index) => {
        const title = template.title?.[0]?.plain_text || 'Untitled';
        console.log(`  ${index + 1}. ${title} (ID: ${template.id})`);
      });
      
      // 查找卡片模板
      const cardTemplate = database.template_pages.find(template => 
        template.title && template.title.some(title => 
          title.plain_text === '卡片'
        )
      );
      
      if (cardTemplate) {
        console.log('✅ Found 卡片 template:', cardTemplate.id);
        
        // 获取模板内容
        const templateBlocks = await client.client.blocks.children.list({
          block_id: cardTemplate.id
        });
        
        console.log('📄 Template blocks count:', templateBlocks.results.length);
        templateBlocks.results.forEach((block, index) => {
          console.log(`  ${index + 1}. ${block.type}`);
        });
      } else {
        console.log('❌ 卡片 template not found');
      }
    } else {
      console.log('❌ No templates found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTemplate();
