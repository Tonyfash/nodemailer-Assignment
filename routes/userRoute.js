const { register, getOneUser, verifyUser, deleteUser, login, home, update, forgotPassword, changePassword } = require('../controller/userController');
const uploads = require('../middleware/multer');

const router = require('express').Router();

router.post('/register', uploads.single('profilePicture'), register);
router.get('/:id', getOneUser);
router.get('/verify/:id', verifyUser);
router.put('/user/:id', update)
router.post('/login', login);
router.get('/', home);
router.post('/password', forgotPassword);
router.get('/reset/:id', changePassword)
router.delete('/user/:id', deleteUser);

module.exports = router;