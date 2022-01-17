const express = require('express');
const router = express.Router();
const meCtrl = require('../controllers/meCtrl');
const auth = require('../middlewares/auth');
const multer = require('../middlewares/multer-config');

router.get('/:id', auth, meCtrl.getProfile);
router.put('/', auth, multer, meCtrl.modify);
router.delete('/', auth, meCtrl.delete);
router.get('/posts/:id', auth, meCtrl.getPosts);

module.exports = router;