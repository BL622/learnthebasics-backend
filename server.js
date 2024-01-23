const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes')

const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use('/player', userRoutes);
app.use('/game', gameRoutes);

app.get('/', (req, res) => {
    res.send('Hello test koyeb push')
  })


app.listen(PORT, function () {
  console.log('Server running on http://localhost:' + PORT);
});