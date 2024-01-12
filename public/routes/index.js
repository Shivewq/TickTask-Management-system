const express = require('express')
const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('data/db_userInfo')
const router = express.Router()

const getCurrentTime = require('../static/js/scripts')
const fileUpload = require('express-fileupload')

router.use(fileUpload());
// Display login form

router.get('/login', (request, response) => {
  response.render('login');
});
  
  // Handle login POST request
router.post('/login', (request, response) => {
  const { username, password, role } = request.body;
  console.log('Received login POST request with:', username, password, role);
  // Check user authentication
  db.get('SELECT * FROM users WHERE userId = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      console.error(err) // Log the error
      return response.render('login', { error: 'Error checking user authentication' });
    }

    if (row) {
      // User authenticated, log in
      request.session.username = username
      request.session.userRole = role
      // You can also set a session or cookie to maintain the user's login status
      response.redirect('/tickets')
    } else {
      // User not authenticated
      return response.render('login', { error: 'Invalid username or password' })
    }
  })
})

// Display tickets page
router.get('/tickets', (request, response) => {
  // Fetch ticket data from the 'tickets' table
  db.all('SELECT * FROM tickets', (err, ticketRows) => {
    if (err) {
      console.error(err);
      return response.render('tickets', { ticketEntries: [], users: [], admin: false });
    }

    let isAdmin = request.session.userRole === 'admin';

    // If the user is an admin, fetch all users from the 'users' table
    if (isAdmin) {
      db.all('SELECT * FROM users', (err, userRows) => {
        if (err) {
          console.error(err);
          return response.render('tickets', { ticketEntries: ticketRows, users: [], admin: isAdmin });
        }

        console.log(userRows)

        response.render('tickets', { ticketEntries: ticketRows, users: userRows, admin: isAdmin });
      });
    } else {
      response.render('tickets', { ticketEntries: ticketRows, users: [], admin: isAdmin });
    }
  });
});

// Handle ticket creation
router.post('/tickets', async (request, response) => {
  const { taskName, description, status } = request.body;
  const userid = request.session.username;
  // Fetch current date data (time ticket was created) using worldclock API:
  const date = await getCurrentTime();
  // Reformat fetched time data to EST time:
  const estTime = new Date(date).toLocaleString('en-US', {
    timeZone: 'America/New_York',
  });

  const image = request.files && request.files.image ? request.files.image : null;
  const imageData = image ? image.data.toString('base64') : null;

  // Insert new ticket into the 'tickets' table
  db.run(
    'INSERT INTO tickets (title, description, status, userid, date, image) VALUES (?, ?, ?, ?, ?, ?)',
    [taskName, description, status, userid, estTime, imageData],
    (err) => {
      if (err) {
        console.error(err);
        return response.render('tickets', { ticketEntries: [], error: 'Error adding ticket' });
      }

      // Fetch ticket data from the 'tickets' table
      db.all('SELECT * FROM tickets', (err, rows) => {
        if (err) {
          console.error(err);
          return response.render('tickets', { ticketEntries: [], error: 'Error fetching tickets' });
        }

        // Render the 'tickets' page with updated ticket data
        response.render('tickets', { ticketEntries: rows });
      });
    }
  );
});


router.post('/updateTicketStatus/:title', (request, response) => {
  const { title } = request.params;
  const { status } = request.body;
  console.log(`Updating ticket status for ${title} to ${status}`);

  // Update the status in the 'tickets' table
  db.run('UPDATE tickets SET status = ? WHERE title = ?', [status, title], (err) => {
    if (err) {
      console.error(err);
      return response.status(500).json({ error: 'Error updating ticket status' });
    }

    // Fetch updated ticket data
    db.all('SELECT * FROM tickets', (err, rows) => {
      if (err) {
        console.error(err);
        return response.status(500).json({ error: 'Error fetching tickets' });
      }

      // Send updated ticket data as JSON response
      response.json(rows);
    });
  });
});
  
module.exports = router

