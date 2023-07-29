const gpt = require('../lib/gpt.js')

module.exports = async (message) => {
  const allMessages = await message.channel.messages.fetch()
  let chats = []
  allMessages.reverse().forEach(message => {
    if(message.author.equals(message.client.user) && !message.system) {
      chats.push({
        role: 'assistant',
        content: message.content
      })
    } else if(message.mentions.has(message.client.user)) {
      chats.push({
        role: 'user',
        content: message.content.replace(`<@${message.client.user.id}>`, '')
      })
    }
  })

  const chatCompletion = await gpt.chat(chats)
  message.channel.send(chatCompletion.data.choices[0].message)
}