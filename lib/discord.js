const stream = require('stream');
const gpt = require('./gpt.js')

module.exports = {
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
  }
}