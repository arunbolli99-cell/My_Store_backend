require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require("connect-mongodb-session")(session);

const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use(cors({
  origin: 'https://my-store-project-seven.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// DB CONNECT
mongoose.connect(process.env.MongoDB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB connection error:', err));

// SESSION STORE
const store = new MongoStore({
  uri: process.env.MongoDB_URI,
  collection: 'user_sessions'
});

store.on('error', (error) => {
  console.log("Session Store Error:", error);
});

app.use(session({
  secret: 'user_session',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// ROUTES
app.use('/', userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
});
