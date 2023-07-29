const { SlashCommandBuilder } = require('discord.js');
const gpt = require('../lib/gpt.js')

module.exports = {
	data: new SlashCommandBuilder()
		.setName(process.env.NODE_ENV === 'development' ? 'devtoucan' : 'gpt')
		.setDescription('Sends a prompt to GPT4')
    .addStringOption(option =>
			option
				.setName('prompt')
				.setDescription('GPT Prompt')
				.setRequired(true)),
	async execute(interaction) {
    interaction.reply("Got it! I'll create a thread");

    const rand = Math.floor(Math.random() * 100)
		const thread = await interaction.channel.threads.create({
      name: `Toucan loading...`,
      autoArchiveDuration: 60,
      reason: `Prompt: ${interaction.options.getString('prompt')}`,
    });
    
    thread.send(`The prompt was: \`\`\`${interaction.options.getString('prompt')}\`\`\``)

    const chatCompletion = await gpt.chat([{role: "user", content: interaction.options.getString('prompt') }])

    thread.send(chatCompletion.data.choices[0].message)

    try {
      const response = await gpt.chat([
        {
          role: 'system',
          content: 'Provide a short few-word title for the following chat interaction. Do not wrap your response in quotes.'
        },
        {
          role: 'user',
          content: interaction.options.getString('prompt'),
        },
        {
          role: 'assistant',
          content: chatCompletion.data.choices[0].message.toString()
        }
      ])

      console.log(response.data.choices[0].message)

      thread.edit({ name: response.data.choices[0].message.content });
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
    } 
	},
};
