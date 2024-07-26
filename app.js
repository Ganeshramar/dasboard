const express = require('express');
const path = require('path');
const moment = require('moment');
const RequestLog = require('./models/request_log');
require('dotenv').config();

const app = express();

// Set up Mongoose
const mongoose = require('mongoose');
const mongoUrl = 'mongodb+srv://raguram:Panchu86800@cluster0.ilzd5bf.mongodb.net/Node-API?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoUrl)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

  console.log('Pusher Config:', {
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER
  });

// Set up Pusher
const Pusher = require('pusher');
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY, // Fixed key name
  secret: process.env.PUSHER_APP_SECRET, // Fixed key name
  cluster: process.env.PUSHER_APP_CLUSTER, // Fixed key name
  useTLS: true
});

// Middleware to log requests
// app.use((req, res, next) => {
//   let requestTime = Date.now();
//   res.on('finish', () => {
//     if (req.path === '/analytics') {
//       return;
//     }

//     RequestLog.create({
//       url: req.path,
//       method: req.method,
//       responseTime: (Date.now() - requestTime) / 1000, // convert to seconds
//       day: moment(requestTime).format("dddd"),
//       hour: moment(requestTime).hour()
//     });
//   });
//   next();
// });

// // View engine setup
// app.set('views', path.join(__dirname, 'views'));
// require('hbs').registerHelper('toJson', data => JSON.stringify(data));
// app.set('view engine', 'hbs');

// // Routes
// app.get('/analytics', (req, res, next) => {
//   require('./analytics_service').getAnalytics()
//     .then(analytics => res.render('analytics', { analytics }))
//     .catch(next); // Handle errors properly
// });

// app.get('/wait/:seconds', async (req, res, next) => {
//   const seconds = parseInt(req.params.seconds, 10);
//   if (isNaN(seconds)) {
//     return res.status(400).send('Invalid input');
//   }
  
//   await new Promise(resolve => setTimeout(resolve, seconds * 1000));
//   res.send(`Waited for ${seconds} seconds`);
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err);
//   res.status(500).send('Internal Server Error');
// });
app.use((req, res, next) => {
  let requestTime = Date.now();
  res.on('finish', () => {
      if (req.path === '/analytics') {
          return;
      }

      RequestLog.create({
        method: req.method,
        url: req.path,
          responseTime: (Date.now() - requestTime) / 1000, // convert to seconds
          day: moment(requestTime).format("dddd"),
          hour: moment(requestTime).hour()
      });

      // trigger a message with the updated analytics
      require('./analytics_service').getAnalytics()
          .then(analytics => pusher.trigger('analytics', 'updated', {analytics}));
  });
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
require('hbs').registerHelper('toJson', data => JSON.stringify(data));
app.set('view engine', 'hbs');

app.get('/analytics', (req, res, next) => {
  require('./analytics_service').getAnalytics()
      .then(analytics => res.render('analytics', { analytics }));
});

app.get('/wait/:seconds', async (req, res, next) => {
  await ((seconds) => {
      return new Promise(resolve => {
          setTimeout(
              () => resolve(res.send(`Waited for ${seconds} seconds`)),
              seconds * 1000
          )
      });
  })(req.params.seconds);
});
module.exports = app;
