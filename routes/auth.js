const express = require('express');
const { login, register } = require('../controller/auth');
const authRouter = express.Router();
require('dotenv').config();

authRouter.post('/login', login);
authRouter.post('/register', register);


module.exports = authRouter