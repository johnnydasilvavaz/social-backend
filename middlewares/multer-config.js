const multer = require('multer');

const MIME_TYPES = {
    'image/jpg': 'jpg',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif'
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'images')
    },
    filename: (req, file, callback) => {
        let name = file.originalname.split(' ').join('_');
        name = name.split('.')[0];
        const extension = MIME_TYPES[file.mimetype];
        callback(null, name + '_' + Date.now() + '.' + extension);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, callback) => {
        if (!MIME_TYPES[file.mimetype]) {
            callback(null, false);
            return new Error({error:'Format de fichier non autorisé'});
        } else {
            callback(null, true);
        }
    }
});

module.exports = upload.single('image');