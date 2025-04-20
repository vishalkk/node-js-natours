const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

// Email class to send emails
// This class is used to send emails using nodemailer and pug templates
//  It takes user and url as parameters
// It uses pug templates to generate the email content
// It uses html-to-text to convert html to text
// It uses nodemailer to send the email
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Vishal Kajale <${process.env.EMAIL_FROM}>`;
  }
  // Send the actual email
  newTransport() {
    // If the environment is production, use sendgrid
    // If the environment is development, use nodemailer
    // If the environment is test, use nodemailer
    if(process.env.NODE_ENV === 'production') {
    //send grid
      // return nodemailer.createTransport({
      //   service: 'SendGrid',
      //   auth: {
      //     user: process.env.SENDGRID_USERNAME,
      //     pass: process.env.SENDGRID_PASSWORD
      //   }
      // });
      return 1;
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Send the email
  async send(template, subject) {
    //1. Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });
    //2. Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html)
    };
    //3. Create a transport and send email
    await this.newTransport().sendMail(mailOptions);


  }
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

