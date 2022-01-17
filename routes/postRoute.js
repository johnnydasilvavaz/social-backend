const express = require('express');
const router = express.Router();
const postCtrl = require('../controllers/postCtrl');
const auth = require('../middlewares/auth');
const multer = require('../middlewares/multer-config');

router.get('/:id', auth, postCtrl.getOnePost);
router.get('/', auth, postCtrl.getAllPosts);
router.post('/', auth, multer, postCtrl.createPost);
router.delete('/:id', auth, postCtrl.deletePost);
router.post('/:id/like', auth, postCtrl.likePost);
router.post('/comments/:id', auth, postCtrl.createComment);
router.get('/comments/:id', auth, postCtrl.getComments);
router.delete('/comments/:id', auth, postCtrl.deleteComment);

module.exports = router;