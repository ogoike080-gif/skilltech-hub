const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/communityController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/categories',             ctrl.listCategories);
router.get('/posts',                  optionalAuth, ctrl.listPosts);
router.get('/posts/:postId',          optionalAuth, ctrl.getPost);
router.post('/posts',                 protect, ctrl.createPost);
router.post('/posts/:postId/vote',    protect, ctrl.votePost);
router.post('/posts/:postId/reply',   protect, ctrl.replyPost);
router.delete('/posts/:postId',       protect, ctrl.deletePost);

module.exports = router;
