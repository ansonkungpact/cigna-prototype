var cNlcModule = function() {
    const USE_LUIS_PREVIEW_MODE = false;
    const translate = require('google-translate-api');

    var that = {};
    
    var request = require('request');
    var fs     = require('fs');
    var sleep = require('sleep');
    var moment = require('moment');
    var qs = require('querystring');
    
    var classNumber = 12;
    var correctClasss = new Array(classNumber);
    var wrongCLass = new Array(classNumber);
    var classmap = new Array(classNumber);
    var classNoCounter = 0;
    var classnames = {};

    var nlcQueue = [];

    this.interval = null;

    var luisURL = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/";

    // MS Cognitive Service
    var luisID = '20f886a5-cd24-43b7-b145-8c5ef6401261';
    if (process.env.MS_LUIS_ID) {
      // console.log("using env.MS_LUIS_ID");
      luisID = process.env.MS_LUIS_ID;
    }

    var phraselistId = '22656';
    if (process.env.MS_PHRASE_LIST_ID) {
      // console.log("using env.MS_PHRASE_LIST_ID");
      phraselistId = process.env.MS_PHRASE_LIST_ID;
    }

    var subscriptionkey = '2ae235d8af814771ad5c5653ce46ab93';
    var isLog = false;
    var moduleName = 'NLC_MODULE';

    that.nlc = function(q, successCallback, failureCallback) {
      
      requestNlc(q, successCallback, failureCallback);
    }

    var requestNlc = function(q,successCallback, failureCallback){
        // console.log(q);
        q = qs.escape(q);
        var url = luisURL+luisID+'?subscription-key='+subscriptionkey+'&verbose=true&q=';
        console.log('translating.......');
        console.log(decodeURIComponent(q));
        translate(decodeURIComponent(q), {to: 'en'}).then(res => {
            // console.log(res);
            console.log(res.text.toLowerCase());
            console.log('testing again');
            q = res.text;
            url = url + res.text.toLowerCase();
            console.log(url);
        
            var opt = {
             url:url,
             method:'GET',
            }

            request(opt, function (err, response, body) {
              try {
                var result = JSON.parse(body);
                // console.log(body,moduleName,isLog);
                var topScoringIntent = result["topScoringIntent"];

                if (!USE_LUIS_PREVIEW_MODE) {
                  // production mode
                  var intents = result["intents"];
                  if (intents && Array.isArray(intents) && intents.length > 0) {
                    topScoringIntent = intents[0];
                  }
                }

                if (topScoringIntent && topScoringIntent["intent"]) {
                  var tempResult = {};
                  tempResult["intent"] = topScoringIntent["intent"];
                  tempResult["entities"] = result["entities"];
                  // console.log(tempResult,moduleName,isLog);
                  successCallback(tempResult);
                }
                else if (result.statusCode == 429){
                  failureCallback('429');
                }
                else {
                  failureCallback(result.message);
                }
              } 
              catch (e) {
                // console.log(e);
                failureCallback('429');        
              }
            });
        }).catch(err => {
            console.error(err);
        });
    }

    that.splitDataSets = function(){

      logger.readFileData(fullDataSetPath,function(fileAry){

          var length = fileAry.length;
          var testingLength = parseInt(length*0.2);
          var testingAry = [];
          for (var i = 0; i < testingLength; i++) {

              var ri = Math.floor(Math.random() * fileAry.length);
              testingAry.push(fileAry[ri]);
              fileAry.splice(ri, 1);

          }

          var trainingAry = fileAry;
          // console.log('trainingAry length is:'+trainingAry.length,moduleName,isLog);
          // console.log('testingAry length is:'+testingAry.length,moduleName,isLog);
          //save training and testing to txt
          for (var i = 0; i < trainingAry.length; i++) {
             logger.appendLog(trainingDataFilePath ,trainingAry[i]);
          }

          for (var i = 0; i < testingAry.length; i++) {
            logger.appendLog(testDataFilePath ,testingAry[i]);
          }

      });

    }

    var initClassAry = function(classLength){

      for (var i = 0; i < classLength; i++) {
          correctClasss[i] = 0;
          wrongCLass[i] = 0;
          classmap[i] = new Array(classLength);
          for(var j=0;j < classLength; j++){
             classmap[i][j] = 0;
          }
      }

    }

   

    var classFormatConvert = function(classStr){
        return classStr.toLowerCase().replace(' ','').replace(/(\r\n|\n|\r)/gm,"");
    }

    var getTextPredictAndOriPairIntent = function(array, successCallback, failureCallback) {
      that.nlc(array[0],function(predictClass){
        successCallback(predictClass,array[1]);
      },function(err){
         failureCallback(array[0]+":"+array[1]);
      });
    }


    
  /*UPDATE LOCATION PHRALIST*/
  
  that.getNlcQueue = function() {
    return nlcQueue.length;
  }

  var init = function() {
  }

  init();

  return that;
}

module.exports = new cNlcModule();