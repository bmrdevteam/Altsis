const express = require('express');


const router = express.Router();

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

exports.login = async (req, res) => {
    User.findOne({ userId: req.body.userId }, (err, _user) => {
        if (err) return res.status(500).send({ err });
        if (!_user) return res.status(409).send({
            success: false,
            message: "No user exists with such userId"
        });
        _user.comparePassword(req.body.pw, (err, isMatch) => {
            if (err) return res.status(500).send({ err });
            if (!isMatch) return res.status(409).send({
                success: false,
                message: "Wrong password"
            });
            _user.generateToken((err, _user) => {
                if (err) return res.status(500).send({ err });
                res.cookie("w_authExp", _user.tokenExp);
                res.cookie("w_auth", _user.token).status(200).json({
                    success: true,
                    userId: _user.userId
                })
            })
        });
    })
}

exports.logout=async (req, res) => {
    User.findOneAndUpdate({ _id: req.user._id },
        { token: "", tokenExp: "" }, (err, doc) => {
            if (err) return res.status(500).send({ err });
            res.status(200).send({
                success: true
            });
        })
   
}