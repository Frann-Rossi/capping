'use strict';

/**
 * configuracion service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::configuracion.configuracion');
