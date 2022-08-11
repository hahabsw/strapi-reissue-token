"use strict";

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */
const _ = require("lodash");

module.exports = function() { 

  const generateRefreshToken = async (user) => {  
    const jwtService = strapi.service(`plugin::users-permissions.jwt`);
    const userData = await strapi.query('plugin::users-permissions.user').findOne({ where: {id: user.id } });
    
    const tokenVersion = userData.tokenVersion || 0;
    return jwtService.issue(
      {
        tkv: tokenVersion, // Token Version
      },
      {
        subject: user.id.toString(),
        expiresIn: "30d",
      }
    );
  }

  return ({
    async refreshToken(ctx) {
      const params = _.assign(ctx.request.body);
      const jwtService = strapi.service(`plugin::users-permissions.jwt`);

      try {
        const {tkv, iat, exp, sub} = await jwtService.verify(params.token);

        if (Date.now() / 1000 > exp)
          return ctx.badRequest(null, "Expired refresh token");

        const user = await strapi
          .query('plugin::users-permissions.user')
          .findOne({ where: {id: sub }});

        const userTokenVersion = user.tokenVersion || 0;

        if (tkv !== (userTokenVersion)) return ctx.badRequest(null, "Refresh token is invalid");

        if(params.renew) {
          await strapi
            .query('plugin::users-permissions.user')
            .update({ where: { id: sub }, data: { tokenVersion: (userTokenVersion) + 1} });
        }

        ctx.send({
          jwt: jwtService.issue({
            id: user.id,
          }),
          refresh: params.renew ? await generateRefreshToken(user) : null
        });
      } catch (e) {
        return ctx.badRequest(null, "Refresh token is invalid");
      }
    },

    async callback(ctx) {
      ctx.query.populate = "author";
      await super.callback(ctx);
      await strapi
        .query('plugin::users-permissions.user')
        .update({ where: { id: ctx.response.body.user.id }, data: { tokenVersion: 1} });
      ctx.response.body.refresh = await generateRefreshToken(ctx.response.body.user);
      
      return ctx;
    },

    async resetPassword(ctx) {
      await super.resetPassword(ctx);
      ctx.response.body.refresh = await generateRefreshToken(ctx.response.body.user);
      return ctx;
    },

    async register(ctx) {
      await super.register(ctx);
      ctx.response.body.refresh = await generateRefreshToken(ctx.response.body.user);
      return ctx;
    },

  })
};