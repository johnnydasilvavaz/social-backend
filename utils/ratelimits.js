const rateLimiter = require('express-rate-limit');

const signupLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Trop de comptes créés depuis cette adresse IP, merci de réessayer dans une heure.'
});

const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Vous êtes limité à 20 connexions toutes les 15min, par adresse IP."
});

const postsLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Merci de patienter un peu avant de poster un nouveau message..."
});

module.exports = {
    signupLimiter,
    loginLimiter,
    postsLimiter
}