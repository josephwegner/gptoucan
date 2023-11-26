const { SlashCommandBuilder } = require('discord.js');
const gpt = require('../lib/gpt.js')
const { getNickname } = require('../lib/util.js')
const discord = require('../lib/discord.js')

module.exports = async function(message) {
  const threadPromise = message.startThread({
    name: 'Toucan Chat',
    autoArchiveDuration: 60
  }).then(thread => {
    thread.sendTyping()
    return thread
  })

  const cleanContent = message.cleanContent.replace(`@${message.client.user.username}`, 'Great Proud Toucan')
  const nick = await getNickname(message.guild, message.author)

  let messagesPromise
  messagesPromise = gpt.startThread(`${nick}: ${cleanContent}`)

  const titleMessages = [
    {
      role: 'system',
      content: 'Provide a short few-word title for the following chat interaction. Do not wrap the title in quotes.'
    },
    {
      role: 'user',
      content: cleanContent,
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