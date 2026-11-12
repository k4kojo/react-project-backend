const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');
require('dotenv').config({ path: '.env.dev' });

const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;

const app = express();

app.use(bodyParser.json());

app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route', 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  res
    .status(error.code || 500)
    .json({ message: error.message || 'An unknown error occured' });
});

mongoose
  .connect(
    `mongodb+srv://mintahsylvesterkojo_db_user:${DATABASE_PASSWORD}@cluster0.iizgrts.mongodb.net/`,
  )
  .then(() => {
    console.log('MongoDB connected');
    app.listen(5001);
  })
  .catch((err) => {
    console.log(err);
  });
