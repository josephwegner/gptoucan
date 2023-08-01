const axios = require('axios');
const { JSDOM } = require('jsdom');
const striptags = require('striptags')

module.exports = {
  definition: {
    name: 'httpRequest',
    description: 'Read the contents of a live website. Keep in mind that not all websites are easily machine-parseable. If you get bad content back, or a URL is unable to load, try a different page. Where possible. choose to load websites that are likely machine-readable. If you can\'t answer a query, or look up the right data to answer, make sure to provide instructions to the user on how they can look it up themselves.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'The URL to load'
        }
      }
    }
  },
  execute: async function(args) {
    try {
      let response
      try {
        response = await axios.get(args.url);
      } catch(e) {
        console.log(e)
        return 'Could not load webpage'
      }
      const document = new JSDOM(response.data).window.document

      for(script of document.getElementsByTagName('script')) {
        document.body.innerHTML = document.body.innerHTML.replace(script.innerHTML, '')
      }

      return striptags(document.body.innerHTML.replace(/\s+/gm,' '))
    } catch (e) {
      console.log(e)
    }
  }
}