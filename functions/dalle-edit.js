const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });
const gpt = require('../lib/gpt.js')
const stream = require('stream');
const axios = require('axios')
const fs = require('fs');
const sharp = require('sharp')

module.exports = {
  definition: {
    name: 'dalle-edit',
    description: 'Edit an existing image using DALL-E',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt to pass to DALL-E URL to load'
        },
        source: {
          type: 'string',
          description: 'The URL for a web image, or a file ID for a OpenAI File'
        },
        type: {
          type: 'string',
          enum: ['openai', 'web'],
          description: "Where the file is hosted. Use `openai` if it is an OpenAI File, or `web` if it is hosted on the public internet"
        }
      }
    }
  },
  execute: async function(args) {
    console.log('executing dalle-edit', args)

    let readStream
    const tempFile = `temp-${Date.now()}`
    if (args.type === 'web') {
      const response = await axios({
        method: 'GET',
        url: args.source,
        responseType: 'arraybuffer'
      });

      await sharp(response.data)
      .ensureAlpha() 
      .toFile(tempFile);
    
      readStream = fs.createReadStream(tempFile);
    } else if (args.type === 'openai') {
      const image = await gpt.getFile(args.source)
      readStream = new stream.PassThrough()
      image.body.pipe(readStream)
    } else {
      throw new Error(`Received file of type ${args.type}, which is not a valid type.`)
    }

    const image = await openai.images.edit({
      image: readStream,
      prompt: args.prompt
    })

    fs.rm(tempFile)
    
    console.log(image)
    return image.data[0].url
  }
}