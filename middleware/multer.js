const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, './images')
    },

    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
        const ext = file.mimetype.split('/')[1];
        cb(null, `IMG_${uniqueSuffix}.${ext}`)
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')){
        cb(null, true)
    } else {
        cb(new Error('invalid file format: image only'))
    }
}

const limits = {
    fileSize: 1024 * 1024 * 10
}

const uploads = multer({
    storage,
    fileFilter,
    limits
})

module.exports = uploads;