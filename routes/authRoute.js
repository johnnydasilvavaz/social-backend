const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authCtrl');
const rateLimiter = require('express-rate-limit');

const signupLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Trop de comptes créés depuis cette adresse IP.'
})

const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Trop de connexions depuis cette adresse IP."
})

router.post('/signup', signupLimiter, authCtrl.signup);
router.post('/login', loginLimiter, authCtrl.login);

module.exports = router;