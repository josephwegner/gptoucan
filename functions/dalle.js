const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });

module.exports = {
  definition: {
    name: 'dalle',
    description: 'Generate an image using DALL-E',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt to pass to DALL-E URL to load'
        }
      }
    }
  },
  execute: async function(args) {
    console.log('executing dalle', args)
    const image = await openai.images.generate({
      model: 'dall-e-3',
      prompt: args.prompt
    })
    
    console.log(image)
    return image.data[0].url
  }
}