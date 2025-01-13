const express = require('express');
const { getCallLogs, getConversations } = require('../controller/admin/logsRetrieve');
const { getDetails } = require('../controller/admin/getDetails');
const requireLogin = require('../middlewares/requireLogin');
const { updatePassword } = require('../controller/auth');
const adminRouter = express.Router()

adminRouter.get('/get-logs', requireLogin(true), getCallLogs );
adminRouter.get('/get-details', requireLogin(true), getDetails);
adminRouter.get('/get-conversations', requireLogin(true), getConversations);
adminRouter.post('/update-password', requireLogin(true), updatePassword);

module.exports = adminRouter