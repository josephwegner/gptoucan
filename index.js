// Check if the environment is "development"
const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';

// If it's in development, load environment variables from .env
if (isDevelopment) {
  require('dotenv').config();
}

const fs = require('node:fs');
const path = require('node:path');
const { Configuration, OpenAIApi } = require('openai');
const followup = require('./mentions/followup.js')
const newChat = require('./mentions/newChat.js')

const configuration = new Configuration({
  apiKey: process.env.OPENAI_SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

const { Client, Events, GatewayIntentBits } = require('discord.js');

// Create a new client instance
const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
]});

client.on(Events.MessageCreate, async message => {
  if (!message.mentions.has(message.client.user)) return;
  if (message.channel.isThread()) {
    if (message.client.user.id === message.channel.ownerId) {
      followup(message);
    } else {
      console.log('Mentioned in a thread Toucan did not create. Aborting', message)
      message.reply('Ooh! Sorry! I can\'t chat in threads I didn\'t create!')
    }
  } else {
    newChat(message);
  }
})

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Chat Client Ready! Logged in as ${c.user.tag}`);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);