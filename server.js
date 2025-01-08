const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const callAiRoutes = require('./routes/call-ai');
const authRouter = require('./routes/auth');
const dbConnect = require('./db/dbConnect');
const adminRouter = require('./routes/adminRoutes');
const cors = require('cors')
const app = express();
dotenv.config();

dbConnect();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
app.use(callAiRoutes);
app.use(authRouter);
app.use('/admin',adminRouter);

app.get('/', (req, res) => {
    res.send('Server is Running');
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
