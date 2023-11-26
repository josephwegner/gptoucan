const { start } = require('repl')
const gpt = require('../lib/gpt.js')
const { getNickname } = require('../lib/util.js')

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

  const threadId = (/\|\|TID-(thread_[A-Za-z0-9]+)\|\|\n\n/gm).exec(starterMessage.content)[1]

  const cleanContent = message.cleanContent.replace(`@${message.client.user.username}`, 'Great Proud Toucan')
  const nick = await getNickname(message.guild, message.author)
  let chatMessages
  try {
    chatMessages = await gpt.addToThread(threadId, `${nick}: ${cleanContent}`)
  } catch (e) {
    console.log('error', e, e.stack)
    message.channel.send(e.message)
    return
  }

  try {
    chatMessages.forEach(chatMessage => {
      chatMessage.content.forEach(content => {
        switch (content.type) {
          case 'text':
            message.channel.send(content.text.value)
            break
    
          case 'image':
            message.channel.send('We got an image response, but I dunno wtf to do about that. Check the logs')
            console.log(JSON.stringify(content))
            break
    
          default:
            message.channel.send('Unexpected response. Check the logs')
            console.log(content.type, JSON.stringify(content))
            break
        }
      })
    })
  } catch(e) {
    console.log('error', e, e.stack)
    threadPromise.then(thread => {
      thread.send('Error interacting with the GPT. See logs')
    })
  }
}
