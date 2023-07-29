
const fs = require('node:fs');
const path = require('node:path');
const { Configuration, OpenAIApi } = require('openai');

// Check if the environment is "development"
const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';

// If it's in development, load environment variables from .env
if (isDevelopment) {
  require('dotenv').config();
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');

// Create a new client instance
const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
]});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
  
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${client.commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.DISCORD_SERVER_ID),
			{ body: client.commands.map(command => command.data )},
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error, JSON.stringify(error, null, 4));
	}
})();

client.on(Events.InteractionCreate, async interaction => {
  console.log('interaction', Interaction)
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.on(Events.MessageCreate, async message => {
  if (!message.channel.isThread()) return;
  if (!message.mentions.has(message.client.user)) return;
  console.log('processing message...')

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

  console.log(chats)

  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: chats,
  });

  message.channel.send(chatCompletion.data.choices[0].message)
})

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);