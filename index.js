var https = require('https');
var querystring = require('querystring');
var AWS = require("aws-sdk");

exports.handler = function (event, context, callback) {
    // Validate the recaptcha
    var input_data = JSON.parse(event.body);
    var postData = querystring.stringify({
        'secret': process.env.ReCaptchaSecret,
        'response': input_data['g-recaptcha-response']
    });

    var options = {
        hostname: 'www.google.com',
        port: 443,
        path: '/recaptcha/api/siteverify',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    var req = https.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            var captchaResponse = JSON.parse(chunk);
            if (captchaResponse.success) {
                var sns = new AWS.SNS();
                delete input_data['g-recaptcha-response'];
                var message = "";
                Object.keys(input_data).forEach(function(key) {
                   message += key+':\n';
                   message += '\t'+input_data[key]+'\n\n';
                });
                var params = {
                    Message: message,
                    Subject: process.env.Subject,
                    TopicArn: process.env.ContactUsSNSTopic
                };
                sns.publish(params, function (err, response) {
                    if (err) {
                        console.error("SNS error: ", JSON.stringify(err));
                        callback(null, {
                            statusCode: '500',
                            headers: {
                                "Access-Control-Allow-Methods" : "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                                "Access-Control-Allow-Headers" : "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                                "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                                "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
                            },
                            body: JSON.stringify({message:'Cannot send email'})
                        });
                        return;
                    }
                    callback(null, {
                        statusCode: '200',
                        headers: {
                            "Access-Control-Allow-Methods" : "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                            "Access-Control-Allow-Headers" : "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                            "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                            "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
                        },
                        body: JSON.stringify(response)
                    });
                });
            } else {
                callback(null, {
                    statusCode: '500',
                    headers: {
                        "Access-Control-Allow-Methods" : "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                        "Access-Control-Allow-Headers" : "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                        "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
                    },
                    body: JSON.stringify({message:'Invalid recaptcha'})
                });
            }
        });
    });

    req.on('error', function(e) {
        callback(null, {
            statusCode: '500',
            headers: {
                "Access-Control-Allow-Methods" : "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Headers" : "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({message:e.message})
        });
    });

    // write data to request body
    req.write(postData);
    req.end();
};
