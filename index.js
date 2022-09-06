const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const cors = require('cors')


var bodyParser = require('body-parser');
const express = require('express')
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(cors({
  origin:'*'
}))

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;
  if (!events || events.length === 0) {
    // const meeting_link = `https://meet.google.com/${link}`;
    console.log('No upcoming events found.');
    return;
  }
  console.log('Upcoming 10 events:');
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;
    console.log(`${start} - ${event.summary}`);
  });
  return events;
}

var event = {
  'summary': 'Google I/O 2015',
  'location': '800 Howard St., San Francisco, CA 94103',
  'description': 'A chance to hear more about Google\'s developer products.',
  'start': {
    'dateTime': '2022-09-07T09:00:00-07:00',
    'timeZone': 'America/Los_Angeles',
  },
  'end': {
    'dateTime': '2022-09-08T17:00:00-07:00',
    'timeZone': 'America/Los_Angeles',
  },
  'attendees': [
    {'email': 'lpage@example.com'},
    {'email': 'sbrin@example.com'},
  ],
  'reminders': {
    'useDefault': false,
    'overrides': [
      {'method': 'email', 'minutes': 24 * 60},
      {'method': 'popup', 'minutes': 10},
    ],
  },
  "conferenceData": {
    "createRequest": {
      "conferenceSolutionKey": {
        "type": "hangoutsMeet"
      },
      "requestId": "some-random-string"
    }
  },
};

async function addEvents(auth) {
  const calendar = await google.calendar({version: 'v3', auth});
  const res = calendar.events.insert({
    auth: auth,
    calendarId: 'primary',
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event created: %s', event.htmlLink);
  });
}

async function Eventer(){
  const auth = await authorize();
  console.log(auth)
  const events = await addEvents(auth);
}
Eventer();

// app.get('/events', async (req, res) => {
//     try {
//       const auth = await authorize();
//       const events = await listEvents(auth);
//       console.log(events);
//       res.json({
//         status: 'success',
//         result: events[0].hangoutLink
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: 'fail',
//         message: error.message
//       });
//     }
//   });
//   const port = 3000;
//   app.listen(port, () => console.log('Hello World'));