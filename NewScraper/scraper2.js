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

//I chose to use bluebird to promisify requests.
//This prevents us from having to use nested callbacks so the timing works correctly between request and doing something with the data returned.
var Promise = require('bluebird');

var fs = require('fs');


//I used the json2csv npm package because it was easy to implement into my code,
//This module also has frequent updates and heavy download activity.
//This is the most elegant package to download for simple translation of json objects to a CSV file format.
var json2csv = require('json2csv');

//home url variable
var homeURL = "http://www.shirts4mike.com/";

//array to hold shirt links 
var ShirtLinks = [];
//array to hold shirt data
var shirtData = [];
//Array to hold links that have been scraped 
var LinksSeen = [];

//create a function to promisify our requests and return the body
function requestPromise(shirtUrl) {
  return new Promise(function (resolve, reject) {
    //if shirtUrl is provided request shirtUrl added to the homeURL
    if (shirtUrl !== undefined) {
      request(homeURL + shirtUrl, function (error, response, body) {
          if (error) {
            console.log("There was an error scraping " + homeURL + shirtUrl + " the site may be down or you may need to check your connection.");
            return reject(error);
            
        }
        //on resolve object
          resolve({body: body, url: shirtUrl});
          return (body);


      }); //end request homeURL + shirtUrl
    //otherwise just request the homeURL
    } else {
      request(homeURL, function (error, response, body) {
          if (error) {
          console.log("There was an error scraping " + homeURL + " the site may be down or you may need to check your connection.");
          return reject(error); 
          
         }
         //on resolve object
          resolve({body: body, url: homeURL});
          return body;


      });
    } //end else

  });

}  //end request promise


//create function to find shirt links and disperse into arrays for comparing data.
function findShirtLinks(results) {
  var $ = cheerio.load(results.body);
  //emtpy/create links array we will use to make promises out of,
  var Links = [];
  //iterate over any link that contains the word shirt in it
  $("a[href*=shirt]").each(function() {
      //push the links to an array that we need to request.
      console.log($(this).attr("href"));
      //push each link we find into links seen array, so when we loop later it wont re-add those we've seen


      //check if that shirt link is a duplicate and that it has not been scraped by the program once before, if it hasnt 
      //add it to the links we will make a promise out of and add it to the links seen array.
      if ((Links.indexOf($(this).attr("href")) === -1) && (LinksSeen.indexOf($(this).attr("href")) === -1)) {
        Links.push($(this).attr("href"));
      }
      //add links to links seen for later testing purposes.
      if (LinksSeen.indexOf($(this).attr("href")) === -1) {
      LinksSeen.push($(this).attr("href"));
      console.log("These have been seen: " + LinksSeen);
    }
      //loop through all the links we grab and make them into promises
    }); //end "a[href*=shirt].each"
  //create promises out of the Links array and push them into the ShirtLinks array.
  for (var i = 0; i < Links.length; i++) {
      ShirtLinks.push(requestPromise(Links[i]));
    }


} //end findShirtLinks


//main function that is the guts of our program.
function scraper() {
  //check if the data folder exists in our directory, if it doesnt make the folder.
  if (!DataFolderExists('data')) {
    fs.mkdir('data');
  }
  //scrape the home page to get the first level of data
  requestPromise().then(function (results) {
  //get the shirt links and push them into an array
  console.log("these are the first results body! :" + results.body);
  //find the shirt links from our first scrape of the homepage.
  findShirtLinks(results);
  //scrape shirtLinks we found from the homepage, pass it into the loop that runs until no more shirts are recognized.
  scrapeShirts(ShirtLinks);

//find the shirt links, push them into the shirts link array.
    });
  

}


//function to scrape shirt links and promise all promises.
function scrapeShirts(array) {

  //array to promise all links passed in before doing things with results
  var promiseArray = array;

  //variable for shirt data we will use later with json2csv.
  

//promise all promises in the array and then do stuff with the data.
  Promise.all(promiseArray).then(function (arrayOfHtmlResults) {
    console.log("these are the results!!!*** : " + arrayOfHtmlResults);
    //empty the shirt links array
    ShirtLinks = [];
    //clear the promise array after every pass 
    promiseArray = [];
    
    //now go through each page we have found 
    for(var i = 0; i < arrayOfHtmlResults.length; i++) {

      //check if each result is a shirt
      isShirt(arrayOfHtmlResults[i]);
      //check if each result is not a shirt, if it isn't it gets put back into the findShirtLinks function
      isNotAShirt(arrayOfHtmlResults[i]);

          
    } //end for 
    //refill our promise array with any new shirt links found during the scrape.
          promiseArray = ShirtLinks;
          
  //check if the promise array is empty, if it isn't call scrape shirts on the new promiseArray, otherwise write all the data we gathered.
        if (((promiseArray).length) !== 0) {
          scrapeShirts(promiseArray);
        } else {
          FileWrite(shirtData);
        }


  }); //end promise.all


}  //end scrapeShirts


//function to format data of any shirts we land on.
function formatData(data) {
  var $ = cheerio.load(data.body);
  
              var time = new Date();
              //json array for json2csv
                var ShirtProps = {
                      Title: $('title').html(),
                      Price: $('.price').html(),
                      ImageURL: $('img').attr('src'),
                      URL: homeURL + data.url,
                      Time: time.toString()
          } 
    //push the shirt props we found into our data array for filewriting
    shirtData.push(ShirtProps);
   
    
}  //end formatData


//create a function that checks if the data is not a shirt.
function isNotAShirt(html) {
  //load the body property of the requestPromise object passed in.
  var $ = cheerio.load(html.body);
  if(($('input[value="Add to Cart"]').length) == 0) {
      console.log("These dont have the cart: " + html.body);
      //if its not pass it back into the findShirtsLink function to refill the Shirts array.
      findShirtLinks(html);
      console.log("isNotAShirt ShirtLinks: " + ShirtLinks);
  } //end input value "Add to Cart"

} //end is not a shirt



// create a function that checks if we are on the actual shirt itself or another page of shirts.
function isShirt(html) {
  //load the body property of the requestPromise object passed in.
  var $ = cheerio.load(html.body);
  if(($('input[value="Add to Cart"]').length) !== 0) {
    console.log("These have the cart: " + html.body);
    formatData(html);

          
  } //end if input value "Add to Cart"

} //end isShirt



//function to write shirtData
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

  //write the file
  fs.writeFile('./data/' + output + '.csv', csv, function (error) {
          if (error) throw error;
          
          
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



//run the program.
scraper();