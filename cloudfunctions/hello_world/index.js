exports.main = async (event, context) => {
  return {
    code: 0,
    message: 'Hello World',
    data: {
      source: 'cloudfunction',
      timestamp: Date.now()
    }
  }
} 