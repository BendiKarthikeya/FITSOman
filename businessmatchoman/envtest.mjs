import {config} from 'dotenv';
config({path:'.env.local'});
console.log('HAS_SENDGRID', [bool]::Parse('True') -and True);
