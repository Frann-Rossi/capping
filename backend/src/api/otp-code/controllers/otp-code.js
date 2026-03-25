'use strict';

/**
 * otp-code controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');

module.exports = createCoreController('api::otp-code.otp-code', ({ strapi }) => ({
  async send(ctx) {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('Email is required');
    }

    // Check if user exists, if not create one
    let user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email },
    });

    if (!user) {
      user = await strapi.service('plugin::users-permissions.user').add({
        username: email,
        email,
        password: crypto.randomBytes(20).toString('hex'), // Dummy password for passwordless
        confirmed: true,
        blocked: false,
        role: 1, // Default authenticated role
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date();
    expires_at.setMinutes(expires_at.getMinutes() + 5); // 5 mins expiry

    // Save OTP
    await strapi.db.query('api::otp-code.otp-code').create({
      data: {
        email,
        code,
        expires_at,
      },
    });

    // Send Email (Mocking for now, user should configure email plugin)
    // strapi.plugins['email'].services.email.send(...)
    console.log(`OTP for ${email}: ${code}`);

    return ctx.send({ message: 'OTP sent successfully', email });
  },

  async verify(ctx) {
    const { email, code } = ctx.request.body;

    if (!email || !code) {
      return ctx.badRequest('Email and code are required');
    }

    const otpRecord = await strapi.db.query('api::otp-code.otp-code').findOne({
      where: {
        email,
        code,
        expires_at: { $gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return ctx.badRequest('Invalid or expired code');
    }

    // Get user
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email },
    });

    // Issue JWT
    const jwt = strapi.plugins['users-permissions'].services.jwt.issue({
      id: user.id,
    });

    // Delete used OTP
    await strapi.db.query('api::otp-code.otp-code').delete({
      where: { id: otpRecord.id },
    });

    return ctx.send({
      jwt,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  },
}));
