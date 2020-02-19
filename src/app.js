require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const uuid = require('uuid/v4');
const bodyParser = express.json()

const app = express()

const morganOption = (NODE_ENV === 'production')
    ? 'tiny'
    : 'common';

const winston = require('winston');

// set up winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
    new winston.transports.File({ filename: 'info.log' })
    ]
});

if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
    format: winston.format.simple()
    }));
}

const bookmarks = [
    {id: 1, 
    title: 'Thinkful',
    url:'https://www.thinkful.com', 
    rating:'5', 
    description: 'Think outside the classroom' 
    },
  
    {
      id: 2, 
      title: 'Google',
      url: 'https://www.google.com', 
      rating:'4', 
      description: 'Where we find everything else'
}]

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())
app.use(express.json());

app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN
    const authToken = req.get('Authorization')
  
    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized request' })
    }
    // move to the next middleware
    next()
})

app.use(function errorHandler(error, req, res, next) {
   let response
   if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
        console.error(error)
        response = { message: error.message, error }
    }
   res.status(500).json(response)
})


app.get('/bookmarks', (req, res) => {
    res
      .json(bookmarks);
});

app.get('/bookmarks/:id', (req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find(b => b.id == id);
  
    // make sure we found a card
    if (!bookmark) {
      logger.error(`Card with id ${id} not found.`);
      return res
        .status(404)
        .send('Card Not Found');
    }
  
    res.json(bookmark);
});

app.post('/bookmarks', (req, res) => {
    const { title, url, description, rating } = req.body

  if (!title) {
    logger.error(`Title is required`);
    return res
      .status(400)
      .send('Invalid data');
  }
  
  if (!url) {
    logger.error(`Content is required`);
    return res
      .status(400)
      .send('Invalid data');
  }

    // get an id
    const id = uuid();

    const bookmark = {
        id,
        title,
        url,
        rating,
        description
      };
      

    bookmarks.push(bookmark);

    logger.info(`Bookmark with id ${id} created`);

    res
        .status(201)
        .location(`http://localhost:8000/list/${id}`)
        .json({id});
});

app.delete('/bookmarks/:bookmark_id', (req, res) => {
    const { bookmark_id } = req.params;
  
    const bookmarksIndex = bookmarks.findIndex(li => li.id == bookmark_id);
  
    if (bookmarksIndex === -1) {
      logger.error(`List with id ${bookmark_id} not found.`);
      return res
        .status(404)
        .send('Not Found');
    }
  
    bookmarks.splice(bookmarksIndex, 1);
  
    logger.info(`List with id ${bookmark_id} deleted.`);
    res
      .status(204)
      .end();
});

module.exports = app