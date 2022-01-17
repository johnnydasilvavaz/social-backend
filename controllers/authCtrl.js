require('dotenv').config();
const cryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');

exports.signup = (req, res, next) => {
    if (!req.body.name) {
        return res.status(400).json({message: "Your name is empty !"})
    }
    if (!req.body.forname) {
        return res.status(400).json({message: "Your forname is empty !"})
    }
    if (!req.body.email) {
        return res.status(400).json({message: "Your email address is empty !"})
    }
    if (!req.body.password) {
        return res.status(400).json({message: "Your password is empty !"})
    }
    if (!validator.isAlphanumeric(validator.blacklist(req.body.name.toString(), "' -"))) {
        return res.status(400).json({message: "The name is incorrect !"})
    }
    if (!validator.isAlphanumeric(validator.blacklist(req.body.forname.toString(), "' -"))) {
        return res.status(400).json({message: "The forname is incorrect !"})
    }
    if (!validator.isStrongPassword(req.body.password)) {
        return res.status(400).json({message: "The password strengh is too low !"})
    }
    if (!validator.isEmail(req.body.email)) {
        return res.status(400).json({message: "The email address format is incorrect !"})
    }
    const sql = 'INSERT INTO users (id, name, forname, email, password) VALUES (?, ?, ?, ?, AES_ENCRYPT(?, UNHEX(?)));'
    const hash = cryptoJS.SHA256(req.body.password).toString(cryptoJS.enc.Hex);
    const uuid = uuidv4();
    
    db.query(sql, [uuid, req.body.name, req.body.forname, req.body.email, hash, process.env.MYSQL_ENCRYPT], (err, data, fields) => {
        if (err) return res.status(400).json({err});
        res.status(201).json({message: 'User created !'});
    });
}

exports.login = (req, res, next) => {
    if (!req.body.password || !req.body.email || !validator.isStrongPassword(req.body.password) || !validator.isEmail(req.body.email) ) {
        return res.status(400).json({message: "Wrong email or password !"})
    }
    const sql = 'SELECT AES_DECRYPT(password, UNHEX(?)) AS password, forname, name, avatar, id, email, role FROM users WHERE email=?;';
    db.query(sql, [process.env.MYSQL_ENCRYPT, req.body.email], (err, data, fields) => {
        if(err) return res.status(404).json({err});
        if (data[0] == null) return res.status(401).json({error: `Adresse email ou mot de passe incorrect !`});
        if (cryptoJS.SHA256(req.body.password).toString(cryptoJS.enc.Hex) == data[0].password) {
            res.status(200).json({
                user: {uid: data[0].id, forname: data[0].forname, name: data[0].name, avatar: data[0].avatar, email: data[0].email, role: data[0].role},
                token: jwt.sign(
                    {userId: data[0].id},
                    process.env.TOKEN_SECRET,
                    {expiresIn: '24h'}
                )
            });
        } else {
            return res.status(401).json({error: 'Adresse email ou mot de passe incorrect !'});
        }
    });
}