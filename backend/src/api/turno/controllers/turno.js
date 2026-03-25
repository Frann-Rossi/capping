'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::turno.turno', ({ strapi }) => ({
  async reserve(ctx) {
    const { fecha_hora, monto_tipo } = ctx.request.body; // monto_tipo: 'parcial' | 'total'
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to reserve');
    }

    // 1. Check if slot is available
    const existingTurno = await strapi.db.query('api::turno.turno').findOne({
      where: {
        fecha_hora,
        estado: { $in: ['pendiente_pago', 'confirmado'] },
        bloqueado_hasta: { $gt: new Date() },
      },
    });

    if (existingTurno) {
      return ctx.badRequest('Slot already reserved or pending payment');
    }

    // 2. Get price from config
    const config = await strapi.db.query('api::configuracion.configuracion').findOne();
    const total_price = config.precio_base;
    const monto_pago = monto_tipo === 'parcial' ? total_price / 2 : total_price;

    // 3. Create/Update Turno as pending
    const bloqueado_hasta = new Date();
    bloqueado_hasta.setMinutes(bloqueado_hasta.getMinutes() + 15); // Block for 15 mins

    const turno = await strapi.db.query('api::turno.turno').create({
      data: {
        fecha_hora,
        estado: 'pendiente_pago',
        usuario: user.id,
        monto_pago,
        total_price,
        bloqueado_hasta,
      },
    });

    // 4. Create MP Preference
    try {
      const mpService = strapi.service('api::turno.mercado-pago');
      const preference = await mpService.createPreference(turno, monto_pago, user.email);

      await strapi.db.query('api::turno.turno').update({
        where: { id: turno.id },
        data: { preference_id: preference.id },
      });

      return ctx.send({
        turno,
        checkout_url: preference.init_point,
      });
    } catch (error) {
      console.error(error);
      return ctx.internalServerError('Error creating payment preference');
    }
  },

  async webhook(ctx) {
    const { body } = ctx.request;
    console.log('MP Webhook received:', body);

    try {
      const mpService = strapi.service('api::turno.mercado-pago');
      await mpService.handleWebhook(body);
      return ctx.send({ status: 'ok' });
    } catch (error) {
      console.error('Webhook error:', error);
      return ctx.internalServerError();
    }
  },

  async disponibles(ctx) {
    // Logic to calculate available slots based on date
    const { fecha } = ctx.query; // e.g. 2024-03-25
    
    // For MVP, we return hardcoded slots or logic based on 30m intervals
    // In a real app, we check existing confirmados/pendientes
    const slots = [];
    const startTime = 9; // 9 AM
    const endTime = 18; // 6 PM
    
    for (let h = startTime; h < endTime; h++) {
      for (let m of [0, 30]) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const fecha_hora = `${fecha}T${time}:00.000Z`;
        
        // Check availability
        const occupied = await strapi.db.query('api::turno.turno').findOne({
          where: {
            fecha_hora,
            estado: { $in: ['pendiente_pago', 'confirmado'] },
            bloqueado_hasta: { $gt: new Date() },
          },
        });
        
        if (!occupied) {
          slots.push(fecha_hora);
        }
      }
    }
    
    return ctx.send({ slots });
  }
}));
