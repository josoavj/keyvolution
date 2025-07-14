module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/musiques/:id/transcribe',
      handler: 'transcriber.transcribe',
      config: {
        policies: [],
        auth: false, // ou true si protégé
      },
    },
  ],
};
