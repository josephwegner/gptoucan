const gpt = require('../lib/gpt.js')
const { getNickname } = require('../lib/util.js')

module.exports = async (message) => {
  message.channel.sendTyping()
  const allMessagesPromise = message.channel.messages.fetch()
  const firstMessagePromise = message.channel.fetchStarterMessage()
  const allMessages = await Promise.all([allMessagesPromise, firstMessagePromise]).then(function([messages, firstMessage]) {
    let merged = Array.from(messages.values())
    merged.push(firstMessage)
    return merged
  })

  const history = await parseChat(allMessages.reverse())
  const chatCompletion = await gpt.chat(history)
  message.channel.send(chatCompletion.data.choices[0].message)
}

async function parseChat(messages) {
  let chats = []
  for (const message of messages) {
    if(message.system) continue
    
    if(message.author.equals(message.client.user) && !message.system) {
      chats.push({
        role: 'assistant',
        content: 'Great Proud Toucan: ' + message.cleanContent
      })
    } else if(message.mentions.has(message.client.user)) {
      const nick = await getNickname(message.guild, message.author)
      chats.push({
        role: 'user',
        content: nick + ': ' + message.cleanContent.replace(`@${message.client.user.username}`, 'Great Proud Toucan')
      })
    }
  }

  return chats
}