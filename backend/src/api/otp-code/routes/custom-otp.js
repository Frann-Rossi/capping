module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/otp-code/send',
      handler: 'otp-code.send',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/otp-code/verify',
      handler: 'otp-code.verify',
      config: {
        auth: false,
      },
    },
  ],
};
