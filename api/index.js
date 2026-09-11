const app = require('../server/index');
const { initPromise } = require('../server/index');

module.exports = async (req, res) => {
  if (initPromise) {
    try {
      await initPromise;
    } catch (e) {
      console.error('Database initialization warning in serverless function:', e);
    }
  }
  return app(req, res);
};
