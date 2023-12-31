const fs = require('fs')

const OpenAI = require('openai');
const ASSISTANT_ID = process.env.ASSISTANT_ID

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });
const MODEL = 'gpt-4'

// Load all the files in /functions into a hash
let functions = {}
fs.readdirSync(__dirname + '/../functions').filter(file => file.endsWith('.js')).forEach(file => {
  const func = require(__dirname + '/../functions/' + file)
  functions[func.definition.name] = func
})
delete functions.httpRequest
delete functions.scheduleTask
delete functions.search
const functionDefinitions = Object.values(functions).map(func => func.definition )

updateAssistant(openai)

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
  } else if (updatedRun.status === 'requires_action') {
    const toolCalls = updatedRun.required_action.submit_tool_outputs.tool_calls
    const toolOutputs = await Promise.all(toolCalls.map(async (call) => {
      if (!functions[call.function.name]) {
        throw new Error(`Attempted to call tool that doesn't exist: ${call.function.name}`)
      }

      const functionResponse = await functions[call.function.name].execute(JSON.parse(call.function.arguments))

      return {
        tool_call_id: call.id,
        output: functionResponse
      }
    }))

    await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
      tool_outputs: toolOutputs
    })

    console.log("Resetting run countdown now that we have finished steps")
    return await waitForRun(run, 1)
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

async function updateAssistant() {
  const currentAssistant = await openai.beta.assistants.retrieve(ASSISTANT_ID)

  let tools = functionDefinitions.map(definition => {
    return {
      type: 'function',
      function: definition
    }
  })
  tools.push({ type: 'code_interpreter' })
  openai.beta.assistants.update(currentAssistant.id, { tools } ).then(() => { console.log('Assistant updated') })
}

// Toggle that boolean if you want to run a local test
if (false && process.env.NODE_ENV === 'development') {
  async function test() {
    const obj = await openai.beta.threads.runs.retrieve('thread_fmCxtz7dZ3HCmDFnjYrSqzOM', 'run_j3DkZIGodRaWcICl6DjYcxmn')

    console.log(obj.status)
  }
  test()
}