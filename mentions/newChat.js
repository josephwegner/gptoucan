const { SlashCommandBuilder } = require('discord.js');
const gpt = require('../lib/gpt.js')

module.exports = async function(message) {
  const threadPromise = message.startThread({
    name: 'Toucan Chat',
    authArchiveDuration: 60
  })

  const chatCompletionPromise = gpt.chat([{role: "user", content: message.content }])

  const [thread, chatCompletion] = await Promise.all([threadPromise, chatCompletionPromise])

  thread.send(chatCompletion.data.choices[0].message)

  try {
    const response = await gpt.chat([
      {
        role: 'system',
        content: 'Provide a short few-word title for the following chat interaction. Do not wrap your response in quotes.'
      },
      {
        role: 'user',
        content: message.content,
      },
      {
        role: 'assistant',
        content: chatCompletion.data.choices[0].message.toString()
      }
    ], { max_tokens: 10 })

    thread.edit({ name: response.data.choices[0].message.content });
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  } 
}