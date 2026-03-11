'use strict';

var server = require('server');

/**
 * Test-Show : Simple test endpoint that renders a message
 * @name Test-Show
 * @function
 * @memberof Test
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('Show', function (req, res, next) {
    res.render('test/show', {
        pageTitle: 'Test Page',
        message: 'This is a custom message from the controller!',
        additionalInfo: 'You can customize this message by passing data from the controller.'
    });
    next();
});

module.exports = server.exports();