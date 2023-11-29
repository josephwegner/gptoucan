const stream = require('stream');
const gpt = require('./gpt.js')

module.exports = {
  async getNickname(server, user) {
    const member = await server.members.fetch(user.id)
    if (member) return member.nickname || member.username

    return null
  },

  postChatResponse: async (channel, chatMessages, sentTID) => {
    sentTID = !sentTID
    chatMessages.forEach(chatMessage => {
      chatMessage.content.forEach(async (content) => {
        switch (content.type) {
          case 'text':
            if (sentTID) {
              channel.send(content.text.value)
            } else {
              channel.send(`||TID-${chatMessage.thread_id}||\n\n${content.text.value}`)
              sentTID = true
            }
            break
    
          case 'image_file':
            const image = await gpt.getFile(content.image_file.file_id)
            const passThrough = new stream.PassThrough();
            image.body.pipe(passThrough);

            // Send the image in a Discord message
            channel.send({
              files: [{
                attachment: passThrough,
                name: 'image.png'
              }]
            });
            break
    
          default:
            channel.send('Unexpected response. Check the logs')
            console.log(content.type, JSON.stringify(content))
            break
        }
      })
    })
  },

  async formatMessageForGPT(message) {
    let cleanContent = message.cleanContent.replace(`@${message.client.user.username}`, 'Great Proud Toucan')
    const nick = await module.exports.getNickname(message.guild, message.author)

    if (message.attachments.size) {
      console.log(message.attachments)
      cleanContent += '\n\nAttachments\n==========='

      message.attachments.forEach(attachment => {
        cleanContent += `
Filename: ${attachment.name}
URL: ${attachment.proxyURL}
Content Type: ${attachment.contentType}
Description: ${attachment.description}`
      })
    }

    return `${nick}: ${cleanContent}`
  }
}