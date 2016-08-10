'use strict';

//require NPM packages


//I chose to use request to make the http calls because it is very easy to use.
//This npm package also has recent updates, within the last 2 days.
//Lastly it has a huge number of downloads, this means it has a solid reputation in the community
var request = require('request');


//I chose to use cheerio to write the jquery for our node scraper,
//This package is very simple to use, and it was easy to write jQuery I was already familiar with,
//Cheerio also makes it simple for us to work with HTML elements on the server.
//Lastly, Cheerio is popular within the community, with continuous updates and a lot of downloads.
var cheerio = require('cheerio');

var Promise = require('bluebird');

var fs = require('fs');


//I used the json2csv npm package because it was easy to implement into my code,
//This module also has frequent updates and heavy download activity.
//This is the most elegant package to download for simple translation of json objects to a CSV file format.
var json2csv = require('json2csv');

var Promise = require('bluebird');

var homeURL = "http://www.shirts4mike.com/";

//array to hold shirt links 
var ShirtLinks = [];
//array to hold shirt data
var shirtData = [];

//create a function to promisify our requests and return the body
function requestPromise(shirtUrl) {
  return new Promise(function (resolve, reject) {
    if (shirtUrl !== undefined) {
      request(homeURL + shirtUrl, function (error, response, body) {
          if (error) {
            return reject(error);
            console.log("There was an error scraping " + homeURL + shirtUrl + " the site may be down or you may need to check your connection.");
        }

          resolve(body);
          return body;

      });

    } else {
      request(homeURL, function (error, response, body){
          if (error) {
          return reject(error); 
          console.log("There was an error scraping " + homeURL + " the site may be down or you may need to check your connection.");
         }

          resolve(body);
          return body;


      });
    }

  });

}  //end request promise

function findShirtLinks(results) {
  var $ = cheerio.load(results);
  $("a[href*=shirt]").each(function() {
      //push the links to an array that we need to request.
      console.log($(this).attr("href"));
      ShirtLinks.push(requestPromise($(this).attr("href")));
      console.log(ShirtLinks);
    });
}



function scraper() {
  //check if the data folder exists in our directory 
  if (!DataFolderExists('data')) {
    fs.mkdir('data');
  }
  //scrape the home page to get the first level of data
  requestPromise().then(function (results) {
  //get the shirt links and push them into an array
  findShirtLinks(results);
  scrapeShirts(ShirtLinks);

//find the shirt links, push them into the shirts link array.
    });
  

}



function scrapeShirts(array) {

  //array to promise all before doing things with results
  var promiseArray = array;

  //variable for shirt data we will use later with json2csv.
  


  Promise.all(promiseArray).then(function (arrayOfHtmlResults) {
    //empty the shirt links array
    ShirtLinks = [];
    //clear the promise array after every pass 
    promiseArray = [];

    //now go through each page we have found 
    for(var i = 0; i < arrayOfHtmlResults.length; i++) {


      //use cheerio to load the html of each request in the promise array
      var $ = cheerio.load(arrayOfHtmlResults[i]);


      //if the index from our html results array contains the input value add to cart, get the data
      if (isShirt(arrayOfHtmlResults[i])) {

      //format the data and push the returned shirtprops object to the shirt data variable
      formatData(arrayOfHtmlResults[i]);
                
                
                

      //otherwise look for shirt links again on the page and make them into new promises pushing into the ShirtLinks array         
            } else {
              findShirtLinks(arrayOfHtmlResults[i]);
            }
      //after it looks again, fill the promise array with the links that got injected again.
          
    } //end for 
          promiseArray = ShirtLinks;
          console.log("This is the promiseArray: " + i + promiseArray);
          
  //check if the promise array is empty, if it isn't call scrape shirts on the new promiseArray, otherwise write all the data we gathered.
        if (((promiseArray).length) !== 0) {
          scrapeShirts(promiseArray);
        } else {
          FileWrite(shirtData);
        }


  });


}  //end scrapeShirts


function formatData(data) {
  var $ = cheerio.load(data);
  var ShirtURL = $(data).find('a').attr('href');
              var time = new Date();
              //json array for json2csv
                var ShirtProps = {
                      Title: $('title').html(),
                      Price: $('.price').html(),
                      ImageURL: $('img').attr('src'),
                      URL: homeURL + ShirtURL,
                      Time: time.toString()
          } 
    console.log("these are shirt props: " + ShirtProps.Title);
    shirtData.push(ShirtProps);
   
    
}  //end formatData



// create a function that checks if we are on the actual shirt itself or another page of shirts.
function isShirt(html) {
  var $ = cheerio.load(html);
  if(($('input[value="Add to Cart"]').length) !== 0) {
    console.log(html);
    return true;

          
  } //end if 

} //end isShirt




function FileWrite(shirtData) {
  //fields variable holds the column headers
  var fields = ['Title', 'Price', 'ImageURL', 'URL', 'Time'];
  //CSV variable for injecting the fields and object into the converter.
  var csv = json2csv({data: shirtData, fields: fields}); 
  console.log(csv);

  //creating a simple date snagger for writing the file with date in the file name.
  var d = new Date();
  var month = d.getMonth()+1;
  var day = d.getDate();
  var output = d.getFullYear() + '-' +
  ((''+month).length<2 ? '0' : '') + month + '-' +
  ((''+day).length<2 ? '0' : '') + day;

  fs.writeFile('./data/' + output + '.csv', csv, function (error) {
          if (error) throw error;
          console.error('There was an error writing the CSV file.');
          
    });

} //end FileWrite 





//Check if data folder exists, source: http://stackoverflow.com/questions/4482686/check-synchronously-if-file-directory-exists-in-node-js
function DataFolderExists(folder) {
  try {
    // Query the entry
    var DataFolder = fs.lstatSync(folder);

    // Is it a directory?
    if (DataFolder.isDirectory()) {
        return true;
    } else {
        return false;
    }
} //end try
catch (error) {
    console.error(error.message);
    console.error('There was an error checking if the folder exists.');
}

}  //end DataFolderExists




scraper();