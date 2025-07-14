module.exports = {
  async afterCreate(event) {
    const { result } = event;
    strapi.log.info(`🎯 afterCreate déclenché pour musique ID: ${result.id}`);

    try {
      await strapi
        .controller('api::musique.transcriber')
        .transcribe({ params: { id: result.id }, send: () => {} });
    } catch (err) {
      strapi.log.error(`❌ Transcription automatique échouée : ${err.message}`);
    }
  },
};
