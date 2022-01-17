require('dotenv').config();
const cryptoJS = require('crypto-js');
const validator = require('validator');
const fs = require('fs');

exports.getProfile = (req, res, next) => {
    const sql = 'SELECT forname, name, avatar, id, email FROM users WHERE id=?;';
    db.query(sql, req.params.id, (err, data, fields) => {
        if (err) return res.status(404).json({err});
        return res.status(200).json(data);
    });
}

exports.getPosts = (req, res, next) => {
    //Select infos from posts and users with user id, ordered by date
    const sql = 'SELECT posts.id AS pid, posts.user_id AS puid, posts.date AS pdate, posts.text AS ptext, posts.imgUrl AS pimgUrl, posts.likes AS plikes, name AS pname, forname AS pforname, avatar AS pavatar FROM posts INNER JOIN users ON posts.user_id=users.id WHERE posts.user_id=? ORDER BY date DESC;';
    db.query(sql, req.params.id, (err, data, fields) => {
        if (err) return res.status(404).json({err});
        const posts = {...data};
        //Select infos from comments and users
        const sql2 = 'SELECT comments.*, name, forname, avatar FROM comments INNER JOIN users ON comments.user_id=users.id ORDER BY date DESC;';
        db.query(sql2, (err, data, fields) => {
            if (err) return res.status(404).json({err});
            const coms = {...data};
            if (!coms) {
                return res.status(200).json({...posts})
            } else {
                //search for post_id that user liked
                const sqlLiked = 'SELECT post_id FROM likes WHERE user_id=?;';
                db.query(sqlLiked, req.params.userId, (err, data, fields) => {
                    if (err) return res.status(404).json({err});
                    for (p in posts) {
                        if (data.length < 1) {
                            if (!posts[p].pliked) {
                                posts[p] = { ...posts[p], pliked: 0 };
                            }
                        } else {
                            for (l in data) {
                                if (data[l].post_id == posts[p].pid) {
                                    posts[p] = { ...posts[p], pliked: 1 };
                                } else {
                                    if (!posts[p].pliked) {
                                        posts[p] = { ...posts[p], pliked: 0 };
                                    }
                                }
                            }
                        }
                        //search for coms in each post and add the first one to the post object
                        let nbrComs = 0;
                        for (const c in coms) {
                            if (posts[p].pid == coms[c].post_id) {
                                nbrComs++;
                                posts[p] = {...posts[p], nbrComs: nbrComs}
                                if (!posts[p].com) {
                                    posts[p] = {...posts[p], com: {...coms[c]}};
                                }
                            }
                        }
                    }
                    return res.status(200).json({...posts});
                });
            }
        })
    });
}

exports.modify = (req, res, next) => {
    //Check if the fields are empty and with validator
    if ((req.body.name && !validator.isAlphanumeric(validator.blacklist(req.body.name.toString(), "' -"))) ||
    (req.body.forname && !validator.isAlphanumeric(validator.blacklist(req.body.forname.toString(), "' -")))) {
        if (req.file) {
            fs.unlink(`images/${req.file.filename}`, (error => {
                if (error) {
                    console.log(error);
                } else {
                    console.log("Image removed !");
                }
            }))
        }
        return res.status(400).json({message: "A field is empty or incorrect !"});
    };
    if (!req.body.name && !req.body.forname && !req.file) {
        return res.status(400).json({message: "A field is empty or incorrect !"});
    }

    let sqlParams = [];
    let sql = "UPDATE users SET ";
    if (req.body.name) {
        sql += "name=?";
        sqlParams.push(req.body.name);
    }
    if (req.body.name && (req.body.forname || req.file)) sql += ", ";
    if (req.body.forname) {
        sql += "forname=?";
        sqlParams.push(req.body.forname);
    }
    if (req.body.forname && req.file) sql += ", ";
    if (req.file) {
        const sqlImage = 'SELECT avatar FROM users WHERE id=?;'
        db.query(sqlImage, req.params.userId, (err, data, fields) => {
            if (err) return res.status(404).json({err});
            const filename = data[0].avatar.split('/images/')[1];
            if (filename != "avatar.png") {
                fs.unlink(`images/${filename}`, (error => {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("Image removed !");
                    }
                }));
            }
        })
        sql += "avatar=?";
        sqlParams.push(`${req.protocol}://${req.get('host')}/images/${req.file.filename}`);
    }
    sqlParams.push(req.params.userId);
    sql += " WHERE id=?;";

    db.query(sql, sqlParams, (err, data, fields) => {
        if(err) return res.status(400).json({err});
        const sql2 = 'SELECT forname, name, avatar, id, email FROM users WHERE id=?;';
        db.query(sql2, req.params.userId, (err, data, fields) => {
            if(err) return res.status(404).json({err});
            return res.status(200).json({
                message: "User updated !",
                user: {uid: data[0].id, forname: data[0].forname, name: data[0].name, avatar: data[0].avatar, email: data[0].email}
            });
        });
    });
}

exports.delete = (req, res, next) => {
    const password = cryptoJS.SHA256(req.body.password).toString(cryptoJS.enc.Hex);
    const sqlPass = 'SELECT * FROM users WHERE id=? AND password=AES_ENCRYPT(?, UNHEX(?));'
    db.query(sqlPass, [req.params.userId, password, process.env.MYSQL_ENCRYPT], (err, data, fields) => {
        if (err) return res.status(404).json({err});
        if (data.length > 0) {
            //Delete user's avatar
            if (data[0].avatar.split('/images/')[1] != "avatar.png") {
                const avatar = data[0].avatar.split('/images/')[1];
                fs.unlink(`images/${avatar}`, (error => {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("Image removed !");
                    }
                }));
            }
            //search for posts images to delete
            const sqlPosts = 'SELECT imgUrl FROM posts WHERE user_id=?;';
            db.query(sqlPosts, [req.params.userId], (err, data, fields) => {
                if (err) return res.status(404).json({err});
                for (d in data) {
                    //test if there's an image and delete it if found
                    if (data[d].imgUrl) {
                        const filename = data[d].imgUrl.split('/images/')[1];
                        fs.unlink(`images/${filename}`, (error => {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log("Image removed !");
                            }
                        }));
                    }
                }
                const sqlComs = 'UPDATE posts, (SELECT post_id, COUNT(IF(user_id=?, 1, NULL)) nbrusercom FROM comments GROUP BY post_id) AS commented SET nbrcoms=nbrcoms-commented.nbrusercom WHERE posts.id=commented.post_id;';
                db.query(sqlComs, req.params.userId, (err, data, fields) => {
                    if (err) return res.status(404).json({err});
                    //delete user in database
                    const sql = 'DELETE FROM users WHERE id=? AND password=AES_ENCRYPT(?, UNHEX(?));';
                    db.query(sql, [req.params.userId, password, process.env.MYSQL_ENCRYPT], (err, data, fields) => {
                        if(err) return res.status(404).json({err});
                        return res.status(200).json({message: "User deleted !"});
                    });
                })
            })
        } else {
            return res.status(401).json({error: 'Mot de passe incorrect'});
        }
    })
}