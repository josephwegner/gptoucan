const { start } = require('repl')
const gpt = require('../lib/gpt.js')
const discord = require('../lib/discord.js')

module.exports = async (message) => {
  message.channel.sendTyping()
  const allMessages = await message.channel.messages.fetch()
  const starterMessage = allMessages.reverse().find(message => {
    return message.content.indexOf('||TID-') >= 0
  })

  if (!starterMessage) {
    message.channel.send('Could not find AI thread. Sorry. This thread is probably dead, unless you report a bug!')
    return
  }

  console.log(message)

  const threadId = (/\|\|TID-(thread_[A-Za-z0-9]+)\|\|\n\n/gm).exec(starterMessage.content)[1]

  let chatMessages
  try {
    chatMessages = await gpt.addToThread(threadId, await discord.formatMessageForGPT(message))
  } catch (e) {
    console.log('error', e, e.stack)
    message.channel.send(e.message)
    return
  }

  try {
    await discord.postChatResponse(message.channel, chatMessages)
  } catch(e) {
    console.log('error', e, e.stack)
  }
}
