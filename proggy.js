var c = db.tweets_aapl.find({Nickname:/e/},{_id:0,Nickname:1});
while (c.hasNext()) {printjson(c.next())};
