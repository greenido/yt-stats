//
// A script to get YT stats by using puppeteer
// 
// @author @greenido
// @date 7/2019
//
// @see 
// https://github.com/topics/puppeteer 
// http://expressjs.com/en/starter/static-files.html
//
// DB: 
// http://www.sqlitetutorial.net/sqlite-limit/
// https://www.npmjs.com/package/sqlite3
//
const puppeteer = require("puppeteer");
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();

// init project
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

// init sqlite db
var dbFile = './.data/sqlite.db';
var exists = fs.existsSync(dbFile);
var db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function(){
  if (!exists) {
    db.run('CREATE TABLE IF NOT EXISTS `stats` (`id` INTEGER PRIMARY KEY, `total` INTEGER, `comment` VARCHAR(255), `updatedAt` TEXT NOT NULL);');
    console.log('New table *stats* created! 🚀 go and run it another time...');
    exists(0);
  }
  else {
    console.log('🏈 Database "stats" ready to go!');
    db.each('SELECT * from Stats ORDER BY total DESC limit 10;', function(err, row) {
      if ( row ) {
        console.log('🏝 Record:', row);
      }
    });
    
    //
    // Start it 🚦
    //
    run();
  }
});

//
// http://expressjs.com/en/starter/basic-routing.html
//
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

//
// endpoint to get all the stats in the database
// read the sqlite3 module docs and try to add your own! https://www.npmjs.com/package/sqlite3
//
app.get('/getStats', function(request, response) {
  db.all('SELECT * from Stats ORDER BY id DESC limit 10;', function(err, rows) {
    response.send(JSON.stringify(rows));
  });
});


//
// Util to format numbers with commas
//
const numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

//
// The main functionality - open chrome and check for the amount of views
//
async function run() {    
  const browser = await puppeteer.launch({
    headless: true , args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const videoKeys = ["gxSzYmQx8iM", "olVmfDnF1vI", "end"];
  let totalViews = 0;
  for (var key in videoKeys) {
    if (videoKeys[key] == "end") {
      await saveTotal(totalViews);	    
      break;
    }
    try {
      let tmpStrViews = await getViewsPerPage(videoKeys[key]);
      totalViews += parseInt(tmpStrViews);
    } catch(err) {
      console.log("⛑ ERR with page: " + videoKeys[key] + " Error: " + JSON.stringify(err));
    }
  }
   
  //
  //
  //
  async function saveTotal(totalViews) {
    try {
      var ts1 = Math.round((new Date()).getTime() ) + 555;
      var totalViews = "" + totalViews;
      fs.writeFile('./totals.txt', totalViews, (err) => {
        if (err) {
          console.log("ERROR with saving the totals: " + totalViews + " Err: " + JSON.stringify(err));	
        }
        console.log("The totals: " + totalViews + " was succesfully saved!");
      });
      var now = new Date().toISOString();
      if( !isNaN(totalViews)){
        db.run('INSERT INTO stats (id,total,comment,updatedAt) VALUES (?,?,?,?)',  [ts1 , totalViews , "TOTALS" , now ], (dbErr) => {
          if (dbErr) {
            console.log(dbErr.message);
          }
          console.log("🤠 Updated the DB for "+ key);
        });
      }
      else {
        console.log("Got an issue with the totals: " + totalViews + " is not a valid number");
      }   
    }
    catch(err) {
     console.log("ERROR with DB for saving totals" + JSON.stringify(err));
    }
    console.log("time: " + ts1 + " " + totalViews + "\n ** The Total is: " + numberWithCommas(totalViews) + " views");
  }

  //
  //
  //
  async function getViewsPerPage(key) {
    const pageUrl = "https://www.youtube.com/watch?v=" + key;
    console.log("== Start the party on " + pageUrl + "  ==");
    const page = await browser.newPage();
    // await page.goto(pageUrl);  await page.waitFor(1500);
    await page.goto(pageUrl, {
      timeout: 3000000
    });
    await page.waitFor(2500); 
    const VIEWS_SELECTOR = "#count > yt-view-count-renderer > span.view-count.style-scope.yt-view-count-renderer";
    let views = await page.evaluate(sel => {
      let element = document.querySelector(sel);
      console.log("^^ elm " + element + " \n\n");
      return element ? element.innerHTML : null;
    }, VIEWS_SELECTOR);
  
    await page.focus(VIEWS_SELECTOR);
    await page.keyboard.type('k'); // let's play it for 5sec.
    await page.waitFor(5000); 
    views = parseInt(views);
    
    console.log("The views for " +key + " video are: " + views);
    var ts = Math.round((new Date()).getTime() ); 
    var now = new Date().toISOString();
    
    db.run('INSERT INTO stats (id,total,comment,updatedAt) VALUES (?,?,?,?)',  [ts , views , key , now ], (dbErr) => {
      if (dbErr) {
        console.log(dbErr.message);
      }
      console.log("Updated the DB for "+ key);
    });
    return views;
  }
}

//
// start the party - listen for requests 🕌
// 
var listener = app.listen(process.env.PORT, function() {
  console.log('⛰ Your app is listening on port ' + listener.address().port);
});
