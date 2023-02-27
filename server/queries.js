const Pool = require('pg').Pool;
const bcrypt = require("bcrypt")
require('dotenv').config();


const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT
});

const getUsers = (req, res) => {
    pool.query('SELECT id, username FROM users', (err, result) => {
        if(err){
            console.log(err);
        }
        res.json(result.rows);
    })
}

const login = async (req, res) =>{
    pool.query(`SELECT * FROM users WHERE username='${req.query.username}'`,
        async (err, queryResult) => {
            if(err){
                console.log(err);
                res.json({"err": "Username or password is incorrect!"});
            }
            if(queryResult.rowCount > 0){
                const result = await bcrypt.compare(req.query.password, queryResult.rows[0].password)
                if (result) {
                    // password is valid
                    res.json(queryResult.rows[0]);
                }else{
                    res.json({"err": "Username or password is incorrect!"});
                }
                
            }else if(queryResult.rowCount <= 0){
                res.json({"err": "Username or password is incorrect!"});
            }
        }
    )
    
}

const createUser = async (req, res, next) => {
    pool.query('VACUUM;', (err, result) => {
        if(err){
            console.log(err);
            res.json({"err": "Failed to register an account"})
        }
    });
    console.log('register')
    const salt = await bcrypt.genSalt(10)
    //console.log('register-salt ', salt);
    const hash = await bcrypt.hash(req.body.password, salt);
    //console.log('register-hash ', hash);
    pool.query(`INSERT INTO users (id, username, password) VALUES (${req.body.id}, '${req.body.username}', '${hash}')`, (err, result) => {
        if(err){
            console.log(err)
            res.json({"err": "Failed to register an account"})
        }
        if(result){
            next();
        }
    })
}

const register = async (req, res) =>{
    pool.query(`CREATE TABLE accounts_${req.body.id} (
        id SERIAL PRIMARY KEY,
        name varchar(20),
        currency varchar(10)
    );`, (err, result)=>{
        if(err){
            console.log(err)
            res.json({"err": "Failed to register an account"})
        }
    });
    pool.query(`CREATE TABLE transactions_${req.body.id} (
        id SERIAL PRIMARY KEY,
        account_id integer REFERENCES accounts_${req.body.id}(id) ON DELETE CASCADE,
        description text,
        amount integer,
        date varchar(10)
    );`, (err, result)=>{
        if(err){
            console.log(err)
            res.json({"err": "Failed to register an account"})
        }else{
            res.json(result);
        }
    });
    
    
}

const authorize = (req, res, next) =>{
    pool.query(`SELECT *
    FROM users
    WHERE id=${req.query.id} AND password='${req.query.password}'`, (err, queryResult) => {
        if(err){
            console.log(err);
            res.json({"err": "You are not authorized to complete this request"})
        }
        if(queryResult){
            next();           
        }
    })
}

const getTransactions = (req, res) => {
    pool.query(`SELECT transactions_${req.query.id}.id, transactions_${req.query.id}.description AS desc, transactions_${req.query.id}.amount, transactions_${req.query.id}.date, accounts_${req.query.id}.name AS account, accounts_${req.query.id}.currency
    FROM transactions_${req.query.id}, accounts_${req.query.id}
    WHERE transactions_${req.query.id}.account_id = accounts_${req.query.id}.id;`, (err, result) =>{
        if(err){
            console.log(err);
        }
        if(result){
            res.json(result.rows)
        }
    });
}

const getAccounts = (req, res) =>{
    pool.query(`SELECT *
    FROM accounts_${req.query.id}`, (err, result) => {
        if(err){
            console.log(err);
        }

        if(result){
            res.json(result.rows);
        }
    });
}

const getTransactionsAndAccounts = (req, res) => {
    const answer = {
        transactions: [],
        accounts: []
    }
    pool.query(`SELECT transactions_${req.query.id}.id, transactions_${req.query.id}.description AS desc, transactions_${req.query.id}.amount, transactions_${req.query.id}.date, accounts_${req.query.id}.name AS account, accounts_${req.query.id}.currency
    FROM transactions_${req.query.id}, accounts_${req.query.id}
    WHERE transactions_${req.query.id}.account_id = accounts_${req.query.id}.id;`, (err, result) =>{
        if(err){
            console.log(err);
        }
        if(result){
            answer.transactions = result.rows
        }
    });

    pool.query(`SELECT *
    FROM accounts_${req.query.id}`, (err, result) => {
        if(err){
            console.log(err);
        }

        if(result){
            answer.accounts = result.rows;
            res.json(answer);
        }
    });
    
}

const addTransaction = (req, res) =>{
    pool.query(`VACUUM FULL transactions_${req.query.id};`, (err, result) => {
        if(err){
            console.log(err);
            res.json({"err": "Failed to vacuum"})
        }
    });
    pool.query(`INSERT INTO transactions_${req.query.id} (account_id, amount, description, date) 
    VALUES (${req.body.accountId}, ${req.body.amount}, '${req.body.description}', '${req.body.date}')`, (err, result) =>{
        if(err){
            console.log(err);
            res.json({"err": "Failed to add transaction"})
        }
        if(result){
            res.json(result.rows)
        }
    })
}

const addAccount = (req, res) => {
    pool.query(`VACUUM accounts_${req.query.id};`, (err, result) => {
        if(err){
            console.log(err);
            res.json({"err": "Failed to vacuum"})
        }
    });
    pool.query(`INSERT INTO accounts_${req.query.id} (id, name, currency)
    VALUES (${req.body.id},'${req.body.name}', '${req.body.currency}');`, (err, result) =>{
        if(err){
            console.log(err)
            res.json({"err": "Failed to add account"})
        }
        if(result){
            res.json({id: req.body.id,
            name: req.body.name,
        currency: req.body.currency});
        }
    })
}

const deleteTransaction = (req, res) => {
    pool.query(`DELETE FROM transactions_${req.query.id} WHERE id=${req.body.trId}`,
    (err, result) =>{
        if(err){console.log(err)}

        if(result){
            res.json(result);
        }
    })
}

const deleteAccount = (req, res) =>{
    pool.query(`DELETE FROM accounts_${req.query.id} WHERE id=${req.body.acId};`, (err, result) =>{
        if(err){console.log(err)};

        if(result){
            res.json(result);
        }
    })
}

const editTransaction = (req, res) => {
    pool.query(`
    UPDATE transactions_${req.query.id}
    SET amount=${req.body.amount}, description='${req.body.description}', account_id = ${req.body.accountId}, date='${req.body.date}'
    WHERE id = ${req.body.id};
    `, (err, queryResult) => {
        if(err){
            console.log(err)
            res.json({"err": "Failed to update the record"})
        };
        if(queryResult){
            res.json(queryResult);
        };
    })
}
module.exports ={
    getUsers,
    login,
    createUser,
    register,
    authorize,
    getTransactions,
    getTransactionsAndAccounts,
    addTransaction,
    getAccounts, 
    addAccount,
    deleteTransaction,
    deleteAccount,
    editTransaction
}