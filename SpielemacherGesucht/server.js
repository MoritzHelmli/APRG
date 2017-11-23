//INITIALISIEREN: EXPRESSJS
const express = require('express');
const app = express();

//INITIALISIEREN: BODYPARSER
const bodyParser = require ('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

//INITIALISIEREN: EJS
app.engine('.ejs', require('ejs').__express);
app.set('view engine', 'ejs');

//SERVER ANWERFEN
const port = 3000;
app.listen(port, function(){
    console.log('listening on port ' + port);
})

//SESSION
const session = require('express-session');
app.use(session({
    secret: 'example',
    resave: false,
    saveUninitialized: true
}));

//TINGODB
//falls tingodb-Ordner noch nicht vorhanden, anlegen
require('fs').mkdir(__dirname+'/tingodb', (err)=>{});
//TINGODB initialisieren users: Collection für die Benutzer, entries: Collection für die Einträge
const DB_COLL_USERS = "users";
const DB_COLL_ENTRIES = "entries";

const Db = require('tingodb')().Db;
const db = new Db(__dirname + '/tingodb', {});
const ObjectID = require('tingodb')().ObjectID;


//RENDER: LOGIN
app.get('/login', (request, response) => {
    response.render('login');
})

//RENDER: NOTLOGGEDIN
app.get('/', function(request, response){
	response.render('index', {'message': 'Bitte anmelden.'});
});

//Login-Form
app.post('/onLogin', function(request, response){
    //Eingabe: User + PW holen
    const username = request.body['user'];
    const password = request.body['password'];
    //Passwort-Abfrage, Admin-Konto: "adm", PW: 123, da nicht in der DB, wird 
    if(username == 'adm' && password == '123'){
            console.log('Anmeldung erfolgreich.');
            request.session['authenticated']= true;
            request.session['user']= username;
            request.session['_id']= "ADMIN";
            response.redirect('/content');
    }
    else {
        //USER-DB nach dem User durchsuchen
        db.collection(DB_COLL_USERS).findOne({'email':username}, (err, result) => {
            if(err) {
                response.render('index', {'message':'Anmeldung nicht erfolgreich!'});
                return console.log(err);
            }
            if(password == result.pwd){
                console.log('Anmeldung erfolgreich.');
                request.session['authenticated']=true;
                request.session['user']=result;
                request.session['_id']=result._id;
                response.redirect('/content');
            } else {  
                response.render('index', {'message':'Anmeldung nicht erfolgreich!'});
            }
        });
    }
});

//RENDER: CONTENT
app.get('/content', function(request, response){
	if (request.session['authenticated'] == true){
		response.render('content', {'user': request.session['user']});
	}
	else{
		response.redirect('/');
	}
});

//PROFIL-PAGE
app.get('/profiles/:id', (request, response) => {
    const id = request.params.id;
    const o_id = new ObjectID(id);

    db.collection(DB_COLL_USERS).findOne({'_id': o_id}, (error, foundUser) => {
        if(err){console.log(err);}
        response.render('/profile', {'user': foundUser});
    });
});


//ADMIN-PAGE
app.get('/administer', function(request, response){
    if (request.session['authenticated'] == true && request.session['user'] == 'adm'){
        db.collection(DB_COLL_USERS).find().toArray(function (err, result) {
            if (err) return console.log(err);
            response.render('enter_user',{'usersDb': result});
        });
    }
    else {
        response.render('index', {'message':'Zugriff verweigert!'});
    }
});

//POST: User hinzufügen
app.post('/enternewusers', function(request, response){
    const newPrename = request.body['firstname'];
    const newSurname = request.body['lastname'];
    const newUpassword = request.body['password'];
    const newUemail = request.body['email'];
	//für Absicherung 
    if(newUemail === "" || newUpassword === ""){ 
        console.log("error!");
    }
	else{
		db.collection(DB_COLL_USERS).findOne({'email': newUemail}, (err, result) => {
            if(result === null){
				const document = {
				'avatar':"https://image.shutterstock.com/z/stock-vector-male-avatar-profile-picture-vector-illustration-eps-221431012.jpg",
				'firstname': newPrename,
				'lastname': newSurname,
				'pwd': newUpassword,
				'email': newUemail,
				'description':''
				}
				db.collection(DB_COLL_USERS).save(document, function(err, result){
					if (err) return console.log(err);    
					console.log('saved to DB'); 
				});
			}	
			else{
				console.log ("Diese E-Mail wird bereits verwendet!");
			}
		
			db.collection(DB_COLL_USERS).find().toArray(function (err, result) {
				if (err) return console.log(err);
				response.render('enter_user',{'usersDb': result});
			});
		});
	}
});

//User aus der Liste entfernen
app.post('/delete/:id', (request, response) => {
    const id = request.params.id;
    const o_id = new ObjectID(id);

    db.collection(DB_COLL_USERS).remove({'_id': o_id}, (error, result) => {
        response.redirect('/administer');
    });
});

//User-PW auf "000" zurücksetzen
app.post('/reset/:id', (request, response) => {
    const id = request.params.id;
    const o_id = new ObjectID(id);

    db.collection(DB_COLL_USERS).findOne({'_id': o_id},(error, result) =>{
        
        result.pwd= "000";

        db.collection(DB_COLL_USERS).save(result, function(err, result){
            if (err) return console.log(err);    
            console.log('saved to DB');    
        });
    });
    response.redirect('/administer');
});

//LOGOUT
app.get('/logout', function(request, response){
	delete request.session['authenticated'];
	response.redirect('/');
});
