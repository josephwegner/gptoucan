const { SlashCommandBuilder } = require('discord.js');
const gpt = require('../lib/gpt.js')
const discord = require('../lib/discord.js')

module.exports = async function(message) {
  const threadPromise = message.startThread({
    name: 'Toucan Chat',
    autoArchiveDuration: 60
  }).then(thread => {
    thread.sendTyping()
    return thread
  })


  let messagesPromise
  const content = await discord.formatMessageForGPT(message)
  messagesPromise = gpt.startThread(content)

  const titleMessages = [
    {
      role: 'system',
      content: 'Provide a short few-word title for the following chat interaction. Do not wrap the title in quotes.'
    },
    {
      role: 'user',
      content: content,
    }
  ]

  try {
    const [thread, chatMessages] = await Promise.all([threadPromise, messagesPromise])
    gpt.chat(titleMessages, message, { max_tokens: 10 }).then(response => {
      thread.edit({ name: response.content })
    })
    await discord.postChatResponse(thread, chatMessages, true)
  } catch(e) {
    console.log('error', e, e.stack)
    threadPromise.then(thread => {
      thread.send('Error interacting with the GPT. See logs')
    })
  }
}