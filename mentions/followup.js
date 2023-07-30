const gpt = require('../lib/gpt.js')

module.exports = async (message) => {
  const allMessagesPromise = message.channel.messages.fetch()
  const firstMessagePromise = message.channel.fetchStarterMessage()
  const allMessages = await Promise.all([allMessagesPromise, firstMessagePromise]).then(function([messages, firstMessage]) {
    let merged = Array.from(messages.values())
    merged.push(firstMessage)
    return merged
  })

  const chatCompletion = await gpt.chat(parseChat(allMessages.reverse()))
  message.channel.send(chatCompletion.data.choices[0].message)
}

function parseChat(messages) {
  let chats = []
  messages.forEach(message => {
    if(message.system) return
    
    if(message.author.equals(message.client.user) && !message.system) {
      chats.push({
        role: 'assistant',
        content: 'Great Proud Toucan: ' + message.cleanContent
      })
    } else if(message.mentions.has(message.client.user)) {
      chats.push({
        role: 'user',
        content: message.author.username + ': ' + message.cleanContent.replace(`@${message.client.user.username}`, 'Great Proud Toucan')
      })
    }
  })

  return chats
}