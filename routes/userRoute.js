const { register, getOneUser, verifyUser } = require('../controller/userController');
const uploads = require('../middleware/multer');

const router = require('express').Router();

router.post('/register', uploads.single('profilePicture'), register);
router.get('/:id', getOneUser);
router.get('/verify/:id', verifyUser);

module.exports = router;