module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/turnos/reservar',
      handler: 'turno.reserve',
      config: {
        auth: {
          strategy: 'jwt',
        },
      },
    },
    {
      method: 'POST',
      path: '/turnos/webhook',
      handler: 'turno.webhook',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/turnos/disponibles',
      handler: 'turno.disponibles',
      config: {
        auth: false,
      },
    },
  ],
};
