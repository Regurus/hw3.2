var query = require("./DBUtils").execQuery;
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
var bodyParser = require('body-parser'); 
app.use(bodyParser.json()); 
const secret = "ae5e78de8cf2936e9508d0b386bf6800bf6b2396762cae9866681ea554b70859";
const port = process.env.PORT || 3000; //environment variable


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
    });

function executeReadQuery(q, receiver){
    var prom = query(q);
    prom.then((item)=> {
        console.log(item);
    })
}

app.use("/api/secure",(req, res, next) => {//authorization middleware all secure request should be passed with /api/secure prefix
    const token = req.header("x-auth-token");
    // no token
    if (!token) res.status(401).send("Access denied. No token provided.");
    // verify token
    try {
        const decoded = jwt.verify(token, secret);
        req.decoded = decoded;
        req.authorizationPassed = true;//way to pass on arguments to next functions in chain
    } catch (exception) {
        res.status(400).send("Invalid token.");
    }
    next();
});

app.get("/api/getAllCategories", (req, res) => {
    var prom = query("select * from categories");
    prom.then((item)=> {
        res.status(200).send(item);
        console.log("All categories sent!");
        console.log(item);
    })
    
});

app.post("/api/login", (req, res)=>{//login
    var q = query("SELECT username,password FROM users WHERE username = '"+req.body.username+"'");//!! variable section like the username, in this case, have to have the single quotes around - AzureSQL syntax
    q.then((item)=>{
        if(item.lenght>1){
            res.status(200).send("Database corruption detected");
            return;
        }
        const actualPassword = item[0].password.trim();//trim() - string method cuts all whitespaces from both sides of the string, no change to internal whitespaces
        if(actualPassword==req.body.password){
            payload = { name: req.body.username};
            options = { expiresIn: "360d" };
            const token = jwt.sign(payload, secret, options);
            res.status(200).send(token);
        }
        else{
            res.status(401).send("Login FAIL");
        }
    })
    q.catch((err)=>{
        res.status(200).send("Database Error!!, "+err);
    })
});

//test action - tested in congestion with login and secure procedure
app.get("/api/secure/secureAction", (req,res)=>{
    console.log("secure action done");
    if(req.authorizationPassed){//way to recieve passed arguments from functions higher up in chain
        res.status(200).send("operation done");
    }
    else{
        res.status(200).send("fail");
    }
});
