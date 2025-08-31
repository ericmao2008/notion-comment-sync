// 测试卡片处理工作流
console.log('🧪 测试卡片处理工作流...');

import('dotenv').then(dotenv => {
  dotenv.config();
  
  import('./src/workflow-manager.js').then(async ({ WorkflowManager }) => {
    import('./src/notion-client.js').then(async ({ NotionClient }) => {
      try {
        const notionClient = new NotionClient();
        const workflowManager = new WorkflowManager(notionClient);
        
        console.log('📋 检查工作流配置...');
        const config = workflowManager.checkWorkflowConfiguration();
        console.log('配置状态:', config);
        
        if (!config.allConfigured) {
          console.log('❌ 工作流配置不完整，请检查环境变量');
          console.log('缺少的配置:', {
            emailService: config.emailService ? '✅' : '❌ SMTP_USER, SMTP_PASS, EMAIL_TO 环境变量',
            actionDatabase: config.actionDatabase ? '✅' : '❌ ACTION_DATABASE_ID',
            targetDatabase: config.targetDatabase ? '✅' : '❌ TARGET_DATABASE_ID',
            notionClient: config.notionClient ? '✅' : '❌ NOTION_TOKEN'
          });
          return;
        }
        
        console.log('✅ 工作流配置完整');
        
        console.log('\n📊 获取工作流状态...');
        const status = await workflowManager.getWorkflowStatus();
        console.log('工作流状态:', status);
        
        if (status.statistics) {
          console.log('\n📈 卡片处理统计:');
          console.log(`   总卡片数: ${status.statistics.total}`);
          console.log(`   已处理: ${status.statistics.processed}`);
          console.log(`   待处理: ${status.statistics.pending}`);
          console.log(`   处理率: ${status.statistics.processingRate}%`);
        }
        
        if (status.statistics && status.statistics.pending > 0) {
          console.log('\n🚀 执行卡片处理工作流...');
          const result = await workflowManager.executeCardProcessingWorkflow();
          
          console.log('\n📋 工作流执行结果:');
          console.log(`   成功: ${result.success ? '✅' : '❌'}`);
          console.log(`   待处理卡片: ${result.pendingCards}`);
          console.log(`   行动任务创建: ${result.actionTaskCreated ? '✅' : '❌'}`);
          console.log(`   邮件发送: ${result.emailSent ? '✅' : '❌'}`);
          console.log(`   执行时间: ${result.duration}ms`);
          
          if (result.actionTask) {
            console.log('\n📝 行动任务信息:');
            console.log(`   标题: ${result.actionTask.title}`);
            console.log(`   链接: ${result.actionTask.url}`);
            console.log(`   页面ID: ${result.actionTask.pageId}`);
          }
          
          if (result.statistics) {
            console.log('\n📊 最新统计:');
            console.log(`   总卡片数: ${result.statistics.total}`);
            console.log(`   已处理: ${result.statistics.processed}`);
            console.log(`   待处理: ${result.statistics.pending}`);
            console.log(`   处理率: ${result.statistics.processingRate}%`);
          }
        } else {
          console.log('\n✨ 没有待处理的卡片，工作流无需执行');
        }
        
      } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('详细错误:', error);
      }
    }).catch(error => {
      console.error('❌ 导入 notion-client 失败:', error);
    });
    
  }).catch(error => {
    console.error('❌ 导入 workflow-manager 失败:', error);
  });
  
}).catch(error => {
  console.error('❌ 加载环境变量失败:', error);
});
