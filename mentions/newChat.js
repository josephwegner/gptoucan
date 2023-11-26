const { SlashCommandBuilder } = require('discord.js');
const gpt = require('../lib/gpt.js')
const { getNickname } = require('../lib/util.js')

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

  let titleMessages = [
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
    let sentTID = false
    chatMessages.forEach(chatMessage => {
      chatMessage.content.forEach(content => {
        switch (content.type) {
          case 'text':
            if (sentTID) {
              thread.send(content.text.value)
            } else {
              thread.send(`||TID-${chatMessage.thread_id}||\n\n${content.text.value}`)
              sentTID = true
            }

            titleMessages.push({
              role: 'assistant',
              content: content.text.value
            })
            break
    
          case 'image':
            thread.send('We got an image response, but I dunno wtf to do about that. Check the logs')
            console.log(JSON.stringify(content))
            break
    
          default:
            thread.send('Unexpected response. Check the logs')
            console.log(content.type, JSON.stringify(content))
            break
        }
      })
    })
  
    try {
      gpt.chat(titleMessages, message, { max_tokens: 10 }).then(response => {
        console.log(response.content)
        thread.edit({ name: response.content })
      })
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
    }
  } catch(e) {
    console.log('error', e, e.stack)
    threadPromise.then(thread => {
      thread.send('Error interacting with the GPT. See logs')
    })
  }
}