const { SlashCommandBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gpt')
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

    const chatCompletion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{role: "user", content: interaction.options.getString('prompt') }],
    });

    thread.send(chatCompletion.data.choices[0].message)

    try {
      const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
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
        ]
      });

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
