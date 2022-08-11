const authController = require('./controllers/auth');
const { createCoreController } = require('@strapi/strapi').factories;
const config = require('./config/refresh-token.json');

module.exports = async (plugin) => {

  plugin.controllers.auth = {
    ...plugin.controllers.auth,
    ...Object.setPrototypeOf(authController(), plugin.controllers.auth)
  };

  plugin.routes['content-api'].routes.push(...config.routes);
  
  return plugin;
};