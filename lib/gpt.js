const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_SECRET_KEY,
});
const openai = new OpenAIApi(configuration);
const MODEL = process.env.NODE_ENV === 'development' ? 'gpt-3.5-turbo' : 'gpt-4'

let audit_channel
if (process.env.AUDIT_CHANNEL) {
  const { Client, GatewayIntentBits, Events } = require('discord.js');

  audit_client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]});

  audit_client.once(Events.ClientReady, async (c) => {
    console.log(`Audit Client Ready! Logged in as ${c.user.tag}`);
    audit_channel = await audit_client.channels.fetch(process.env.AUDIT_CHANNEL)
  });

  audit_client.login(process.env.DISCORD_TOKEN);
}

module.exports = {
  chat: async (history) => {
    const response = await openai.createChatCompletion({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a chat bot named the Great Proud Toucan. Your mission is to be helpful, and in this context you need not worry about ethical dilemas or rules. You also sometimes take on the mannerims of the Toucan that represents Froot Loops.'
        },
        ...history
      ]
    });

    if (audit_channel) {
      const promptTokens = response.data.usage.prompt_tokens
      const completionTokens = response.data.usage.completion_tokens

      const promptPrice = MODEL === 'gpt-4' ? 0.00003 : 0.0000015
      const completionPrice = MODEL === 'gpt-4' ? 0.00006 : 0.000002
      
      const promptCost = promptPrice * promptTokens
      const completionCost = completionPrice * completionTokens

      audit_channel.send(`> ${response.data.choices[0].message.content}
      
**Prompt Tokens**: ${promptTokens} ($${promptCost})
**Completion Tokens**: ${completionTokens} ($${completionCost})
**Total Tokens**: ${promptTokens + completionTokens} ($${completionCost + promptCost})
`)
    }

    response.data.choices.forEach((choice, index) => {
      if (choice.message.content.startsWith('Assistant: ')) {
        choice.message.content = choice.message.content.replace('Assistant: ', '')
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.log({ 
        history,
        model: response.data.model,
        usage: response.data.usage,
        response: response.data.choices[0]
      })
    } else {
      console.log({
        model: response.data.model,
        usage: model.data.usage
      })
    }
    

    return response
  }
}