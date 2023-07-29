const gpt = require('../lib/gpt.js')

module.exports = async (message) => {
  const allMessages = await message.channel.messages.fetch()
  

  const chatCompletion = await gpt.chat(parseChat(allMessages.reverse()))
  message.channel.send(chatCompletion.data.choices[0].message)
}

function parseChat(messages) {
  let chats = []
  messages.forEach(message => {
    if(message.author.equals(message.client.user) && !message.system) {
      chats.push({
        role: 'assistant',
        content: message.content
      })
    } else if(message.mentions.has(message.client.user)) {
      chats.push({
        role: 'user',
        content: message.content.replace(`<@${message.client.user.id}>`, ''),
        name: message.author.username
      })
      console.log(message.author.username)
    }
  })

  return chats
}