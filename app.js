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


// get data
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

// add data
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
    .run('MATCH (p:Person {name:{nameParam}}),(m:Movie{title:{titleParam}}) MERGE (p)-[:ACTED_IN]-(m) RETURN p,m', {titleParam:title,nameParam:name})
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


// delete
app.post('/person/delete', function(req,res){
var name = req.body.name;
  session
    .run('DELETE (n:Person {name:{nameParam}}) RETURN n.namematch (n:Person {name:{nameParam}}) detach delete n', {nameParam:name})
    .then(function(result) {
      res.redirect('/');
      session.close();
    })
    .catch(function(err) {
      console.log(err)
    });
});

app.post('/movie/delete',function(req,res) {
  var title = req.body.title;
  var year = req.body.year;
  session
    .run('DELETE (n:Movie {title:{titleParam},released:{yearParam}}) detach delete n', {titleParam:title,yearParam:year})
    .then(function(result) {
      res.redirect('/');
      session.close();
    })
    .catch(function(err) {
      console.log(err)
    });
});

app.post('/movie/actor/delete',function(req,res) {
  var title = req.body.title;
  var name = req.body.name;
  session
    .run('MATCH (:Person {name:{nameParam}})-[a:ACTED_IN]-(:Movie{title:{titleParam}}) detach delete a', {titleParam:title,nameParam:name})
    .then(function(result) {
      res.redirect('/');
      session.close();
    })
    .catch(function(err) {
      console.log(err)
    });
});

app.post('/movie/director/delete',function(req,res) {
  var title = req.body.title;
  var name = req.body.name;
  session
    .run('MATCH (:Person {name:{nameParam}})-[a:DIRECTED]-(:Movie{title:{titleParam}}) detach delete a', {titleParam:title,nameParam:name})
    .then(function(result) {
      res.redirect('/');
      session.close();
    })
    .catch(function(err) {
      console.log(err)
    });
});

// update stuff
app.post('/movie/update',function(req,res) {
  var title = req.body.title;
  session
    .run('MATCH (m:Movie{title:{titleParam}}) set m.title = {titleParam}', {titleParam:title})
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
