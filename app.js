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
            studio: record._fields[0].properties.studio,
            runtime: record._fields[0].properties.runtime,
            description:record._fields[0].properties.description,
            language:record._fields[0].properties.language,
            trailer:record._fields[0].properties.trailer,
            genre:record._fields[0].properties.genre,
            imageUrl: record._fields[0].properties.imageUrl
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
app.get('/movie/:id',function(req,res) {
    var movieid = req.params.id;
    console.log("Movie ID: " + movieid);
    session
        .run('MATCH(n:Movie) where ID(n)=toInteger({idParam}) RETURN n',{idParam:parseInt(movieid)})
        .then(function(result) {
            console.log("finished search");
            //console.log(result['records']);
            var record = result['records'][0];
            var movie = {
                id: record._fields[0].identity.low,
                title: record._fields[0].properties.title,
                studio: record._fields[0].properties.studio,
                runtime: record._fields[0].properties.runtime,
                description:record._fields[0].properties.description,
                language:record._fields[0].properties.language,
                trailer:record._fields[0].properties.trailer,
                genre:record._fields[0].properties.genre,
                imageUrl: record._fields[0].properties.imageUrl

            };
            res.render('movie', {
                movie: movie
            });
        })
        .catch(function(err) {
            console.log(err)
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

app.get('/path/:personOne/:personTwo',function(req,res) {
    var personOne = req.params.personOne;
    var personTwo = req.params.personTwo;
    console.log("Person One: " + personOne);
    console.log("Person Two: " + personTwo);
    session


        .run('MATCH p=shortestPath((p1:Person {name:"' + personOne + '"})-[*]-(p2:Person {name:"' + personTwo + '"}) )RETURN p')
        .then(function (result) {
            var finalArr = [];
            //console.log(result["records"][0]._fields[0].segments);
            var numOfSetps = result["records"][0]._fields[0].segments.length;
            result["records"][0]._fields[0].segments.forEach(function (segment, index, array) {
                //console.log(segment.start.labels);
                if ((segment.start.labels.indexOf("Movie") > -1)) {
                    //console.log(segment.start.properties.title);
                    finalArr.push({
                        type: "Movie",
                        name:segment.start.properties.title
                    });
                } else {
                    //console.log(segment.start.properties.name);
                    finalArr.push({
                        type: "Actor",
                        name:segment.start.properties.name
                    });
                }
                if( index === array.length -1){
                    console.log(segment.end.labels);
                    if ((segment.end.labels.indexOf("Movie") > -1)) {
                       // console.log(segment.end.properties.title);
                        finalArr.push({
                            type: "Movie",
                            name:segment.end.properties.title
                        });
                    } else {
                        //console.log(segment.end.properties.name);
                        finalArr.push({
                            type: "Actor",
                            name:segment.end.properties.name
                        });
                    }
                }
            });
            //console.log(result);
            res.setHeader('Content-Type', 'application/json');
            res.json(finalArr);
        })


        .catch(function (err) {
            console.log(err);
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
app.post('/movie/:id/edit',function(req,res) {
  var movieid = req.params.id;
  var title = req.body.title;
  var studio = req.body.studio;
  var runtime = req.body.runtime;
  var description = req.body.description;
  var language = req.body.language;
  var trailer = req.body.trailer;
  var genre = req.body.genre;
  console.log(movieid + title + studio + runtime);
  session
    .run('MATCH(n:Movie) where ID(n)=toInteger({idParam})'+ 
		'SET n.title={titleParam}'+
		'SET n.studio={studioParam}' +
		'SET n.runtime={runtimeParam}'+
		'SET n.description={descriptionParam}'+
		'SET n.language={languageParam}'+
		'SET n.trailer={trailerParam}'+
		'SET n.genre={genreParam}',
		{
			idParam:movieid,
			titleParam:title,
			studioParam:studio, 
			runtimeParam:runtime,
			descriptionParam:description,
			languageParam:language,
			trailerParam:trailer,
			genreParam:genre
		})
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
