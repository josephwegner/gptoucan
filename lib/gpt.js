const fs = require('fs')

const OpenAI = require('openai');
const ASSISTANT_ID = process.env.ASSISTANT_ID

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });
const MODEL = 'gpt-4'

// Load all the files in /functions into a hash
/* Disabling functions for now
let functions = {}
fs.readdirSync(__dirname + '/../functions').filter(file => file.endsWith('.js')).forEach(file => {
  const func = require(__dirname + '/../functions/' + file)
  functions[func.definition.name] = func
})
const functionDefinitions = Object.values(functions).map(func => func.definition )
*/

let audit_channel
if (process.env.AUDIT_CHANNEL) {
  const { Client, GatewayIntentBits, Events } = require('discord.js');

  audit_client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]});

  audit_client.once(Events.ClientReady, async (c) => {
    console.log(`Audit Client Ready! Logged in as ${c.user.tag}`);
    audit_channel = await audit_client.channels.fetch(process.env.AUDIT_CHANNEL)
  });

  audit_client.login(process.env.DISCORD_TOKEN);
}

module.exports = {
  startThread: async (message) => {
    const run =  await openai.beta.threads.createAndRun({
      assistant_id: ASSISTANT_ID,
      thread: {
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      }
    })

    return waitForRun(run)
  },

  addToThread: async (threadId, message) => {
    const gptMessage = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    })

    if (!gptMessage) {
      console.log(`Could not create message on thread id: ${thread_id}.`)
      throw new Error('GPT Message could not be created. Previous message will be discarded.');
    }

    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: ASSISTANT_ID })

    return waitForRun(run)
  },

  getFile: async (fileId) => {
    return await openai.files.content(fileId)
  },

  chat: async (history, discordMessage, options, gptRounds) => {
    if (!options) {
      options = {}
    }
    if (!gptRounds) { gptRounds = 0 }
    gptRounds = gptRounds + 1

    if (gptRounds > 10) {
      console.log('aborting, too many gpt rounds')
      process.exit() // Do something better than this in the future.
    }

    let response
    try {
      response = await openai.chat.completions.create({
        model: MODEL,
        messages: history,
        //functions: functionDefinitions,
        ...options
      });
    } catch(error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
      throw new Error('Could not load OpenAI API')
    }

    let choice = response.choices[0].message
    if (choice.content !== null && choice.content.startsWith('Great Proud Toucan: ')) {
      choice.content = choice.content.replace('Great Proud Toucan: ', '')
    }

    if (choice.function_call && functions[choice.function_call.name]) {
      const args = JSON.parse(choice.function_call.arguments)
      console.log('calling function', choice.function_call.name, args)
      const funcResponse = await functions[choice.function_call.name].execute(args, discordMessage)

      history.push(response.choices[0].message)
      history.push({
        role: 'function',
        name: choice.function_call.name,
        content: JSON.stringify(funcResponse, null, 2)
      })

      return module.exports.chat(history, discordMessage, options, gptRounds)
    }
    
    return choice
  }
}

const MAX_RETRIES = process.env.MAX_RUN_WAIT_RETRIES
const RETRY_WAIT = process.env.RUN_RETRY_DELAY
async function waitForRun(run, currentAttempt) {
  if (!currentAttempt) { currentAttempt = 1 }

  const updatedRun = await openai.beta.threads.runs.retrieve(run.thread_id, run.id)
  console.log(`Run ${updatedRun.id} Status: ${updatedRun.status}`)

  if (updatedRun.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(run.thread_id, {
      limit: 100
    })
    
    return messages.data.filter(message => {
      return message.created_at > run.created_at
    })
  } else if (updatedRun.status === 'cancelled' || updatedRun.status === 'failed' || updatedRun.status === 'expired') {
    throw new Error(`Run ${run.id} on thread ${run.thread_id} failed with status ${run.status}`)
  } else if (currentAttempt >= MAX_RETRIES) {
    throw new Error(`Run ${run.id} on thread ${run.thread_id} exceeded the maximum wait retries of ${MAX_RETRIES} at ${RETRY_WAIT}ms`)
  } else {
    return new Promise((resolve, reject) => {
      console.log(`Waiting ${RETRY_WAIT}ms to poll run ${run.id} from thread ${run.thread_id}. This is attempt ${currentAttempt} of ${MAX_RETRIES}.`)
      setTimeout(async () => {
        try {
          resolve(await waitForRun(run, currentAttempt + 1))
        } catch(e) {
          reject(e)
        }
      }, RETRY_WAIT)
    })
  }
}

// Toggle that boolean if you want to run a local test
if (true && process.env.NODE_ENV === 'development') {
  async function test() {
    const message = await openai.beta.threads.messages.retrieve('thread_DDgOVdm7xVgb7T5htLyoUsGV', 'msg_YedC408kiuGBHgTUoipUa7nD')

    console.log(message.content[1])
  }
  test()
}