'use strict';

/**
 * otp-code service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::otp-code.otp-code');
