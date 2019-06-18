var query = require("./DBUtils").execQuery;
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
var bodyParser = require('body-parser'); 
app.use(bodyParser.json()); 
const secret = "ae5e78de8cf2936e9508d0b386bf6800bf6b2396762cae9866681ea554b70859";
const port = process.env.PORT || 3000; //environment variable
const adminUser = "adminUser32"

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
    });

function executeReadQuery(q, receiver){
    var prom = query(q);
    prom.then((item)=> {
        console.log(item);
    })
}

app.get("/",(req, res)=>{
    res.send("Hello, I`m your server");
});
app.use("/api",(req,res,next)=>{//sanity check on query inputs
    console.log(req);
    res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5500');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers','X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials',true);

    next();//for now
});
app.use("/api/secure",(req, res, next) => {//authorization middleware all secure request should be passed with "/api/secure" prefix
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
app.use("/api/admin",(req, res, next) => {//authorization middleware all secure request should be passed with "/api/secure" prefix
    const token = req.header("x-auth-token");
    // no token
    if (!token) res.status(401).send("Access denied. No token provided.");
    // verify token
    try {
        const decoded = jwt.verify(token, secret);
        if(decoded.name!=adminUser){
            res.status(401).send("Not Allowed to perform the action!")
            return;
        }
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
        res.status(200).send(item[0]);
        console.log("All categories sent!");
        console.log(item);
    })
    
});
app.get("/api/threads", (req, res) => {
    console.log(req.query);
    res.status(404).send();

});
//test action - tested in congestion with login and secure procedure
app.post("/api/secure/secureAction", (req,res)=>{
    console.log("secure action done");
    if(req.authorizationPassed){//way to recieve passed arguments from functions higher up in chain
        res.status(200).send("operation done");
    }
    else{
        res.status(200).send("fail");
    }
});

///////////////////////////////////////////////////
app.get("/api/getPointInfo", (req, res) => {
    var prom = query("SELECT * FROM points WHERE pointID='"+req.body.pointid+"'");
    prom.then((item)=> {
        var result = new Object();
        result.pointID = item[0].pointID.trim();
        result.image_url = item[0].image_url.trim();
        result.view_count = item[0].view_count;
        result.descr = item[0].descr.trim();
        result.rate_percent = item[0].rate_percent;
        result.raters_count = item[0].raters_count;
        result.last_reviews = item[0].last_reviews;
        res.status(200).send(result);
    })
    prom.catch((err)=>{
        res.status(400).send("Error,"+err);
    })
});

app.post("/api/registerUser", (req, res) => {//TODO write to db
    var prom = query("Insert into users values( '"+req.body.first_name+"' , '"+req.body.last_name+"' , '"+req.body.city+"' , '"+req.body.country+"' , '"
    +req.body.email+"' , '"+    req.body.username+"' , '"+req.body.password+"')"
    );
    prom.then((item)=> {
        var q = "Insert into user_categories values ( '"+ req.body.username+"' ,'"+ req.body.categories[0]+"')";
        for(var i=1; i<req.body.categories.length; i++){
            q+=", ( '"+ req.body.username+"' ,'"+ req.body.categories[i]+"' )";
        }
        var prom2 = query(q);
        prom2.then((item)=> {
            q = "Insert into user_secrets values ( '"+ req.body.username+"' ,'"+ req.body.secretQ[0]+"' , '"+req.body.secretA[0]+"' ) ";
            for(var i=1; i<req.body.secretQ.length; i++){
                q+=", ( '"+ req.body.username+"' ,'"+req.body.secretQ[i]+"' , '"+req.body.secretA[i]+"' ) ";
            }
            var prom3 = query(q);
            prom3.then((item)=> {
                var result = new Object();
                result.msg = "OK"
                res.status(200).send(result);
            })
            

        })
    })
    prom.catch((exception)=> {
        res.status(400).send("Error "+exception);
    });
    
});

//to test
app.get("/api/getSecretQ", (req, res) => {
    var prom = query("SELECT secretQ FROM user_secrets WHERE username='"+req.body.username+"'");
    prom.then((item)=> {
        var result = new Object();
        result.Q = new Array();
        for(var i=0; i<item.length;i++){
            result.Q.push(item[i].secretQ.trim());
        }
        res.status(200).send(result);
    })
    prom.catch((exception)=> {
        res.status(400).send("Error "+exception);
    });
});

app.post("/api/getUserPassword", (req, res)=> {
    var prom = query("SELECT secretA FROM user_secrets WHERE username= '"+ req.body.username+ "'");
    console.log(req.body);
    prom.then((item)=> {
        for (var i=0; i<req.body.secretA.length; i++){
            if(req.body.secretA[i] != item[i].secretA){
                res.status(200).send("Not the user!!");
                return;
            }

        }
        var prom2 = query("SELECT password FROM users WHERE username = '" + req.body.username+ "'");
        prom2.then((item)=>{
            var result = new Object();
            result.password = item[0].password;
            res.status(200).send(result);
        })
    })
    prom.catch((err)=>{
        res.status(205).send("Error "+err);
    })
})


app.post("/api/loginUser", (req, res)=>{//login
    var q = query("SELECT username,password FROM users WHERE username = '"+req.body.username+"'");//!! variable section like the username, in this case, have to have the single quotes around - AzureSQL syntax
    q.then((item)=>{
        if(item.length>1){
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

// sent the token in the header,in the body write the user name
app.get("/api/secure/getLastSavedPoints",(req,res)=>{
    //var now = Date.now();
    var q = query("SELECT TOP 2 pointID FROM favorite WHERE username = '"+ req.decoded.name+"' ORDER BY date DESC");
    q.then((item)=> {
        var result = new Object();
        result.p1 = item[0].pointID.trim();
        result.p2 = item[1].pointID.trim();
        res.status(200).send(result);
    }) 
    q.catch((err)=>{
        res.status(400).send("Error "+err);
    });
});

app.put("/api/secure/addToFavorites", (req,res)=>{

    var q = query("INSERT INTO favorite VALUES ('"+req.decoded.name+"','"+req.body.pointid+"','0',CURRENT_TIMESTAMP);" )
    q.then((item)=>{
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=>{
        res.status(200).send("Fail");
    })
});

app.delete("/api/secure/removeFromFavorites", (req, res)=>{
    var q = query("DELETE FROM favorite WHERE username ='"+ req.decoded.name+ "' AND pointID ='"+req.body.pointid+"'");
    q.then((item)=> {
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    
    })
    q.catch((err)=>{
        res.status(400).send("Error "+err);
    });
});

app.get("/api/secure/getAllFavorites",(req,res)=>{
    var q = query("SELECT pointID FROM favorite WHERE username='"+req.decoded.name+"'");
    q.then((item)=>{
        result = new Object();
        result.pointid = new Array();
        for(var i=0;i<item.length;i++){
            result.pointid.push(item[i].pointID.trim());
        }
        
        res.status(200).send(result);
    })
    q.catch((err)=>{
        res.status(200).send("DB Error: "+err);
    })
})

app.post("/api/secure/ratePoint", (req,res)=>{
    var q0 = query("INSERT INTO ratings VALUES ('"+ req.decoded.name+"','"+ req.body.pointid+"','"+ req.body.rating+"','"+ req.body.desc+"')")
    q0.then((item)=>{
        console.log("p0");
        var q = query("UPDATE points SET raters_count = raters_count + 1 WHERE pointID = '"+ req.body.pointid+"'")
        q.then((item)=> {
            console.log("p");
            var q2 = query("UPDATE points SET rate_percent = (rate_percent * raters_count + "+req.body.rating+")/ raters_count WHERE pointID = '" + req.body.pointid+"'")
            q2.then((item)=>{
                console.log("p2");
                var q3 = query("SELECT last_reviews FROM points WHERE pointID='"+  req.body.pointid+"'");
                q3.then((item)=>{
                    console.log("p3");
                    var reviews;
                    var lastReviews="";
                    if(item[0].last_reviews != undefined){
                        reviews = item[0].last_reviews.split("!$!$")
                        reviews[1] = reviews[0];
                        lastReviews = reviews[1];
                    }
                    lastReviews = req.decoded.name+"!$!$"+ lastReviews;
                    var q4 = query("UPDATE points SET last_reviews='"+lastReviews+"' WHERE pointID='" +req.body.pointid+"'")
                    q4.then((item)=>{
                        var result = new Object();
                        result.msg = "OK"
                        res.status(200).send(result);                    })
                    
                })
            })
        })
    })
    q0.catch((err)=> {res.status(400).send("ERROR " +err);})
});

app.post("/api/secure/createPoint",(req,res)=>{
    var q = query("INSERT INTO points VALUES ('"+req.body.pointid+"','"+req.body.image_url+"',0,'"+req.body.desc+"','"+0+"','"+0+"', NULL)");
    q.then((item)=>{
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=>{
        res.status(200).send("DB Error: "+err);
    })
})

app.put("/api/secure/updateRating",(req,res)=>{
    if(req.body.field=="username"){
        res.status(200).send("Error: can`t change username!"); 
        return;
    }
    var q = query("UPDATE users SET "+req.body.field+"='"+req.body.value+"' WHERE username = '"+req.decoded.name+"' AND pointID = '"+req.body.pointid+"'");
    q.then((item)=>{
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=>{
        res.status(200).send("DB Error: "+err);
    })
})

app.delete("/api/secure/removePoint",(req,res)=>{
    var q = query("DELETE FROM points WHERE pointID='"+req.body.pointid+"'");
    q.then((item) => {
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=>{
        res.status(200).send("DB Error: "+err);
    })
})

app.put("/api/secure/updatePoint",(req,res)=>{
    if(req.body.field=="pointID"){
        res.status(200).send("Error: can`t change point ID!"); 
        return;
    }
    var q = query("UPDATE points SET "+req.body.field+"='"+req.body.value+"' WHERE pointID = '"+req.body.pointid+"'");
    q.then((item)=>{
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=>{
        res.status(200).send("DB Error: "+err);
    })
})

app.put("/api/secure/updateUserInfo",(req,res)=>{
    if(req.body.field=="username"){
        res.status(200).send("Error: can`t change username!"); 
        return;
    }
    var q = query("UPDATE users SET "+req.body.field+"='"+req.body.value+"' WHERE username = '"+req.decoded.name+"'");
    q.then((item)=>{
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=>{
        res.status(200).send("DB Error: "+err);
    })
})

app.delete("/api/secure/deleteUser",(req,res)=>{
    var q = query("DELETE FROM users WHERE username='"+req.decoded.name+"'");
    q.then((item) => {
        var result = new Object();
        result.user_msg = "OK"
        var q2 = query("DELETE FROM user_secrets WHERE username='"+req.decoded.name+"'");
        q2.then((item)=>{
            result.secrets_msg = "OK"
            var q3 = query("DELETE FROM user_categories WHERE username='"+req.decoded.name+"'");
            q3.then((item)=>{
                result.categories = "OK"
                res.status(200).send(result);
            })
        })
        
        
    })
    q.catch((err)=>{
        res.status(200).send("DB Error: "+err);
    })
})

app.put("/api/secure/addPointViewer", (req, res)=>{
    var q = query("UPDATE points SET view_count = view_count + 1 WHERE pointID = '"+ req.body.pointid+"'")
    q.then((item)=> {
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=> {res.status(400).send("ERROR " +err);})
});

app.get("/api/getCategories", (req, res)=>{
    var q = query("SELECT category FROM categories")
    q.then((item)=> {
        result = new Object();
        result.categories = new Array();
        for(var i=0;i<item.length;i++){
            result.categories.push(item[i].category.trim());
        }
        res.status(200).send(result);
    })
    q.catch((err)=> {res.status(400).send("ERROR " +err);})
});

app.get("/api/isUserExists", (req, res)=>{
    var q = query("SELECT * FROM users WHERE username='"+ req.body.username+ "'")
    q.then((item)=> {
        var result = new Object();
        if(item){
            result.found = true;
        }
        else{
            result.found = false;
        }
        res.status(200).send(result);
    })
    q.catch((err)=> {res.status(400).send("ERROR " +err);})
});

app.put("/api/secure/setUserOrder", (req,res)=>{
    var q = query("UPDATE favorite SET userOrder='"+req.body.number+"' WHERE username='"+req.decoded.name+"' AND pointID='"+ req.body.pointid+"'");
    q.then((item)=>{
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    
    })
    q.catch((err)=>{
        res.status(200).send("ERROR " +err);
    })
})

app.get("/api/getAllPoints",(req,res)=>{
    var q = query("SELECT * FROM points")
    q.then((item)=> {
        if(item){
            var result = new Object();
            result.points = new Array();
            for(var i=0;i<item.length;i++){
                item[i].pointID = item[i].pointID.trim();
                item[i].image_url = item[i].image_url.trim();
                item[i].descr = item[i].descr.trim();
                result.points.push(item[i]);
            }
            res.status(200).send(result);
        }
    })
    q.catch((err)=> {res.status(200).send("ERROR " +err);})
})

app.get("/api/getCountries", (req, res)=>{
    var q = query("SELECT * FROM countries")
    q.then((item)=> {
        var result = new Object();
        result.countries = new Array();
        for(var i=0;i<item.length;i++){
            result.countries.push(item[i].country.trim());
        }
        res.status(200).send(result);
    })
    q.catch((err)=> {res.status(400).send("ERROR " +err);})
});

app.get("/api/admin/getByAnyField", (req, res)=>{
    var q = query("SELECT * FROM "+req.body.table+" WHERE "+req.body.field+"='"+req.body.value+"'");
    q.then((item)=>{
        var result = new Object();
        result.response = new Array();
        for(var i=0;i<item.length;i++){
            for (var property in item[i]) {
                if (item[i].hasOwnProperty(property)&&typeof(item[i].property)==='string') {
                    item[i].property = item[i].property.trim();
                }
            }
            result.response.push(item[i]);
        }
        res.status(200).send(item);
    })
    q.catch((err)=>{
        res.status(400).send("Error: "+arr);
    })
});

app.put("/api/admin/setAnyField", (req, res)=>{
    var conditionOn = "";
    if(req.body.condition_field=="none"){
        conditionOn = "--";
    }
    var q = query("UPDATE "+req.body.table+" SET "+req.body.field+"='"+req.body.value+"'"+conditionOn+"WHERE "+req.body.condition_field+"='"+req.body.condition_value+"'");
    q.then((item)=>{
        var result = new Object();
        result.msg = "OK"
        res.status(200).send(result);    })
    q.catch((err)=>{
        res.status(400).send("Error: "+arr);
    })
});
//////////////////////////////////////////////////////////////
function fixNumSize(num){
    if(num<10 && num>0){
        return "0"+num;
    }
    return num;
}
