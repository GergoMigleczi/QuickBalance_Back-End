const express = require('express'); 
const db = require('./queries.js')
const cors = require('cors');
const helmet= require('helmet')
const app = express(); 
const bodyParser = require('body-parser');
const port = process.env.PORT || 3001; 

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

app.get('/get-users', db.getUsers);
app.get('/login', db.login);
app.get('/transactions-and-accounts', db.authorize, db.getTransactionsAndAccounts);
app.get('/transactions', db.authorize, db.getTransactions);
app.get('/accounts', db.authorize, db.getAccounts);

app.post('/register-user',db.createUser, db.register);
app.post('/add-transaction', db.authorize, db.addTransaction);
app.post('/add-account', db.authorize, db.addAccount );

app.delete('/delete-transaction', db.authorize, db.deleteTransaction);
app.delete('/delete-account', db.authorize, db.deleteAccount);

app.put('/edit-transaction', db.authorize, db.editTransaction);
app.listen(port, () => console.log(`Listening on port ${port}`)); 
