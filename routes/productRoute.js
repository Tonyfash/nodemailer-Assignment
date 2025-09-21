const { products, update, getProducts } = require('../controller/productController');
const uploads = require('../middleware/multer');

const router = require('express').Router();

router.post('/products', uploads.array('productImages', 5), products);
router.put('/products/:id', uploads.array('productImages', 5), update);
router.get('/get/product', getProducts);


module.exports = router;