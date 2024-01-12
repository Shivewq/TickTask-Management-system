const express = require('express');
const session = require('express-session');
const http = require('http');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
var path = require('path');
const socketIo = require('socket.io');

const db = new sqlite3.Database('data/db_userInfo');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;
app.use(express.static("public"));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));

// Set up Handlebars
app.set('views', path.join(__dirname, 'pages'));
app.set('view engine', 'hbs');

// Set up middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'css')));

//express-session middleware - test
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

// Authentication middleware
const authenticateUser = (req, res, next) => {
  if (!req.session.username) {
    return res.redirect('/login'); // Redirect to login page if not authenticated
  }
  next(); // Continue to the next middleware or route if authenticated
};

// Apply the authentication middleware to routes that require authentication
app.use(['/tickets'], authenticateUser);

// Routes
const routes = require('./routes/index');
// Use the routes
app.use('/', routes);

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send existing tickets to the client
  db.all('SELECT * FROM tickets', (err, rows) => {
    if (err) {
      console.error('Error fetching tickets:', err);
    } else {
      socket.emit('initialTickets', rows);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});