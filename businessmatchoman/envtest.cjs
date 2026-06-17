const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({path:'.env.local'});
console.log('HAS', !!process.env.SENDGRID_API_KEY, process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.slice(0,3));
