require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
        const userId = decodedToken.userId;
        const sql = 'SELECT id FROM users WHERE id=?;';
        db.query(sql, [userId], (err, data, fields) => {
            if (err) throw res.status(404).json({err});
            if (!(data.length > 0)) throw res.status(404).json({error: 'Accès non autorisé'});
            if (userId && data[0].id !== userId) {
                throw res.status(401).json({message: 'Requête non autorisée'});
            } else {
                req.params.userId = userId;
                next();
            }
        });
    } catch (error) {
        return res.status(401).json({ error });
    }
}