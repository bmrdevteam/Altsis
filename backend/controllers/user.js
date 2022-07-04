const express = require('express');
var passport = require('passport')

const { User } = require("../models/User");
const { body, validationResult } = require("express-validator")

exports.validate = [
    body("userId").trim().isLength({ min: 5 }),
    body("pw").trim().isLength({ min: 5 })
]

exports.register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    User.findOne({ userId: req.body.userId }, (err, _user) => {
        if (err) return res.status(500).send({ err });
        if (_user) return res.status(409).send({
            success: false,
            message: "User already exists with such id"
        });
        const user = new User(req.body);
        user.save((err, doc) => {
            if (err) return res.status(500).send({ err });
            res.status(200).send({
                success: true
            });
        })
    })
}

exports.login = (req, res, next) => {
    passport.authenticate('local', (authError, user, message) => {
        if (authError) return res.status(500).send({ authError });
        if (!user) return res.status(409).send(message);
        req.login(user, { session: false }, loginError => {
            if (loginError) return res.status(500).send({ loginError });
            user.generateToken((err, user) => {
                if (err) return res.status(500).send({ err });
                res.cookie("w_authExp", user.tokenExp);
                res.cookie("w_auth", user.token);
                res.status(200).send({
                    success: true, user
                });
            })
        });
    })(req, res, next)
}

exports.logout = (req, res) => {
    User.findOneAndUpdate({ _id: req.user._id },
        { token: "", tokenExp: "" }, (err, doc) => {
            if (err) return res.status(500).send({ err });
            res.cookie("w_authExp", '');
            res.cookie("w_auth", '');
            res.status(200).send({
                success: true
            });
        })
    
}