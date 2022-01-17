const validator = require('validator');
const fs = require('fs');

exports.getOnePost = (req, res, next) => {
    const sql = 'SELECT text FROM posts WHERE id=?;';
    db.query(sql, req.params.id, (err, data, fields) => {
        if (err) return res.status(404).json({err});
        return res.status(200).json({data});
    });
};

exports.getAllPosts = (req, res, next) => {
    const sql = 'SELECT posts.id AS pid, posts.user_id AS puid, posts.date AS pdate, posts.text AS ptext, posts.imgUrl AS pimgUrl, posts.likes AS plikes, posts.nbrcoms AS nbrComs, name AS pname, forname AS pforname, avatar AS pavatar FROM posts INNER JOIN users ON posts.user_id=users.id ORDER BY date DESC;';
    db.query(sql, (err, data, fields) => {
        if (err) return res.status(404).json({err});
        const posts = {...data};
        //Select infos from first comments and users
        const sql2 = 'SELECT comments.*, name, forname, avatar FROM comments INNER JOIN users ON comments.user_id=users.id, (SELECT post_id, MAX(comments.id) AS id FROM comments GROUP BY post_id) AS com WHERE comments.id=com.id;';
        db.query(sql2, (err, data, fields) => {
            if (err) return res.status(404).json({err});
            const coms = {...data};
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
                    //add first com in each post object
                    for (const c in coms) {
                        if (posts[p].pid == coms[c].post_id) {
                            if (!posts[p].com) {
                                posts[p] = {...posts[p], com: {...coms[c]}};
                            }
                        }
                    }
                }
                return res.status(200).json({...posts});
            });
        })
    });
};

exports.createPost = (req, res, next) => {
    if (!req.body.text && !req.file) {
        return res.status(400).json({message: "Your need to enter text or image !"})
    };
    //handle image
    let img = null;
    if (req.file) {
        img = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
    };
    const userId = req.params.userId;
    let text = '';
    if (req.body.text) {
        text = validator.escape(req.body.text);
    }
    const post = [userId, text, 0, img];
    //create DB query
    const sql = 'INSERT INTO posts (user_id, text, likes, imgUrl) VALUES (?);';
    db.query(sql, [post], (err, data, fields) => {
        if (err) return res.status(400).json({err});
        return res.status(201).json({message: 'Post created !'});
    });
};

exports.deletePost = (req, res, next) => {
    const sqlAdmin = 'SELECT role FROM users WHERE id=?';
    db.query(sqlAdmin, req.params.userId, (err, data, fields) => {
        if (err) return res.status(404).json({err});
        const role = data[0].role;
        const sqlPost = 'SELECT user_id, imgUrl FROM posts WHERE posts.id=?'
        db.query(sqlPost, req.params.id, (err, data, fields) => {
            if (err) return res.status(404).json({err});
            let filename;
            if (data[0].imgUrl) {
                filename = data[0].imgUrl.split('/images/')[1];
            }
            if (req.params.userId == data[0].user_id || role == "admin") {
                const sql = 'DELETE FROM posts WHERE posts.id=? ;';
                db.query(sql, [req.params.id], (err, data, fields) => {
                    if (err) return res.status(400).json({err});
                    if (filename) {
                        fs.unlink(`images/${filename}`, (error => {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log("Image removed !");
                            }
                        }));
                    }
                    return res.status(200).json({message: 'Post removed !'})
                })
            }
        })
    })
};

exports.createComment = (req, res, next) => {
    if (!req.body.text) {
        return res.status(400).json({message: "Your need to enter text !"})
    };
    const sql = 'INSERT INTO comments (user_id, text, post_id) VALUES (?);';
    const comment = [req.params.userId, validator.escape(req.body.text), req.params.id];
    db.query(sql, [comment], (err, data, fields) => {
        if (err) return res.status(401).json({err});
        const comId = data.insertId;
        const sqlComs = 'UPDATE posts SET nbrcoms=nbrcoms+1 WHERE id=?;';
        db.query(sqlComs, req.params.id, (err, data, fields) => {
            if (err) return res.status(404).json({err});
            const sql2 = 'SELECT comments.* FROM comments WHERE id=?'
            db.query(sql2, comId, (err, data, fields) => {
                if (err) return err;
                return res.status(201).json({message: 'Comment created !', comment: {...data[0]}});
            })
        });
    })
};

exports.getComments = (req, res, next) => {
    const sql = 'SELECT comments.*, users.name, users.forname, users.avatar FROM comments LEFT JOIN users ON comments.user_id=users.id WHERE post_id=? ORDER BY comments.date;';
    db.query(sql, [req.params.id], (err, data, fields) => {
        if (err) return res.status(404).json({err});
        return res.status(200).json({...data});
    });
};

exports.deleteComment = (req, res, next) => {
    const sqlAdmin = 'SELECT role FROM users WHERE id=?';
    db.query(sqlAdmin, req.params.userId, (err, data, fields) => {
        if (err) return res.status(404).json({err});
        const role = data[0].role;
        const sqlPost = 'SELECT user_id, post_id FROM comments WHERE id=?'
        db.query(sqlPost, req.params.id, (err, data, fields) => {
            if (err) return res.status(404).json({err});
            const postId = data[0].post_id;
            if (req.params.userId == data[0].user_id || role == "admin") {
                const sql = 'DELETE FROM comments WHERE id=? ;';
                db.query(sql, [req.params.id], (err, data, fields) => {
                    if (err) return res.status(401).json({err});
                    const sqlComs = 'UPDATE posts SET nbrcoms=nbrcoms-1 WHERE id=?;';
                    db.query(sqlComs, postId, (err, data, fields) => {
                        if (err) return res.status(401).json({err});
                        return res.status(200).json({message: 'Comment removed !'});
                    })
                })
            }
        })
    })
};

exports.likePost = (req, res, next) => {
    const sqlCheck = 'SELECT * FROM likes WHERE user_id=? AND post_id=?;'
    db.query(sqlCheck, [req.params.userId, req.params.id], (err, data, fields) => {
        if (err) return res.status(404).json({err});
        if (data.length > 0) {
            const sql = 'DELETE FROM likes WHERE user_id=? AND post_id=?;';
            db.query(sql, [req.params.userId, req.params.id], (err, data, fields) => {
                if (err) return res.status(401).json({err});
                const sql2 = 'UPDATE posts SET likes=likes-1 WHERE id=?;';
                db.query(sql2, [req.params.id], (err, data, fields) => {
                    if (err) return res.status(401).json({err});
                    return res.status(200).json({message: 'Post disliked !'});
                })
            })
        } else {
            const sql = 'INSERT INTO likes (user_id, post_id) VALUES (?);';
            db.query(sql, [[req.params.userId, req.params.id], req.params.id], (err, data, fields) => {
                if (err) return res.status(401).json({err});
                const sql2 = 'UPDATE posts SET likes=likes+1 WHERE id=?;';
                db.query(sql2, [req.params.id], (err, data, fields) => {
                    if (err) return res.status(401).json({err});
                    return res.status(200).json({message: 'Post liked !'});
                })
            })
        }
    });
};