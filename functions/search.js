const axios = require('axios');

module.exports = {
  definition: {
    name: 'search',
    description: 'Search the web for links that match a particular query. Returns a list of URLs with names and snippets',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query'
        }
      }
    }
  },
  execute: async function(args) {
    const headers = { 'Ocp-Apim-Subscription-Key': process.env.AZURE_KEY };
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURI(args.query)}`;

    try {
      const response = await axios.get(url, { headers });
      const results = response.data.webPages.value.map(result => {
        return {
          name: result.name,
          url: result.url,
          snippet: result.snippet
        }
      })

      return results
    } catch (e) {
      console.log(e)
    }
  }
}