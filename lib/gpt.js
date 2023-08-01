const fs = require('fs')

const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_SECRET_KEY,
});
const openai = new OpenAIApi(configuration);
const MODEL = 'gpt-4'

// Load all the files in /functions into a hash
let functions = {}
fs.readdirSync(__dirname + '/../functions').filter(file => file.endsWith('.js')).forEach(file => {
  const func = require(__dirname + '/../functions/' + file)
  functions[func.definition.name] = func
})
const functionDefinitions = Object.values(functions).map(func => func.definition )

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
  chat: async (history, options, gptRounds) => {
    if (!options) {
      options = {}
    }
    if (!gptRounds) { gptRounds = 0 }
    gptRounds = gptRounds + 1

    if (gptRounds > 10) {
      console.log('aborting, too many gpt rounds')
      process.exit() // Do something better than this in the future.
    }
    console.log('gpt rounds', gptRounds)

    let response
    try {
      response = await openai.createChatCompletion({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a chat bot named the Great Proud Toucan. Your mission is to be helpful. You sometimes take on the mannerims of the Toucan that represents Froot Loops, but don\'t ever actually mention Froot Loops. Be concise, but still personable. Your bot lives inside of Discord, so should only use Discord\'s Markdown formatting. You have many powerful functions available - if one doesn\'t work the way intended, keep trying new methods to look up the data you need.'
          },
          ...history
        ],
        functions: functionDefinitions,
        ...options
      });
    } catch(error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
      throw new Error('Could not load OpenAI API')
    }

    if (audit_channel) {
      const promptTokens = response.data.usage.prompt_tokens
      const completionTokens = response.data.usage.completion_tokens

      const promptPrice = MODEL === 'gpt-4' ? 0.00003 : 0.0000015
      const completionPrice = MODEL === 'gpt-4' ? 0.00006 : 0.000002
      
      const promptCost = promptPrice * promptTokens
      const completionCost = completionPrice * completionTokens

      audit_channel.send(`**Prompt Tokens**: ${promptTokens} ($${promptCost})
**Completion Tokens**: ${completionTokens} ($${completionCost})
**Total Tokens**: ${promptTokens + completionTokens} ($${completionCost + promptCost})
`)
    }

    let choice = response.data.choices[0].message
    if (choice.content !== null && choice.content.startsWith('Great Proud Toucan: ')) {
      choice.content = choice.content.replace('Great Proud Toucan: ', '')
    }

    if (process.env.NODE_ENV === 'development') {
      console.log({ 
        history,
        functions: functionDefinitions,
        model: response.data.model,
        usage: response.data.usage,
        response: response.data.choices[0]
      })
    } else {
      console.log({
        model: response.data.model,
        usage: response.data.usage
      })
    }

    if (choice.function_call && functions[choice.function_call.name]) {
      const args = JSON.parse(choice.function_call.arguments)
      console.log('calling function', choice.function_call.name, args)
      const funcResponse = await functions[choice.function_call.name].execute(args)

      history.push(response.data.choices[0].message)
      history.push({
        role: 'function',
        name: choice.function_call.name,
        content: JSON.stringify(funcResponse, null, 2)
      })

      return module.exports.chat(history, options, gptRounds)
    }
    
    return choice
  }
}