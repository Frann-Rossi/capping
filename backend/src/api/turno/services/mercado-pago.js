'use strict';

const { MercadoPagoConfig, Preference } = require('mercadopago');

module.exports = ({ strapi }) => ({
  async createPreference(turno, monto, email) {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const preference = new Preference(client);

    const body = {
      items: [
        {
          id: turno.id.toString(),
          title: `Reserva de Turno - ${turno.fecha_hora}`,
          quantity: 1,
          unit_price: Number(monto),
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: email,
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/reserva/confirmada`,
        failure: `${process.env.FRONTEND_URL}/reserva/error`,
        pending: `${process.env.FRONTEND_URL}/reserva/pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/api/turnos/webhook`,
      external_reference: turno.id.toString(),
    };

    try {
      const response = await preference.create({ body });
      return response;
    } catch (error) {
      console.error('Error creating MP preference:', error);
      throw error;
    }
  },

  async handleWebhook(data) {
    // MP sends 'type' and 'data.id'
    if (data.type === 'payment') {
      const paymentId = data.data.id;
      
      // Fetch payment details from MP
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      });
      const payment = await response.json();

      if (payment.status === 'approved') {
        const turnoId = payment.external_reference;
        
        await strapi.db.query('api::turno.turno').update({
          where: { id: turnoId },
          data: {
            estado: 'confirmado',
            payment_id: paymentId.toString(),
          },
        });
        
        console.log(`Turno ${turnoId} confirmado via Webhook`);
      }
    }
  }
});
