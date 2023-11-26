const axios = require('axios');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

module.exports = {
  definition: {
    name: 'scheduleTask',
    description: 'Schedule a future task for the Great Proud Toucan to complete. Provide natural-language instructions for the task, which will be read by the Toucan. Note that the toucan will have access to all of the same functions as normal, aside from the ability to schedule additional tasks. The scheduled task will also have the ability to send messages directly to Discord. A scheduled task can not result in a second scheduled task. When scheduling a repeating task, make sure to provide instructions in the description, on when that task should stop repeating. Be very explicit about the task, including instructions to inform the user.',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'A natural-language set of instructions on how to complete the task'
        },
        runAt: {
          type: 'string',
          format: 'date-time',
          description: 'The timestamp of when the next run of this task should occur'
        },
        repeat: {
          type: 'string',
          format: 'How often this scheduled task should be repeated',
          enum: ['hourly', 'daily', 'weekly', 'monthly', 'never']
        }
      }
    }
  },
  execute: async function(args, discordMessage) {
    args.runAt = new Date(args.runAt)
    console.log('scheduling task', args)

    const channel = discordMessage.hasThread ? discordMessage.thread : discordMessage.channel
    const createButton = new ButtonBuilder()
      .setCustomId('create')
      .setLabel('Schedule Task')
      .setStyle(ButtonStyle.Primary)
    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)

    const actions = new ActionRowBuilder()
      .addComponents(createButton, cancelButton)

    const confirmation = await channel.send({
      content: `The Great Proud Toucan would like to schedule a task based off of this message: ${discordMessage.url}. Please confirm this action is safe and appropriate.
        
**Task:** ${args.task}
**Run At:** ${args.runAt}
**Repeat:** ${args.repeat}`,
      components: [actions]
    })

    try {
      const buttonAction = await confirmation.awaitMessageComponent({ time: 60000 });
      if (buttonAction.customId === 'cancel') {
        confirmation.edit({ content: 'Confirmation not provided. Canceling', components: []})
        return 'Task has been canceled, do not attempt to recreate. Abort this interaction entirely.'
      } else {
        confirmation.edit({ content: `${confirmation.content}\n\n**Confirmed!**`, components: []})
        return `Task has been scheduled. Next run at ${args.runAt}.`
      }
    } catch (e) {
      console.log(e)
      confirmation.edit({ content: 'Confirmation not provided for scheduled task. Canceling', components: []})
      return 'Task has been canceled, do not attempt to recreate. Abort this interaction entirely.'
    }
  }
}