const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes')
dotenv.config();

//TODO console.log replace with custom log function

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use('/player', userRoutes);
app.use('/game', gameRoutes);
app.use('/admin', adminRoutes)

app.get('/', (req, res) => {
  res.send('Server is running')
});


app.listen(process.env.PORT);