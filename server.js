const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes');
const {log} = require('./sharedFunctions/logFunction')
dotenv.config();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use('/player', userRoutes);
app.use('/game', gameRoutes);
app.use('/admin', adminRoutes)

app.get('/', (req, res) => {
  res.send('Server is running')
  const asd = ["asd", "asd1", "asd2"]
  console.log(asd)
  console.log(JSON.stringify(kuka))
log(asd)
log(JSON.stringify(kuka))
});



app.listen(process.env.PORT);