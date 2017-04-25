var express    = require('express');
var path       = require('path');
var logger     = require('morgan');
var bodyParser = require('body-parser');
var neo4j      = require('neo4j-driver').v1;

var app = express();

//View engine
app.set('views',path.join(__dirname,'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname,'public')));

var driver = neo4j.driver('bolt://localhost',
    neo4j.auth.basic('neo4j','osboxes.org'));
var session = driver.session();

app.get('/',function(req,res) {
  session
    .run('MATCH(n:Movie) RETURN n LIMIT 40')
    .then(function(result) {
      var movieArr = [];
      result.records.forEach(function(record) {
        movieArr.push({
          id: record._fields[0].identity.low,
          title: record._fields[0].properties.title,
          year: record._fields[0].properties.released
        });
      });

      session
        .run('MATCH (n:Person) RETURN n LIMIT 25')
        .then(function(result2){
           var personArr = [];
           result2.records.forEach(function(record) {
             personArr.push({
               id: record._fields[0].identity.low,
               name: record._fields[0].properties.name
             });
           });

           res.render('index', {
             movies: movieArr,
             persons: personArr
           });
        })
        .catch(function(err) {
          console.log(err);
        });

    })
    .catch(function(err) {
       console.log(err);
    });
});

app.get('/movie/:id',function(req,res) {
    var movieid = req.params.id;
    console.log("Movie ID: " + movieid);
    session
        .run('MATCH(n:Movie) where ID(n)={idParam} RETURN n',{idParam:movieid})
        .then(function(result) {
            console.log("finished search");
            console.dir(result[0]);
            var record = result[0];
            var movie = {
                id: record._fields[0].identity.low,
                title: record._fields[0].properties.title,
                year: record._fields[0].properties.released
            };
            res.render('movie', {
                movie: movie
            });
        });
});

app.post('/movie/add',function(req,res) {
  var title = req.body.title;
  var year = req.body.year;
  session
    .run('CREATE (n:Movie {title:{titleParam},released:{yearParam}}) RETURN n.title', {titleParam:title,yearParam:year})
    .then(function(result) {
      res.redirect('/');
      session.close();
    })
    .catch(function(err) {
      console.log(err)
    });
});

app.post('/movie/actor/add',function(req,res) {
  var title = req.body.title;
  var name = req.body.name;
  session
    .run('MATCH (p:Person {name:{nameParam}}),(m:Movie{title:{titleParam}}) MERGE (p)-[:ACTS_IN]-(m) RETURN p,m', {titleParam:title,nameParam:name})
    .then(function(result) {
      res.redirect('/');
      session.close();
    })
    .catch(function(err) {
      console.log(err)
    });
});


app.post('/person/add',function(req,res) {
  var name = req.body.name;
  session
    .run('CREATE (n:Person {name:{nameParam}}) RETURN n.name', {nameParam:name})
    .then(function(result) {
      res.redirect('/');
      session.close();
    })
    .catch(function(err) {
      console.log(err)
    });
});

app.listen(3000);
console.log('Server Started on Port 3000');

module.exports = app;
